/* ============================================================
   Validation Middleware
   ============================================================
   Lightweight request body validation and sanitization.
   ============================================================ */

/* Escape HTML entities to prevent XSS */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* Validate required fields exist in req.body */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => !req.body[f] || (typeof req.body[f] === 'string' && !req.body[f].trim()));

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      });
    }

    next();
  };
}

/* Validate email format */
function validateEmail(req, res, next) {
  if (req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }
  }
  next();
}

/* Sanitize string fields — trim, limit length, escape HTML to prevent XSS */
function sanitizeStrings(maxLength = 5000) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = escapeHtml(value.trim().slice(0, maxLength));
        }
      }
    }
    next();
  };
}

/* Generic validation handler — use with a custom validator function */
function validate(validatorFn) {
  return (req, res, next) => {
    const error = validatorFn(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    next();
  };
}

module.exports = {
  requireFields,
  validateEmail,
  sanitizeStrings,
  validate,
  escapeHtml
};
