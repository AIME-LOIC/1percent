/* ============================================================
   Rate Limiting Middleware
   ============================================================
   Simple in-memory rate limiter. For production, consider
   using Redis-backed rate limiting (e.g., express-rate-limit).
   ============================================================ */

const windowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = 100; // per window

const hits = new Map();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start > windowMs) {
      hits.delete(key);
    }
  }
}, 60_000);

function rateLimit(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
    return next();
  }

  entry.count++;

  if (entry.count > maxRequests) {
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('Retry-After', Math.ceil((windowMs - (now - entry.start)) / 1000));
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later.'
    });
  }

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
  next();
}

/* Stricter rate limit for auth endpoints */
function authRateLimit(req, res, next) {
  const key = `auth:${req.ip || 'unknown'}`;
  const now = Date.now();
  const entry = hits.get(key);
  const authMax = 10; // 10 attempts per 15 min

  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    return next();
  }

  entry.count++;

  if (entry.count > authMax) {
    res.setHeader('Retry-After', Math.ceil((windowMs - (now - entry.start)) / 1000));
    return res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please wait before trying again.'
    });
  }

  next();
}

module.exports = { rateLimit, authRateLimit };
