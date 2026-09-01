/* ============================================================
   Course Routes
   ============================================================
   GET  /api/roadmap                          — Full roadmap (public)
   GET  /api/roadmap/:phaseId                 — Specific phase (public)
   GET  /api/roadmap/:phaseId/:trackId        — Specific track (public)

   GET  /api/courses                          — All courses (public)
   GET  /api/courses/:slug                    — Single course (public)
   POST /api/courses/:courseId/enroll         — Enroll (auth required)
   GET  /api/courses/enrollments              — My enrollments (auth required)
   GET  /api/courses/:courseId/progress       — Course progress (auth required)
   GET  /api/courses/progress/overall         — Overall progress (auth required)
   POST /api/courses/progress/:moduleId/complete — Complete module (auth required)
   ============================================================ */

const { Router } = require('express');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');
const certificateController = require('../controllers/certificateController');

const router = Router();

// Public routes
router.get('/roadmap', (req, res, next) => courseController.getRoadmap(req, res, next));
router.get('/roadmap/:phaseId', (req, res, next) => courseController.getPhase(req, res, next));
router.get('/roadmap/:phaseId/:trackId', (req, res, next) => courseController.getTrack(req, res, next));

// Public — courses list (MUST be before /:slug to avoid route collision)
router.get('/courses', rateLimit, (req, res, next) => courseController.getCourses(req, res, next));

// Protected courses routes — named routes BEFORE /:slug
router.get('/courses/enrollments', authenticate, (req, res, next) => courseController.getMyEnrollments(req, res, next));
router.get('/courses/progress/overall', authenticate, (req, res, next) => courseController.getOverallProgress(req, res, next));
router.post('/courses/progress/:lessonId/complete', authenticate, (req, res, next) => courseController.completeLesson(req, res, next));
router.post('/courses/:courseId/enroll', authenticate, (req, res, next) => courseController.enroll(req, res, next));
router.get('/courses/:courseId/progress', authenticate, (req, res, next) => courseController.getCourseProgress(req, res, next));

// Public — course detail by slug (AFTER named routes)
router.get('/courses/:slug', rateLimit, (req, res, next) => courseController.getCourse(req, res, next));

// Certificate
router.post('/courses/:courseId/certificate', authenticate, (req, res, next) => certificateController.issue(req, res, next));

module.exports = router;
