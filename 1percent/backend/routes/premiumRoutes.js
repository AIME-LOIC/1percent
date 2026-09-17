/**
 * routes/premiumRoutes.js
 *
 * PURPOSE:
 *   Subscription/tier routes: catalog, subscribe, cancel, resume.
 *
 * ENDPOINTS:
 *   GET /tiers
 *   GET /status
 *   POST /subscribe
 *   POST /cancel
 *   POST /resume
 *   POST /free-trial
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */
const { Router } = require('express');
const premiumController = require('../controllers/premiumController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Public
router.get('/tiers', (req, res, next) => premiumController.getTiers(req, res, next));

// Auth required
router.get('/status', authenticate, (req, res, next) => premiumController.getStatus(req, res, next));
router.post('/subscribe', authenticate, (req, res, next) => premiumController.subscribe(req, res, next));
router.post('/cancel', authenticate, (req, res, next) => premiumController.cancel(req, res, next));
router.post('/resume', authenticate, (req, res, next) => premiumController.resume(req, res, next));
router.post('/free-trial', authenticate, (req, res, next) => premiumController.freeTrial(req, res, next));

module.exports = router;
