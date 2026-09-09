const streakService = require('../services/streakService');
const { adminClient } = require('../config/database');

class StreakController {
  async getStreak(req, res) {
    try {
      const streak = await streakService.getStreak(req.user.id);
      res.json({ success: true, streak });
    } catch (err) {
      res.json({ success: true, streak: { streak: 0, last_active: null, is_active_today: false } });
    }
  }

  async getLeaderboard(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const type = req.query.type || 'coins'; // 'coins' or 'streak'

      const column = type === 'streak' ? 'streak_count' : 'coins';

      const { data, error } = await adminClient
        .from('profiles')
        .select('id, full_name, coins, streak_count, avatar_url')
        .order(column, { ascending: false })
        .gt(column, 0)
        .limit(limit);

      if (error) throw error;

      const board = (data || []).map((u, i) => ({
        rank: i + 1,
        id: u.id,
        name: u.full_name || 'Anonymous',
        coins: u.coins || 0,
        streak: u.streak_count || 0,
        avatar: u.avatar_url || null,
        isCurrentUser: u.id === req.user?.id
      }));

      // Find current user's rank if not in top N
      let currentUserRank = null;
      if (req.user?.id && !board.find(u => u.isCurrentUser)) {
        const { count } = await adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt(column, (await adminClient.from('profiles').select(column).eq('id', req.user.id).single()).data?.[column] || 0);
        currentUserRank = (count || 0) + 1;
      }

      res.json({ success: true, leaderboard: board, currentUserRank, type });
    } catch (err) {
      console.error('[LEADERBOARD]', err.message);
      res.json({ success: true, leaderboard: [], currentUserRank: null });
    }
  }

  // Called by a daily cron — deduct coins from users who broke streak
  async runDailyPenalty(req, res) {
    // Simple secret check to prevent abuse
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await streakService.penalizeMissedStreaks();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new StreakController();
