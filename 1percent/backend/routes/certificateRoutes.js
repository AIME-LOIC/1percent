/**
 * routes/certificateRoutes.js
 *
 * PURPOSE:
 *   Certificate routes: issue/list (auth) + public verification by certificate number.
 *
 * ENDPOINTS:
 *   GET /mine
 *   POST /free-view
 *   GET /usage
 *   GET /verify/:number
 *   GET /public/:number
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');

const router = Router();

// Auth required
router.get('/mine', authenticate, (req, res, next) => certificateController.getMine(req, res, next));
router.post('/free-view', authenticate, (req, res, next) => certificateController.recordFreeView(req, res, next));
router.get('/usage', authenticate, (req, res, next) => certificateController.getUsage(req, res, next));

// Public — rate limited (red-teamed): cert numbers are semi-predictable
// (1PCT-YYYY-XXXXXXXX) and these endpoints hit the DB + signature lookups.
router.get('/verify/:number', rateLimit, (req, res, next) => certificateController.verify(req, res, next));
router.get('/public/:number', rateLimit, (req, res, next) => certificateController.publicView(req, res, next));

module.exports = router;
