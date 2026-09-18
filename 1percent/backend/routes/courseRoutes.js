/**
 * routes/courseRoutes.js
 *
 * PURPOSE:
 *   Course/lesson routes: catalog, detail, enroll, progress.
 *
 * ENDPOINTS:
 *   GET /roadmap
 *   GET /roadmap/:phaseId
 *   GET /roadmap/:phaseId/:trackId
 *   GET /courses
 *   GET /courses/enrollments
 *   GET /courses/progress/overall
 *   GET /courses/progress/:lessonId/quick-quiz
 *   POST /courses/progress/:lessonId/quick-quiz
 *   POST /courses/progress/:lessonId/complete
 *   POST /courses/:courseId/enroll
 *   GET /courses/:courseId/progress
 *   GET /courses/lessons/:lessonId/content
 *   GET /courses/:slug
 *   POST /courses/:courseId/certificate
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const courseController = require('../controllers/courseController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');
const { sanitizeStrings } = require('../middlewares/validate');
const certificateController = require('../controllers/certificateController');

const router = Router();

// Public routes
router.get('/roadmap', (req, res, next) => courseController.getRoadmap(req, res, next));
router.get('/roadmap/:phaseId', (req, res, next) => courseController.getPhase(req, res, next));
router.get('/roadmap/:phaseId/:trackId', (req, res, next) => courseController.getTrack(req, res, next));

// Public — courses list (MUST be before /:slug to avoid route collision)
router.get('/courses', rateLimit, (req, res, next) => courseController.getCourses(req, res, next));
router.get('/courses/thumbnail', (req, res, next) => courseController.getCourseThumbnail(req, res, next));

// Protected courses routes — named routes BEFORE /:slug
router.get('/courses/enrollments', authenticate, (req, res, next) => courseController.getMyEnrollments(req, res, next));
router.get('/courses/progress/overall', authenticate, (req, res, next) => courseController.getOverallProgress(req, res, next));
// Lesson Quick Quiz (fast-track completion) — named routes BEFORE /:slug
router.get('/courses/progress/:lessonId/quick-quiz', authenticate, rateLimit, (req, res, next) => courseController.getQuickQuiz(req, res, next));
router.post('/courses/progress/:lessonId/quick-quiz', authenticate, rateLimit, sanitizeStrings(2000), (req, res, next) => courseController.submitQuickQuiz(req, res, next));
router.post('/courses/progress/:lessonId/complete', authenticate, (req, res, next) => courseController.completeLesson(req, res, next));
router.post('/courses/:courseId/enroll', authenticate, (req, res, next) => courseController.enroll(req, res, next));
router.get('/courses/:courseId/progress', authenticate, (req, res, next) => courseController.getCourseProgress(req, res, next));

// Lesson content on demand (BEFORE /:slug to avoid route collision).
// optionalAuth resolves the user when a token is present so the
// controller can enforce premium/free-preview access server-side.
router.get('/courses/lessons/:lessonId/content', rateLimit, optionalAuth, (req, res, next) => courseController.getLessonContent(req, res, next));

// Public — course detail by slug (AFTER all named routes)
router.get('/courses/:slug', rateLimit, (req, res, next) => courseController.getCourse(req, res, next));

// Certificate
router.post('/courses/:courseId/certificate', authenticate, (req, res, next) => certificateController.issue(req, res, next));

module.exports = router;
