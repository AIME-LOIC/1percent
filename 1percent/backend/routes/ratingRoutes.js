/* ============================================================
   Rating Routes
   ============================================================
   User routes: /api/ratings/*
   Admin routes: /api/admin/ratings/*
   ============================================================ */

const { Router } = require('express');
const ratingController = require('../controllers/ratingController');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = Router();

// ============================================================
// User Routes (require authentication)
// ============================================================

// Get authenticated user's ratings
router.get('/mine', authenticate, (req, res, next) => ratingController.getMyRatings(req, res, next));

// Get authenticated user's rating for a category
router.get('/mine/:category', authenticate, (req, res, next) => ratingController.getMyRatingForCategory(req, res, next));

// Submit or update a rating
router.post('/', authenticate, (req, res, next) => ratingController.submitRating(req, res, next));

// Delete a rating
router.delete('/:category', authenticate, (req, res, next) => ratingController.deleteRating(req, res, next));

// Get rating stats (public)
router.get('/stats', (req, res, next) => ratingController.getRatingStats(req, res, next));

module.exports = router;

// ============================================================
// Admin Routes (require authentication + admin role)
// ============================================================

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

// Get all ratings (admin)
adminRouter.get('/', (req, res, next) => ratingController.getAllRatings(req, res, next));

module.exports.adminRatingRoutes = adminRouter;
