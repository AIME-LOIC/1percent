/* ============================================================
   Quiz Routes
   ============================================================
   GET  /api/quizzes/course/:courseId          — Get quiz for course (public)
   GET  /api/quizzes/:quizId/questions         — Get questions (auth)
   POST /api/quizzes/:quizId/submit            — Submit answers (auth)
   GET  /api/quizzes/:quizId/attempts          — View attempts (auth)
   POST /api/admin/quizzes                     — Create quiz (admin)
   POST /api/admin/quizzes/:quizId/questions   — Add question (admin)
   DELETE /api/admin/quizzes/:quizId           — Delete quiz (admin)
   ============================================================ */

const { Router } = require('express');
const quizController = require('../controllers/quizController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

const router = Router();

// Public
router.get('/course/:courseId', (req, res, next) => quizController.getByCourse(req, res, next));

// Auth required
router.get('/:quizId/questions', authenticate, (req, res, next) => quizController.getQuestions(req, res, next));
router.post('/:quizId/submit', authenticate, sanitizeStrings(2000), (req, res, next) => quizController.submit(req, res, next));
router.get('/:quizId/attempts', authenticate, (req, res, next) => quizController.getAttempts(req, res, next));

module.exports = router;

// Admin routes (mounted separately)
const adminRouter = Router();
adminRouter.post('/', authenticate, requireRole('admin'), sanitizeStrings(2000), (req, res, next) => quizController.create(req, res, next));
adminRouter.post('/:quizId/questions', authenticate, requireRole('admin'), sanitizeStrings(2000), (req, res, next) => quizController.addQuestion(req, res, next));
adminRouter.delete('/:quizId', authenticate, requireRole('admin'), (req, res, next) => quizController.delete(req, res, next));

module.exports = { quizRoutes: router, quizAdminRoutes: adminRouter };
