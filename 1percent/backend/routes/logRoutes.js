/* ============================================================
   Log Routes
   ============================================================
   Client routes:  /api/logs/*        (report errors/events)
   Admin routes:   /api/admin/logs/*  (browse, filter, resolve)
   ============================================================ */

const { Router } = require('express');
const logController = require('../controllers/logController');
const { authenticate, optionalAuth, requireRole } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

/* ------------------------------------------------------------
   CLIENT ROUTES (auth optional — anonymous errors are useful too)
   ------------------------------------------------------------ */
const router = Router();

// A user reports an issue they hit (from any client).
router.post(
  '/error',
  optionalAuth,
  sanitizeStrings(8000),
  (req, res, next) => logController.reportClientError(req, res, next)
);

// A client reports a notable event / activity.
router.post(
  '/event',
  optionalAuth,
  sanitizeStrings(2000),
  (req, res, next) => logController.reportClientEvent(req, res, next)
);

module.exports = router;

/* ------------------------------------------------------------
   ADMIN ROUTES (auth + admin role required)
   ------------------------------------------------------------ */
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

// Dashboard stats
adminRouter.get('/stats', (req, res, next) => logController.getStats(req, res, next));

// Errors
adminRouter.get('/errors', (req, res, next) => logController.getErrors(req, res, next));
adminRouter.get('/errors/groups', (req, res, next) => logController.getErrorGroups(req, res, next));
adminRouter.get('/errors/:id', (req, res, next) => logController.getError(req, res, next));
adminRouter.put('/errors/:id/resolve', sanitizeStrings(2000), (req, res, next) => logController.resolveError(req, res, next));
adminRouter.delete('/errors/:id', (req, res, next) => logController.deleteError(req, res, next));

// System logs (activity/events)
adminRouter.get('/activity', (req, res, next) => logController.getSystemLogs(req, res, next));

// Alerts
adminRouter.get('/alerts', (req, res, next) => logController.getAlerts(req, res, next));
adminRouter.put('/alerts/read-all', (req, res, next) => logController.markAllAlertsRead(req, res, next));
adminRouter.put('/alerts/:id/read', (req, res, next) => logController.markAlertRead(req, res, next));
adminRouter.delete('/alerts/:id', (req, res, next) => logController.deleteAlert(req, res, next));

// Manual event / alert creation
adminRouter.post('/events', sanitizeStrings(2000), (req, res, next) => logController.createEvent(req, res, next));
adminRouter.post('/alerts', sanitizeStrings(2000), (req, res, next) => logController.createAlert(req, res, next));

module.exports.adminLogRoutes = adminRouter;
