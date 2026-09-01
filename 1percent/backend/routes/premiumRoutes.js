const { Router } = require('express');
const premiumController = require('../controllers/premiumController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Public
router.get('/tiers', (req, res, next) => premiumController.getTiers(req, res, next));

// Auth required
router.get('/status', authenticate, (req, res, next) => premiumController.getStatus(req, res, next));
router.post('/subscribe', authenticate, (req, res, next) => premiumController.subscribe(req, res, next));
router.post('/free-trial', authenticate, (req, res, next) => premiumController.freeTrial(req, res, next));

module.exports = router;
