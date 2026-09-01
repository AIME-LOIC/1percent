const coinsService = require('../services/coinsService');

class CoinsController {
  async getBalance(req, res) {
    try {
      const coins = await coinsService.getBalance(req.user.id);
      res.json({ success: true, coins });
    } catch (err) {
      res.json({ success: true, coins: 0 });
    }
  }

  async getTransactions(req, res) {
    try {
      const txs = await coinsService.getTransactions(req.user.id);
      res.json({ success: true, transactions: txs });
    } catch (err) {
      res.json({ success: true, transactions: [] });
    }
  }

  async getAllChallenges(req, res) {
    try {
      const challenges = await coinsService.getAllChallenges();
      const passed = req.user?.id ? await coinsService.getUserPassedChallenges(req.user.id) : [];
      res.json({ success: true, challenges, passed });
    } catch (err) {
      console.error('getAllChallenges error:', err.message);
      res.json({ success: true, challenges: [], passed: [] });
    }
  }

  async getChallenges(req, res) {
    try {
      const { courseId } = req.params;
      const challenges = await coinsService.getChallenges(courseId);
      const passed = await coinsService.getUserSubmissions(req.user?.id, courseId);
      res.json({ success: true, challenges, passed });
    } catch (err) {
      res.json({ success: true, challenges: [], passed: [] });
    }
  }

  async submitChallenge(req, res) {
    try {
      const { challengeId } = req.params;
      const { code, is_daily } = req.body;
      if (!code) return res.status(422).json({ error: 'Code is required' });

      const result = await coinsService.submitChallenge(req.user.id, challengeId, code, is_daily);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async searchChallenges(req, res) {
    try {
      const { q, difficulty, course_id, page, limit } = req.query;
      const result = await coinsService.searchChallenges({
        query: q || '',
        difficulty: difficulty || '',
        course_id: course_id || '',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('searchChallenges error:', err.message);
      res.json({ success: true, challenges: [], total: 0, page: 1, pages: 0 });
    }
  }

  async getDailyChallenge(req, res) {
    try {
      const daily = await coinsService.getDailyChallenge();
      if (!daily) return res.json({ success: false, error: 'No challenges available' });

      // Check if user already completed today's daily challenge
      let completed = false;
      if (req.user?.id) {
        const passed = await coinsService.getUserPassedChallenges(req.user.id);
        completed = passed.includes(daily.id);
      }

      res.json({ success: true, daily, completed });
    } catch (err) {
      console.error('getDailyChallenge error:', err.message);
      res.json({ success: false, error: 'Failed to load daily challenge' });
    }
  }

  async unlockLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const result = await coinsService.unlockLesson(req.user.id, lessonId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(403).json({ error: err.message });
    }
  }

  async checkLessonLock(req, res) {
    try {
      const { lessonId } = req.params;
      const locked = await coinsService.isLessonLocked(req.user.id, lessonId);
      const coins = await coinsService.getBalance(req.user.id);
      const { data: lock } = await require('../config/database').adminClient
        .from('lesson_locks').select('coins_required').eq('lesson_id', lessonId).single();
      res.json({ success: true, locked, coins, cost: lock?.coins_required || 0 });
    } catch (err) {
      res.json({ success: true, locked: false, coins: 0, cost: 0 });
    }
  }
}

module.exports = new CoinsController();
