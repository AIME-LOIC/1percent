const { Router } = require('express');
const streakController = require('../controllers/streakController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticate, (req, res, next) => streakController.getStreak(req, res, next));

module.exports = router;
