/* ============================================================
   Challenges Controller
   ============================================================ */

const { adminClient } = require('../config/database');

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

      // Simple output comparison (extend with worker evaluator for DOM challenges)
      let passed = false;
      let output = '';
      let errorMsg = '';

      try {
        const logs = [];
        const fakeConsole = {
          log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
        };
        const fn = new Function('console', code);
        fn(fakeConsole);
        output = logs.join('\n');
        passed = challenge.expected_output
          ? output.trim() === challenge.expected_output.trim()
          : true;
      } catch (e) {
        errorMsg = e.message;
        passed = false;
      }

      // Upsert submission
      await adminClient.from('challenge_submissions').upsert({
        user_id: req.user.id,
        challenge_id: id,
        code,
        passed
      }, { onConflict: 'user_id,challenge_id' });

      // Award coins on first pass
      if (passed) {
        const { data: existing } = await adminClient
          .from('challenge_submissions')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('challenge_id', id)
          .eq('passed', true)
          .limit(1);

        if (!existing || existing.length <= 1) {
          await adminClient.from('coin_transactions').insert({
            user_id: req.user.id,
            amount: challenge.coins_reward,
            reason: `Challenge: ${challenge.title}`,
            reference_id: id
          });
          await adminClient.rpc('increment_coins', {
            p_user_id: req.user.id,
            p_amount: challenge.coins_reward
          }).catch(() => {});
        }
      }

      res.json({ success: true, passed, output, error: errorMsg });
    } catch (err) {
      console.error('[CHALLENGES] Submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit challenge.' });
    }
  }
}

module.exports = new ChallengesController();
