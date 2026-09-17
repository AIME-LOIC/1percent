/**
 * routes/contactRoutes.js
 *
 * PURPOSE:
 *   Contact form route: rate-limited public POST.
 *
 * ENDPOINTS:
 *   POST /
 *   GET /services
 *   GET /admin/requests
 *   PUT /admin/requests/:id/status
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const contactController = require('../controllers/contactController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { requireFields, validateEmail, sanitizeStrings } = require('../middlewares/validate');
const { rateLimit } = require('../middlewares/rateLimit');

const router = Router();

// Public routes
router.post('/',
  rateLimit,
  sanitizeStrings(2000),
  requireFields('name', 'email', 'message'),
  validateEmail,
  (req, res, next) => contactController.submitRequest(req, res, next)
);

router.get('/services', (req, res, next) => contactController.getServices(req, res, next));

// Admin routes
router.get('/admin/requests',
  authenticate,
  requireAdmin,
  (req, res, next) => contactController.getRequests(req, res, next)
);

router.put('/admin/requests/:id/status',
  authenticate,
  requireAdmin,
  requireFields('status'),
  (req, res, next) => contactController.updateStatus(req, res, next)
);

module.exports = router;
