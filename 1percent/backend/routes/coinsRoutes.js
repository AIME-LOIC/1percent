const { Router } = require('express');
const coinsController = require('../controllers/coinsController');
const { authenticate, optionalAuth } = require('../middlewares/auth');

const router = Router();

router.get('/balance', authenticate, (req, res, next) => coinsController.getBalance(req, res, next));
router.get('/transactions', authenticate, (req, res, next) => coinsController.getTransactions(req, res, next));

// Optional auth routes — work with or without login
router.get('/challenges/all', optionalAuth, (req, res, next) => coinsController.getAllChallenges(req, res, next));
router.get('/challenges/search', optionalAuth, (req, res, next) => coinsController.searchChallenges(req, res, next));
router.get('/challenges/daily', optionalAuth, (req, res, next) => coinsController.getDailyChallenge(req, res, next));

// Auth-required routes
router.get('/challenges/:courseId', authenticate, (req, res, next) => coinsController.getChallenges(req, res, next));
router.post('/challenges/:challengeId/submit', authenticate, (req, res, next) => coinsController.submitChallenge(req, res, next));
router.get('/lock/:lessonId', authenticate, (req, res, next) => coinsController.checkLessonLock(req, res, next));
router.post('/unlock/:lessonId', authenticate, (req, res, next) => coinsController.unlockLesson(req, res, next));

module.exports = router;
