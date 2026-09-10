/* ============================================================
   Rating Controller
   ============================================================
   Handles HTTP requests for rating operations.
   ============================================================ */

const ratingService = require('../services/ratingService');

class RatingController {
  /**
   * GET /api/ratings/mine
   * Get the authenticated user's ratings
   */
  async getMyRatings(req, res) {
    try {
      const userId = req.user.id;
      const ratings = await ratingService.getAllUserRatings(userId);
      res.json({ success: true, ratings });
    } catch (err) {
      console.error('[RATINGS] Get my ratings error:', err.message);
      res.status(500).json({ error: 'Failed to load ratings' });
    }
  }

  /**
   * GET /api/ratings/mine/:category
   * Get the authenticated user's rating for a specific category
   */
  async getMyRatingForCategory(req, res) {
    try {
      const userId = req.user.id;
      const { category } = req.params;

      const rating = await ratingService.getUserRating(userId, category);
      res.json({ success: true, rating });
    } catch (err) {
      console.error('[RATINGS] Get my rating error:', err.message);
      res.status(500).json({ error: 'Failed to load rating' });
    }
  }

  /**
   * POST /api/ratings
   * Submit or update a rating
   */
  async submitRating(req, res) {
    try {
      const userId = req.user.id;
      const { rating, feedback, category } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const result = await ratingService.submitRating(userId, {
        rating,
        feedback,
        category
      });

      res.json({ success: true, rating: result });
    } catch (err) {
      console.error('[RATINGS] Submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit rating' });
    }
  }

  /**
   * DELETE /api/ratings/:category
   * Delete a rating
   */
  async deleteRating(req, res) {
    try {
      const userId = req.user.id;
      const { category } = req.params;

      const result = await ratingService.deleteRating(userId, category);
      res.json(result);
    } catch (err) {
      console.error('[RATINGS] Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete rating' });
    }
  }

  /**
   * GET /api/ratings/stats
   * Get average rating stats (public)
   */
  async getRatingStats(req, res) {
    try {
      const { category } = req.query;
      const stats = await ratingService.getAverageRating(category || null);
      res.json({ success: true, stats });
    } catch (err) {
      console.error('[RATINGS] Stats error:', err.message);
      res.status(500).json({ error: 'Failed to load rating stats' });
    }
  }

  /**
   * GET /api/admin/ratings
   * Get all ratings (admin only)
   */
  async getAllRatings(req, res) {
    try {
      const { limit = 100, offset = 0, category } = req.query;

      const result = await ratingService.getAllRatings({
        limit: parseInt(limit),
        offset: parseInt(offset),
        category
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[RATINGS] Admin get all error:', err.message);
      res.status(500).json({ error: 'Failed to load ratings' });
    }
  }
}

module.exports = new RatingController();
