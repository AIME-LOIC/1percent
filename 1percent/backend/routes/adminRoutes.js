/**
 * routes/adminRoutes.js
 *
 * PURPOSE:
 *   Admin API routes — every route sits behind requireAuth + requireAdmin.
 *
 * ENDPOINTS:
 *   GET /analytics
 *   GET /courses
 *   POST /courses
 *   PUT /courses/:courseId
 *   DELETE /courses/:courseId
 *   GET /courses/:courseId/lessons
 *   POST /courses/:courseId/lessons
 *   PUT /lessons/:lessonId
 *   DELETE /lessons/:lessonId
 *   GET /enrollments
 *   GET /users
 *   GET /notifications
 *   POST /send-onboarding-notifications
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Analytics (dashboard charts)
router.get('/analytics', (req, res, next) => analyticsController.getOverview(req, res, next));

/* ── Security: IP blocklist management ─────────────────────
   The WAF strike system (5 strikes → 1h/6h/24h block) previously had
   NO unblock path — an admin tripping it themselves was locked out of
   the admin panel too. These endpoints let an admin review and lift
   blocks. IPs are only ever listed hashed/masked; the raw IP is sent
   BY the admin to unblock and never echoed back. */
router.get('/security/blocks', async (req, res) => {
  try {
    const securityService = require('../services/securityService');
    const blocks = await securityService.listBlocks();
    res.json({ success: true, blocks });
  } catch (err) {
    console.error('[ADMIN] Security blocks error:', err.message);
    res.status(500).json({ error: 'Failed to load blocked IPs.' });
  }
});

router.post('/security/unblock', async (req, res) => {
  try {
    const ip = String(req.body?.ip || '').trim();
    // Loose sanity check: IPv4, IPv6, or IPv6-mapped IPv4 — we only need
    // to stop obvious garbage before it reaches the hasher.
    if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
      return res.status(400).json({ error: 'Provide a valid IP address (e.g. 102.89.34.10).' });
    }
    const securityService = require('../services/securityService');
    const result = await securityService.unblockIp(ip);

    // Audit trail — who lifted what, without recording the raw IP.
    require('../services/logService').createAdminAlert({
      title: '🔓 IP block lifted',
      message: `${securityService.previewIp(ip)} unblocked by admin ${req.user?.email || req.user?.id || 'unknown'} (found: ${result.found})`,
      type: 'security',
      severity: 'low',
      source: 'admin-panel'
    }).catch(() => {});

    res.json({ success: true, found: result.found, message: result.found ? 'IP unblocked.' : 'No active block found for that IP.' });
  } catch (err) {
    console.error('[ADMIN] Unblock error:', err.message);
    res.status(500).json({ error: 'Failed to unblock IP.' });
  }
});

// Courses
router.get('/courses', (req, res, next) => adminController.getAllCourses(req, res, next));
router.post('/courses', sanitizeStrings(2000), (req, res, next) => adminController.createCourse(req, res, next));
router.put('/courses/:courseId', sanitizeStrings(2000), (req, res, next) => adminController.updateCourse(req, res, next));
router.delete('/courses/:courseId', (req, res, next) => adminController.deleteCourse(req, res, next));

// Lessons
router.get('/courses/:courseId/lessons', (req, res, next) => adminController.getLessonsForCourse(req, res, next));
router.post('/courses/:courseId/lessons', sanitizeStrings(5000), (req, res, next) => adminController.createLesson(req, res, next));
router.put('/lessons/:lessonId', sanitizeStrings(5000), (req, res, next) => adminController.updateLesson(req, res, next));
router.delete('/lessons/:lessonId', (req, res, next) => adminController.deleteLesson(req, res, next));

// Enrollments
router.get('/enrollments', (req, res, next) => adminController.getAllEnrollments(req, res, next));

// Users
router.get('/users', (req, res, next) => adminController.getAllUsers(req, res, next));

// Notifications (admin view)
router.get('/notifications', (req, res, next) => adminController.getAllNotifications(req, res, next));

// Onboarding notification
router.post('/send-onboarding-notifications', async (req, res) => {
  try {
    const { notifyIncompleteOnboarding } = require('../workers/onboardingNotify');
    const result = await notifyIncompleteOnboarding();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[ADMIN] Onboarding notify error:', err.message);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

module.exports = router;
