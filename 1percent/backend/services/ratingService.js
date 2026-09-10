/* ============================================================
   Rating Service
   ============================================================
   Handles rating CRUD operations for the platform.
   ============================================================ */

const { adminClient } = require('../config/database');

class RatingService {
  /**
   * Get user's rating for a category
   * @param {string} userId - User ID
   * @param {string} category - Rating category
   * @returns {Object} Rating data
   */
  async getUserRating(userId, category = 'general') {
    const { data, error } = await adminClient
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    // If no rating exists, return null (not an error)
    if (error && error.code === 'PGRST116') {
      return null;
    }
    if (error) throw error;

    return data;
  }

  /**
   * Get all ratings for a user
   * @param {string} userId - User ID
   * @returns {Object} User ratings
   */
  async getAllUserRatings(userId) {
    const { data, error } = await adminClient
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Submit or update a rating
   * @param {string} userId - User ID
   * @param {Object} ratingData - Rating data (rating, feedback, category)
   * @returns {Object} Created/updated rating
   */
  async submitRating(userId, ratingData) {
    const { rating, feedback, category = 'general' } = ratingData;

    // Upsert: insert or update if exists
    const { data, error } = await adminClient
      .from('ratings')
      .upsert({
        user_id: userId,
        rating,
        feedback: feedback || null,
        category
      }, {
        onConflict: 'user_id,category'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a rating
   * @param {string} userId - User ID
   * @param {string} category - Rating category
   * @returns {Object} Delete result
   */
  async deleteRating(userId, category = 'general') {
    const { error } = await adminClient
      .from('ratings')
      .delete()
      .eq('user_id', userId)
      .eq('category', category);

    if (error) throw error;
    return { success: true, message: 'Rating deleted' };
  }

  /**
   * Get average rating for a category
   * @param {string} category - Rating category
   * @returns {Object} Average rating stats
   */
  async getAverageRating(category = null) {
    let query = adminClient
      .from('ratings')
      .select('rating, category');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Calculate average
    const total = data.reduce((sum, r) => sum + r.rating, 0);
    const average = total / data.length;

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    return {
      average: Math.round(average * 10) / 10,
      count: data.length,
      distribution
    };
  }

  /**
   * Get all ratings (admin only)
   * @param {Object} options - Query options
   * @returns {Object} All ratings
   */
  async getAllRatings(options = {}) {
    const { limit = 100, offset = 0, category = null } = options;

    let query = adminClient
      .from('ratings')
      .select('*, profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return {
      ratings: data || [],
      total: count || 0
    };
  }
}

module.exports = new RatingService();
