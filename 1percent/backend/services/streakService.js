const { adminClient } = require('../config/database');

class StreakService {
  /**
   * Get today's date string in UTC (YYYY-MM-DD)
   */
  _today() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Difference in calendar days between two YYYY-MM-DD strings (b - a)
   */
  _dayDiff(a, b) {
    const msA = new Date(a + 'T00:00:00Z').getTime();
    const msB = new Date(b + 'T00:00:00Z').getTime();
    return Math.round((msB - msA) / 86400000);
  }

  /**
   * Get user's current streak info
   */
  async getStreak(userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const today = this._today();
    const lastActive = data.last_active_date;
    const diff = lastActive ? this._dayDiff(lastActive, today) : null;

    // Streak is alive if active today (diff=0) or yesterday (diff=1)
    const isAlive = diff !== null && diff <= 1;
    const streak = isAlive ? (data.streak_count || 0) : 0;

    return {
      streak,
      last_active: lastActive,
      is_active_today: lastActive === today,
      broken: !isAlive && lastActive !== null
    };
  }

  /**
   * Called when user completes a lesson.
   * - If already active today: no-op
   * - If active yesterday: increment streak, award 4 coins
   * - If missed 1+ days: reset streak to 1, deduct 3 coins per missed day (max 9)
   */
  async updateStreak(userId) {
    const today = this._today();

    const { data: profile } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (!profile) return;

    // Already active today — nothing to do
    if (profile.last_active_date === today) return;

    const coinsService = require('./coinsService');
    const lastActive = profile.last_active_date;
    const diff = lastActive ? this._dayDiff(lastActive, today) : null;

    let newStreak;

    if (diff === 1) {
      // Continued streak
      newStreak = (profile.streak_count || 0) + 1;
      await adminClient.from('profiles')
        .update({ streak_count: newStreak, last_active_date: today })
        .eq('id', userId);

      // Award 4 coins for streak day
      await coinsService.addCoins(userId, 4, `🔥 Streak day ${newStreak}`).catch(() => {});

    } else if (diff === null || diff > 1) {
      // Streak broken — reset to 1
      newStreak = 1;
      const missedDays = diff ? Math.min(diff - 1, 3) : 0; // cap penalty at 3 missed days
      const penalty = missedDays * 3;

      await adminClient.from('profiles')
        .update({ streak_count: newStreak, last_active_date: today })
        .eq('id', userId);

      // Deduct 3 coins per missed day (max -9)
      if (penalty > 0) {
        await coinsService.addCoins(userId, -penalty,
          `💔 Streak broken — missed ${missedDays} day${missedDays > 1 ? 's' : ''}`
        ).catch(() => {});
      }

      // Still award 4 coins for today's activity
      await coinsService.addCoins(userId, 4, `🔥 Streak day 1 (restarted)`).catch(() => {});
    }
  }

  /**
   * Scheduled job: deduct 3 coins from users who missed yesterday.
   * Call this once daily (e.g. via a cron endpoint).
   */
  async penalizeMissedStreaks() {
    const today = this._today();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Find users whose last_active_date is before yesterday (missed at least 1 day)
    // and streak_count > 0 (had an active streak)
    const { data: users } = await adminClient
      .from('profiles')
      .select('id, streak_count, last_active_date')
      .gt('streak_count', 0)
      .lt('last_active_date', yesterday); // last active before yesterday

    if (!users?.length) return { penalized: 0 };

    const coinsService = require('./coinsService');
    let penalized = 0;

    for (const user of users) {
      const diff = this._dayDiff(user.last_active_date, today);
      if (diff < 2) continue; // still alive

      const missedDays = Math.min(diff - 1, 3);
      const penalty = missedDays * 3;

      // Reset streak
      await adminClient.from('profiles')
        .update({ streak_count: 0 })
        .eq('id', user.id);

      // Deduct coins
      await coinsService.addCoins(user.id, -penalty,
        `💔 Streak lost — missed ${missedDays} day${missedDays > 1 ? 's' : ''}`
      ).catch(() => {});

      penalized++;
    }

    return { penalized };
  }
}

module.exports = new StreakService();
