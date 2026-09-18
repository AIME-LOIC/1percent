/**
 * middlewares/rateLimit.js
 *
 * PURPOSE:
 *   In-process rate limiters. No Redis: the design point is a single Node process,
 *   so limiter state lives in memory with periodic cleanup.
 *
 *   Design notes (v3 — fixes "2 logins → too many attempts"):
 *   • Only REAL brute-force signals count: 401 (wrong password).
 *     Successful logins/signups NEVER burn the budget. 429 from an UPSTREAM
 *     service (e.g. Supabase email quota) is a SERVER fault — the client
 *     must not pay for it, and it must not feed the abuse-strike system.
 *     (Clients hammering an already-throttled limiter are handled at the
 *     rejection site via reportAbuse, so no finish-hook counting needed.)
 *   • Credential endpoints (login/signup) key the bucket on IP + EMAIL, so one
 *     student's typos can't lock out everyone behind a school NAT IP, and an
 *     attacker can't lock out a victim by spamming their email either (the IP
 *     part still catches them).
 *   • Per-action buckets (login / signup / refresh / magic-link…) instead of one
 *     shared pool — signing up no longer eats the login budget.
 *   • Small in-memory hard ceiling per IP as a backstop against pure floods.
 *
 * EXPORTS: rateLimit, authRateLimit, createLimiter
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const windowMs = 15 * 60 * 1000; // 15 minutes

const hits = new Map();

function sweep() {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start > windowMs) hits.delete(key);
  }
}
setInterval(sweep, 60_000).unref?.();
sweep();

function clientKey(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/** Feed the security monitor — fire-and-forget, never throws. */
function reportAbuse(req) {
  try {
    const securityService = require('../services/securityService');
    securityService.recordRateLimitAbuse(req).catch(() => {});
  } catch { /* monitor unavailable — rate limiting still applies */ }
}

/**
 * Limiter factory.
 * @param {object}  opts
 * @param {number}  [opts.windowMs]        sliding window length
 * @param {number}  opts.max               max counted requests per window
 * @param {string}  opts.prefix            bucket namespace
 * @param {'all'|'failures'} [opts.countMode] 'failures' = only 401/429/5xx responses count
 * @param {'ip'|'ip+email'}  [opts.keyMode]  'ip+email' = per-IP-per-account buckets
 * @param {Function} [opts.keyFrom]         extra key material (falls back to ip+email)
 */
function createLimiter({ windowMs: win = windowMs, max = 100, prefix = 'api', countMode = 'all', keyMode = 'ip', keyFrom } = {}) {
  return function limiter(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // never throttle CORS preflights

    const ident = keyFrom
      ? keyFrom(req)
      : (keyMode === 'ip+email'
        ? `${clientKey(req)}|${String(req.body?.email || '').trim().toLowerCase()}`
        : clientKey(req));
    const key = `${prefix}:${ident}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start > win) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));

    if (entry.count >= max) {
      reportAbuse(req);
      res.setHeader('Retry-After', Math.max(1, Math.ceil((win - (now - entry.start)) / 1000)));
      return res.status(429).json({
        error: 'Too many attempts. Please wait a few minutes and try again.',
        retry_after: Math.max(1, Math.ceil((win - (now - entry.start)) / 1000))
      });
    }      if (countMode === 'failures') {
      // Count ONLY true brute-force signals, after the handler answered:
      // 401 (wrong credentials). Everything else is either a user CORRECTION
      // (4xx validation), a SERVER fault (5xx, upstream 429 like Supabase's
      // email quota) or traffic shaping — none of it may burn the user's
      // budget or cascade into a WAF strike.
      res.on('finish', () => {
        const s = res.statusCode;
        if (s !== 401) return;
        const t = Date.now();
        const e = hits.get(key);
        if (!e || t - e.start > win) hits.set(key, { start: t, count: 1 });
        else e.count++;
      });
    } else {
      entry.count++;
    }

    next();
  };
}

/** General API ceiling — generous; normal usage never touches it. */
const rateLimit = createLimiter({ max: 600, prefix: 'api', countMode: 'all' });

/* Per-action auth limits — failures only */
const AUTH_LIMITS = {
  login: 15,
  signup: 10,
  refresh: 40,
  'reset-password': 6,
  'magic-link': 6,
  'resend-confirmation': 4
};

function authRateLimit(req, res, next) {
  // Inside a mounted router req.path is RELATIVE ('/login', not '/api/auth/login'),
  // and lab/parent-payment mounts it on paths with no action segment at all.
  // Use the originalUrl and strip the mount prefix + query so the action is the
  // real last segment ('login', 'signup', 'run', '<token>' …).
  const clean = String(req.originalUrl || req.url || '').split('?')[0]
    .replace(/^\/api\/(auth|lab|parent-payments)\//, '');
  const action = (clean.split('/').filter(Boolean).pop() || 'other');
  const max = AUTH_LIMITS[action] ?? 12;
  const credential = (action === 'login' || action === 'signup');
  return createLimiter({
    max,
    prefix: `auth:${action}`,
    countMode: 'failures',
    keyMode: credential ? 'ip+email' : 'ip'
  })(req, res, next);
}

module.exports = { rateLimit, authRateLimit, createLimiter };
