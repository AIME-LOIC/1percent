/**
 * routes/streakRoutes.js
 *
 * PURPOSE:
 *   Streak routes: status, calendar, leaderboard.
 *
 * ENDPOINTS:
 *   GET /
 *   GET /history
 *   GET /leaderboard
 *   POST /daily-penalty
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */
const { Router } = require('express');
const streakController = require('../controllers/streakController');
const { authenticate, optionalAuth } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticate, (req, res, next) => streakController.getStreak(req, res, next));
router.get('/history', authenticate, (req, res, next) => streakController.getHistory(req, res, next));
router.get('/leaderboard', optionalAuth, (req, res, next) => streakController.getLeaderboard(req, res, next));
router.post('/daily-penalty', (req, res, next) => streakController.runDailyPenalty(req, res, next));

module.exports = router;
