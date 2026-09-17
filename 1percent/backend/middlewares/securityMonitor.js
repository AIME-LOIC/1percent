/**
 * middlewares/securityMonitor.js
 *
 * PURPOSE:
 *   The WAF. Inspects every incoming payload for XSS/SQLi/path-traversal/command-injection patterns,
 *   records security_events with HMAC-hashed IPs (never raw), escalates repeat offenders through a
 *   strike system (5 strikes → block 1h → 6h → 24h written to ip_blocklist), and rejects Host-header
 *   spoofing.
 *
 * EXPORTS: securityMonitor, securityBodyScan, sendBlockResponse
 * DEPENDENCIES: path, fs
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const path = require('path');
const logService = require('../services/logService');
const securityService = require('../services/securityService');

const frontendDir = path.join(__dirname, '..', '..', 'frontend');

/* Cached at module load; the file is tiny and static. */
let hackHtmlCache = null;
function hackHtml() {
  if (hackHtmlCache === null) {
    try {
      hackHtmlCache = require('fs').readFileSync(path.join(frontendDir, 'hack.html'), 'utf8');
    } catch {
      hackHtmlCache = null;
    }
  }
  return hackHtmlCache;
}

/* Requests that must never be intercepted (health probes, the block
   page itself, static assets). */
function isExempt(req) {
  const p = req.path;
  return (
    p === '/hack.html' ||
    p === '/api/health' ||
    p.startsWith('/assets/') ||
    p.startsWith('/css/') ||
    p.startsWith('/js/') ||
    p.startsWith('/img/') ||
    p === '/favicon.ico' ||
    p === '/favicon.svg'
  );
}

function sendBlockResponse(req, res) {
  const wantsJson =
    !req.accepts('html') ||
    req.path.startsWith('/api/') ||
    req.path.startsWith('/mcp/');
  if (wantsJson) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your request was blocked by our security system. If you believe this is a mistake, contact support.'
    });
  }
  const html = hackHtml();
  if (html) {
    res.status(403).type('html').setHeader('Cache-Control', 'no-store').send(html);
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
}

async function securityMonitor(req, res, next) {
  try {
    if (isExempt(req)) return next();

    const ip = logService.clientIp(req);
    const ipHash = logService.hashIp(ip);

    if (securityService.isWhitelisted(ipHash)) return next();

    // 1. Blocklist check (memory-cached, ~0 cost on the hot path)
    if (await securityService.isBlocked(ipHash)) {
      // Log the blocked attempt too — blocked attackers still probe.
      securityService.recordAttack(req, {
        event_type: 'blocked_probe',
        severity: 'low',
        rule: 'ip_blocklisted'
      }).catch(() => {});
      return sendBlockResponse(req, res);
    }

    // 2. Payload detection on URL/query/headers (req.body is parsed
    //    further down the chain — see securityBodyScan below).
    const hits = securityService.scanRequest(req);
    if (hits.length > 0) {
      // Pick the most severe hit; multiple hits on one request are one event.
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      const top = hits.slice().sort((a, b) => order[a.severity] - order[b.severity])[0];

      // Fire-and-forget: log + alert + notify + strike — never delay the response.
      securityService.recordAttack(req, top).catch(() => {});

      if (top.severity === 'high' || top.severity === 'critical') {
        return sendBlockResponse(req, res);
      }
      // Medium hits continue (recorded + strike) — avoids false-positive
      // lockouts on odd-but-legitimate traffic.
    }

    next();
  } catch (e) {
    // The security layer must never take the site down. Log and pass.
    console.warn('[SECURITY-MONITOR] error:', e.message);
    next();
  }
}

/* Body scanner — mounted AFTER express.json/urlencoded (req.body only
   exists there). Same verdict logic as the URL scan. Skipped entirely
   when the early gate already blocked the request. */
function securityBodyScan(req, res, next) {
  try {
    if (res.headersSent || res.statusCode === 403 || isExempt(req) || !req.body) return next();

    const hits = securityService.scanRequest(req); // scanRequest already includes body
    if (hits.length > 0) {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      const bodyHit = hits
        .filter(h => h.where === 'body')
        .sort((a, b) => order[a.severity] - order[b.severity])[0];

      if (bodyHit) {
        securityService.recordAttack(req, bodyHit).catch(() => {});
        if (bodyHit.severity === 'high' || bodyHit.severity === 'critical') {
          return sendBlockResponse(req, res);
        }
      }
    }
    next();
  } catch (e) {
    console.warn('[SECURITY-MONITOR] body scan error:', e.message);
    next();
  }
}

module.exports = { securityMonitor, securityBodyScan, sendBlockResponse };
