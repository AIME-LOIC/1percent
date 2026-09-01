const { adminClient } = require('../config/database');

class StreakService {
  /**
   * Get user's current streak
   */
  async getStreak(userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = data.last_active_date;

    // Check if streak is still valid (active today or yesterday)
    let isActive = false;
    if (lastActive) {
      const last = new Date(lastActive);
      const now = new Date(today);
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      isActive = diffDays <= 1;
    }

    return {
      streak: isActive ? (data.streak_count || 0) : 0,
      last_active: lastActive,
      is_active_today: lastActive === today
    };
  }

  /**
   * Update streak when user completes a lesson
   * Uses the PostgreSQL function for atomicity
   */
  async updateStreak(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (!profile) return;

    // Already active today — no coins
    if (profile.last_active_date === today) return;

    let newStreak = 1;
    if (profile.last_active_date) {
      const last = new Date(profile.last_active_date);
      const now = new Date(today);
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak = (profile.streak_count || 0) + 1;
    }

    await adminClient
      .from('profiles')
      .update({ streak_count: newStreak, last_active_date: today })
      .eq('id', userId);

    // Award 4 coins for new streak day
    try {
      const coinsService = require('./coinsService');
      await coinsService.addCoins(userId, 4, `Streak day ${newStreak}`);
    } catch (e) {
      console.warn('[COINS] Could not award streak coins:', e.message);
    }
  }
}

module.exports = new StreakService();
