/**
 * controllers/referralController.js
 *
 * PURPOSE:
 *   HTTP layer for referrals (where did a student/mentor hear about the
 *   program). Only used admin-side.
 *
 * ENDPOINTS:
 *   GET /api/referrals
 *     List all recorded referrals (source + source URL) grouped per user.
 *
 * EXPORTS: referralController (singleton)
 */

const referralService = require('../services/referralService');

class ReferralController {
  async getAllReferrals(req, res) {
    try {
      const { data, error } = await adminClient
        .from('referral_links')
        .select('id, user_id, source, source_url, clicked_at')
        .order('clicked_at', { ascending: false });

      if (error) throw error;

      // Group by user for a compact admin view.
      const byUser = new Map();
      for (const r of (data || [])) {
        const u = byUser.get(r.user_id) || [];
        u.push({ id: r.id, source: r.source, source_url: r.source_url, clicked_at: r.clicked_at });
        byUser.set(r.user_id, u);
      }

      res.json({
        success: true,
        referralsByUser: Object.fromEntries(byUser),
        total: data?.length || 0
      });
    } catch (err) {
      console.error('[REFERRAL] admin list error:', err.message);
      res.status(500).json({ error: 'Failed to load referrals.' });
    }
  }
}

module.exports = new ReferralController();
