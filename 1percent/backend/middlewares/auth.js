/**
 * middlewares/auth.js
 *
 * PURPOSE:
 *   Authentication middleware. Verifies the Supabase JWT from the Authorization header/cookie,
 *   attaches req.user, and provides requireAuth / requireAdmin guards. requireAdmin re-checks
 *   profiles.role from the database (not from the token claims) so demoted accounts lose access
 *   immediately.
 *
 * EXPORTS: authenticate, optionalAuth, requireRole, requireAdmin
 * DEPENDENCIES: jose
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient } = require('../config/database');
const crypto = require('crypto');

/* ── Token verification cache ─────────────────────────────
   authenticate() used to call Supabase Auth on EVERY request. On a busy day
   that hits Supabase's rate limits, and the error was reported to users as
   "session expired" (logging them out). Verified tokens are now cached for 30s,
   and upstream/transient failures return 503 instead of a fake 401. */
const TOKEN_CACHE_TTL_MS = 30 * 1000;
const tokenCache = new Map(); // sha256(token) -> { user, at }

async function getUserCached(token) {
  const key = crypto.createHash('sha256').update(token).digest('hex');
  const hit = tokenCache.get(key);
  if (hit && Date.now() - hit.at < TOKEN_CACHE_TTL_MS) return { user: hit.user, error: null };

  try {
    const { data, error } = await Promise.race([
      adminClient.auth.getUser(token),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Token verification timed out')), 8000))
    ]);
    if (error || !data?.user) {
      const s = error?.status;
      const transient = s === 429 || s >= 500 || error?.name === 'AuthRetryableFetchError';
      return { user: null, error: error || new Error('No user'), transient };
    }
    tokenCache.set(key, { user: data.user, at: Date.now() });
    if (tokenCache.size > 5000) {
      const cutoff = Date.now() - TOKEN_CACHE_TTL_MS;
      for (const [k, v] of tokenCache) if (v.at < cutoff) tokenCache.delete(k);
      if (tokenCache.size > 5000) tokenCache.clear();
    }
    return { user: data.user, error: null };
  } catch (err) {
    // network failure / timeout talking to Supabase: not the user's fault
    return { user: null, error: err, transient: true };
  }
}

/* One JWKS fetcher for the whole process (was re-created on every optionalAuth call). */
let _jwks = null;
function getJwks() {
  if (!_jwks) {
    const { createRemoteJWKSet } = require('jose');
    _jwks = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return _jwks;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { user, error, transient } = await getUserCached(token);

    if (transient) {
      res.setHeader('Retry-After', '2');
      return res.status(503).json({
        error: 'Auth service busy',
        message: 'Please try again in a moment.'
      });
    }

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Your session has expired. Please log in again.'
      });
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    return res.status(500).json({
      error: 'Auth error',
      message: 'Failed to verify authentication.'
    });
  }
}

/* ============================================================
   Optional Auth — attaches user if token exists, continues if not
   ============================================================ */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT signature locally against Supabase's JWKS.
    // (adminClient.auth.getUser() rejects tokens created via the
    // service-role admin API, which the persistent-session flow uses.)
    const { jwtVerify } = require('jose');
    const { payload } = await jwtVerify(token, getJwks());
    req.user = payload?.sub ? { id: payload.sub, email: payload.email || null } : null;
  } catch {
    req.user = null;
  }

  next();
}

/* ============================================================
   Require Admin — must be used after authenticate
   Blocks anyone who is not an admin (mentors, students, etc.)
   ============================================================ */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Could not verify role' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Admin access required.'
      });
    }

    req.profile = profile;
    next();
  } catch (err) {
    console.error('[AUTH] requireAdmin failed:', err.message);
    return res.status(500).json({ error: 'Failed to verify role.' });
  }
}

/* ============================================================
   Require Role — must be used after authenticate
   ============================================================ */
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Could not verify role' });
    }

    if (!roles.includes(profile.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of: ${roles.join(', ')}`
      });
    }

    req.profile = profile;
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole, requireAdmin, getUserCached };
