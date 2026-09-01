/* ============================================================
   Admin Routes
   ============================================================
   All routes require authentication + admin role.
   ============================================================ */

const { Router } = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireRole('admin'));

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

module.exports = router;
