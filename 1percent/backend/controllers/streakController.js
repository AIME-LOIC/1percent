const streakService = require('../services/streakService');

class StreakController {
  async getStreak(req, res) {
    try {
      const streak = await streakService.getStreak(req.user.id);
      res.json({ success: true, streak });
    } catch (err) {
      console.error('[STREAK] Get error:', err.message);
      res.json({ success: true, streak: { streak: 0, last_active: null, is_active_today: false } });
    }
  }
}

module.exports = new StreakController();
