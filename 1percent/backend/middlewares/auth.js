/* ============================================================
   Auth Middleware
   ============================================================
   Verifies the Supabase JWT from the Authorization header.
   Attaches the authenticated user to req.user.
   ============================================================ */

const { adminClient } = require('../config/database');

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
    const { data: { user }, error } = await adminClient.auth.getUser(token);

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
    const { data: { user } } = await adminClient.auth.getUser(token);
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
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

module.exports = { authenticate, optionalAuth, requireRole };
