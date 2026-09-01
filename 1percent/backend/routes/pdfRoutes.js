const { Router } = require('express');
const pdfController = require('../controllers/pdfController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Premium downloads — require authentication
router.get('/lesson/:lessonId', authenticate, (req, res, next) => pdfController.downloadLesson(req, res, next));
router.get('/course/:courseId', authenticate, (req, res, next) => pdfController.downloadCourse(req, res, next));
router.get('/certificate/:courseId', authenticate, (req, res, next) => pdfController.downloadCertificate(req, res, next));

module.exports = router;
