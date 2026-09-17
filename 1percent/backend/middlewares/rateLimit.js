/**
 * middlewares/rateLimit.js
 *
 * PURPOSE:
 *   In-process sliding-window rate limiters (apiLimiter, authLimiter, submitLimiter, …). No Redis:
 *   the design point is a single Node process, so the limiter state lives in memory with periodic
 *   cleanup.
 *
 * EXPORTS: rateLimit, authRateLimit
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

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
    // Feed the security monitor: sustained 429 storms are an abuse signal.
    // Fire-and-forget so the limiter's hot path stays fast.
    try {
      const securityService = require('../services/securityService');
      securityService.recordRateLimitAbuse(req).catch(() => {});
    } catch { /* monitor unavailable — rate limiting still applies */ }
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
