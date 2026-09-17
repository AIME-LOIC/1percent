/**
 * routes/coinsRoutes.js
 *
 * PURPOSE:
 *   Coin economy routes: balance, ledger, hint unlock, spend.
 *
 * ENDPOINTS:
 *   GET /balance
 *   GET /transactions
 *   GET /challenges/all
 *   GET /challenges/search
 *   GET /challenges/daily
 *   GET /challenges/:courseId
 *   POST /challenges/:challengeId/submit
 *   GET /lock/:lessonId
 *   POST /unlock/:lessonId
 *   GET /hints/status
 *   GET /challenges/:challengeId/hints
 *   POST /challenges/:challengeId/hints/reveal
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */
const { Router } = require('express');
const coinsController = require('../controllers/coinsController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');

const router = Router();

router.get('/balance', authenticate, (req, res, next) => coinsController.getBalance(req, res, next));
router.get('/transactions', authenticate, (req, res, next) => coinsController.getTransactions(req, res, next));

// Optional auth routes — work with or without login.
// Rate limited (red-teamed): public enumeration endpoints were unthrottled.
router.get('/challenges/all', rateLimit, optionalAuth, (req, res, next) => coinsController.getAllChallenges(req, res, next));
router.get('/challenges/search', rateLimit, optionalAuth, (req, res, next) => coinsController.searchChallenges(req, res, next));
router.get('/challenges/daily', rateLimit, optionalAuth, (req, res, next) => coinsController.getDailyChallenge(req, res, next));

// Auth-required routes
router.get('/challenges/:courseId', authenticate, (req, res, next) => coinsController.getChallenges(req, res, next));
router.post('/challenges/:challengeId/submit', authenticate, (req, res, next) => coinsController.submitChallenge(req, res, next));
router.get('/lock/:lessonId', authenticate, (req, res, next) => coinsController.checkLessonLock(req, res, next));
router.post('/unlock/:lessonId', authenticate, (req, res, next) => coinsController.unlockLesson(req, res, next));

// Hints — status first (static path), then per-challenge reveal.
router.get('/hints/status', authenticate, (req, res, next) => coinsController.getHintStatus(req, res, next));
router.get('/challenges/:challengeId/hints', authenticate, (req, res, next) => coinsController.getUnlockedHints(req, res, next));
router.post('/challenges/:challengeId/hints/reveal', authenticate, (req, res, next) => coinsController.revealHint(req, res, next));

module.exports = router;
