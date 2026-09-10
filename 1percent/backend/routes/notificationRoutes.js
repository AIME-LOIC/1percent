/* ============================================================
   Notification Routes
   ============================================================
   User routes: /api/notifications/*
   Admin routes: /api/admin/notifications/*
   ============================================================ */

const { Router } = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

const router = Router();

// ============================================================
// User Routes (require authentication)
// ============================================================

// Get notifications for authenticated user
router.get('/', authenticate, (req, res, next) => notificationController.getNotifications(req, res, next));

// Get a single notification
router.get('/:id', authenticate, (req, res, next) => notificationController.getNotification(req, res, next));

// Mark a notification as read
router.put('/:id/read', authenticate, (req, res, next) => notificationController.markAsRead(req, res, next));

// Mark all notifications as read
router.put('/read-all', authenticate, (req, res, next) => notificationController.markAllAsRead(req, res, next));

// Delete a notification
router.delete('/:id', authenticate, (req, res, next) => notificationController.deleteNotification(req, res, next));

module.exports = router;

// ============================================================
// Admin Routes (require authentication + admin role)
// ============================================================

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

// Create a notification for a specific user
adminRouter.post('/', sanitizeStrings(2000), (req, res, next) => notificationController.createNotification(req, res, next));

// Create notifications for multiple users
adminRouter.post('/bulk', sanitizeStrings(2000), (req, res, next) => notificationController.createBulkNotifications(req, res, next));

// Broadcast notification to all users
adminRouter.post('/broadcast', sanitizeStrings(2000), (req, res, next) => notificationController.broadcastNotification(req, res, next));

// Delete all notifications for a user
adminRouter.delete('/user/:userId', (req, res, next) => notificationController.deleteUserNotifications(req, res, next));

module.exports.adminNotificationRoutes = adminRouter;
