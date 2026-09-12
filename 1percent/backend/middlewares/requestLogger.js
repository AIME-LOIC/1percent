/* ============================================================
   Request Logger Middleware
   ============================================================
   - Assigns a request id to every request.
   - Captures every 5xx response (even ones returned directly with
     res.status(500) rather than thrown) and persists it to
     error_logs + raises an admin alert.
   - Never blocks or throws; logging happens after the response.
   ============================================================ */

const crypto = require('crypto');

const logService = require('../services/logService');

function requestLogger(req, res, next) {
  // Correlate client + server logs.
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const status = res.statusCode;

    // Only 5xx are treated as errors here. Thrown errors are handled
    // (and logged) by the global error handler in backend/index.js.
    if (status >= 500 && !res.locals.errorLogged) {
      // Fire and forget — do not await inside a response lifecycle hook.
      logService.logRequestError(req, null, {
        level: status >= 503 ? 'critical' : 'error',
        message: `HTTP ${status} on ${req.method} ${req.originalUrl}`,
        statusCode: status
      }).catch(() => {});
    }
  });

  next();
}

module.exports = { requestLogger };
