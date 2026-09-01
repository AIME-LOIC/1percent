/* ============================================================
   Certificate Routes
   ============================================================
   POST /api/courses/:courseId/certificate     — Issue certificate (auth)
   GET  /api/certificates/verify/:number       — Verify certificate (public)
   GET  /api/certificates/mine                 — My certificates (auth)
   ============================================================ */

const { Router } = require('express');
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Auth required
router.get('/mine', authenticate, (req, res, next) => certificateController.getMine(req, res, next));
router.post('/free-view', authenticate, (req, res, next) => certificateController.recordFreeView(req, res, next));
router.get('/usage', authenticate, (req, res, next) => certificateController.getUsage(req, res, next));

// Public
router.get('/verify/:number', (req, res, next) => certificateController.verify(req, res, next));
router.get('/public/:number', (req, res, next) => certificateController.publicView(req, res, next));

module.exports = router;
