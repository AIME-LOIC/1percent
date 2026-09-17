/**
 * controllers/challengesController.js
 *
 * PURPOSE:
 *   HTTP layer for challenges: list by course, detail (without answers), submission handling that
 *   routes into the coinsService grading cascade.
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient } = require('../config/database');
const coinsService = require('../services/coinsService');

class ChallengesController {
  /**
   * GET /api/challenges
   * List all active challenges (auth required)
   */
  async list(req, res) {
    try {
      const { data, error } = await adminClient
        .from('challenges')
        .select('id, title, description, difficulty, challenge_type, coins_reward, sort_order, starter_code, expected_output')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      res.json({ success: true, challenges: data || [] });
    } catch (err) {
      console.error('[CHALLENGES] List error:', err.message);
      res.status(500).json({ error: 'Failed to load challenges.' });
    }
  }

  /**
   * POST /api/challenges/:id/submit
   * Submit a solution (auth required)
   */
  async submit(req, res) {
    try {
      const { id } = req.params;
      const { code } = req.body;

      if (!code) return res.status(400).json({ error: 'Code is required.' });

      // Fetch challenge
      const { data: challenge, error: fetchErr } = await adminClient
        .from('challenges')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (fetchErr || !challenge) return res.status(404).json({ error: 'Challenge not found.' });

      // ALREADY PASSED — idempotent: never re-grade, never re-award coins.
      const { data: existingPass } = await adminClient
        .from('challenge_submissions')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('challenge_id', id)
        .eq('passed', true)
        .limit(1);
      if (existingPass && existingPass.length) {
        return res.json({ success: true, passed: true, already: true, coins: 0 });
      }

      // Grade through the SAME sandboxed evaluator the playground uses
      // (VM worker for JS, python3 subprocess, SQLite for SQL) — never a
      // bare `new Function` on the server, which executed student code
      // with full Node privileges and defaulted to pass on empty output.
      let passed = false;
      let reason = '';
      try {
        passed = await coinsService._evaluateCode(code, challenge);
        reason = (passed ? '' : (coinsService._lastRejectReason || ''));
        coinsService._lastRejectReason = null;
      } catch (e) {
        console.error('[CHALLENGES] Evaluator error:', e.message);
        passed = false;
        reason = 'Grading failed — please try again.';
      }

      // Save the attempt (upsert keeps one row per user/challenge)
      await adminClient.from('challenge_submissions').upsert({
        user_id: req.user.id,
        challenge_id: id,
        code,
        passed
      }, { onConflict: 'user_id,challenge_id' });

      // Award coins ONLY on a genuine pass — and only once (the
      // already-passed guard above makes re-awards impossible).
      let coinsAwarded = 0;
      if (passed) {
        coinsAwarded = challenge.coins_reward || 0;
        try {
          await adminClient.from('coin_transactions').insert({
            user_id: req.user.id,
            amount: coinsAwarded,
            reason: `Challenge: ${challenge.title}`,
            reference_id: id
          });
        } catch (e) {
          console.warn('[CHALLENGES] Coin insert failed:', e.message);
          coinsAwarded = 0;
        }
        try {
          const { data: profile } = await adminClient
            .from('profiles').select('coins').eq('id', req.user.id).single();
          await adminClient.from('profiles').update({ coins: (profile?.coins || 0) + coinsAwarded })
            .eq('id', req.user.id);
        } catch { /* balance update best-effort */ }
      }

      res.json({ success: true, passed, reason, coins: coinsAwarded });
    } catch (err) {
      console.error('[CHALLENGES] Submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit challenge.' });
    }
  }
}

module.exports = new ChallengesController();
