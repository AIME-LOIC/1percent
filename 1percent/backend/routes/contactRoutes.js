/* ============================================================
   Contact Routes
   ============================================================
   POST /api/contact              — Submit contact form (public)
   GET  /api/services             — List active services (public)
   GET  /api/admin/requests       — List all requests (admin only)
   PUT  /api/admin/requests/:id/status — Update status (admin only)
   ============================================================ */

const { Router } = require('express');
const contactController = require('../controllers/contactController');
const { authenticate, requireRole } = require('../middlewares/auth');
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
  requireRole('admin'),
  (req, res, next) => contactController.getRequests(req, res, next)
);

router.put('/admin/requests/:id/status',
  authenticate,
  requireRole('admin'),
  requireFields('status'),
  (req, res, next) => contactController.updateStatus(req, res, next)
);

module.exports = router;
