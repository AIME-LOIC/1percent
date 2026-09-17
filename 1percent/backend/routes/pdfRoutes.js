/**
 * routes/pdfRoutes.js
 *
 * PURPOSE:
 *   Certificate PDF download routes.
 *
 * ENDPOINTS:
 *   GET /lesson/:lessonId
 *   GET /course/:courseId
 *   GET /certificate/:courseId
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */
const { Router } = require('express');
const pdfController = require('../controllers/pdfController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Premium downloads — require authentication
router.get('/lesson/:lessonId', authenticate, (req, res, next) => pdfController.downloadLesson(req, res, next));
router.get('/course/:courseId', authenticate, (req, res, next) => pdfController.downloadCourse(req, res, next));
router.get('/certificate/:courseId', authenticate, (req, res, next) => pdfController.downloadCertificate(req, res, next));

module.exports = router;
