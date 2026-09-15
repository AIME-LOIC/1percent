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
      // Attach the grader's feedback so the UI can show WHY it failed
      if (!result.passed && coinsService._lastRejectReason) {
        result.reason = coinsService._lastRejectReason;
        coinsService._lastRejectReason = null;
      }
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

  /** GET /api/coins/hints/status — free hints left this month + cost */
  async getHintStatus(req, res) {
    try {
      const status = await coinsService.getHintStatus(req.user.id);
      const coins = await coinsService.getBalance(req.user.id);
      res.json({ success: true, ...status, coins });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load hint status.' });
    }
  }

  /** GET /api/coins/challenges/:challengeId/hints — unlocked hints only */
  async getUnlockedHints(req, res) {
    try {
      const hints = await coinsService.getUnlockedHints(req.user.id, req.params.challengeId);
      res.json({ success: true, hints });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load hints.' });
    }
  }

  /**
   * POST /api/coins/challenges/:challengeId/hints/reveal
   * Body: { hint_index }. Uses a free monthly hint first, then coins.
   */
  async revealHint(req, res) {
    try {
      const { hint_index } = req.body || {};
      const result = await coinsService.revealHint(req.user.id, req.params.challengeId, hint_index);
      res.json({ success: true, ...result });
    } catch (err) {
      if (err.code === 'INSUFFICIENT_COINS') {
        return res.status(402).json({ error: err.message, code: err.code });
      }
      const status = err.status || (err.message?.includes('not found') ? 404 : 500);
      res.status(status).json({ error: err.message || 'Failed to reveal hint.' });
    }
  }
}

module.exports = new CoinsController();
