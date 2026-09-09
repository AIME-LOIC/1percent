const { Router } = require('express');
const streakController = require('../controllers/streakController');
const { authenticate, optionalAuth } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticate, (req, res, next) => streakController.getStreak(req, res, next));
router.get('/leaderboard', optionalAuth, (req, res, next) => streakController.getLeaderboard(req, res, next));
router.post('/daily-penalty', (req, res, next) => streakController.runDailyPenalty(req, res, next));

module.exports = router;
