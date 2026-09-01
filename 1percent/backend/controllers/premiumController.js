const premiumService = require('../services/premiumService');

class PremiumController {
  /**
   * GET /api/premium/tiers
   * Get all available subscription tiers (public)
   */
  async getTiers(req, res) {
    try {
      const tiers = await premiumService.getTiers();
      res.json({ success: true, tiers });
    } catch (err) {
      console.error('[PREMIUM] Tiers error:', err.message);
      res.status(500).json({ error: 'Failed to load tiers.' });
    }
  }

  /**
   * GET /api/premium/status
   * Get current user's subscription status
   */
  async getStatus(req, res) {
    try {
      const status = await premiumService.getUserTier(req.user.id);
      res.json({ success: true, ...status });
    } catch (err) {
      console.error('[PREMIUM] Status error:', err.message);
      res.json({ success: true, tier: { slug: 'free', name: 'Free Starter', daily_downloads: 1 }, downloads_today: 0, daily_limit: 1, downloads_remaining: 1, can_download: true, can_download_course: false });
    }
  }

  /**
   * POST /api/premium/subscribe
   * Activate a subscription tier
   */
  async subscribe(req, res) {
    try {
      const { tier_slug, months = 1 } = req.body;
      if (!tier_slug) return res.status(422).json({ error: 'tier_slug is required' });

      const result = await premiumService.activateSubscription(req.user.id, tier_slug, months);

      // Award coins: Starter=20, Pro=50, Unlimited=100
      const coinRewards = { starter: 20, pro: 50, unlimited: 100 };
      const coins = coinRewards[tier_slug] || 0;
      if (coins > 0) {
        try {
          const coinsService = require('../services/coinsService');
          await coinsService.addCoins(req.user.id, coins, `Premium: ${result.tier.name}`);
        } catch (e) { console.warn('[COINS] Could not award subscription coins:', e.message); }
      }

      res.json({ success: true, message: `Subscribed to ${result.tier.name}`, coins_awarded: coins, ...result });
    } catch (err) {
      console.error('[PREMIUM] Subscribe error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to subscribe.' });
    }
  }

  /**
   * POST /api/premium/free-trial
   * Activate free starter week
   */
  async freeTrial(req, res) {
    try {
      // 1 week free trial of Starter tier
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { adminClient } = require('../config/database');

      // Check if already used
      const { data: existing } = await adminClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', req.user.id)
        .limit(1)
        .single();

      if (existing) return res.status(409).json({ error: 'Free trial already activated.' });

      // Deactivate old subs
      await adminClient
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', req.user.id)
        .eq('is_active', true);

      // Create trial subscription
      const { data: sub, error } = await adminClient
        .from('user_subscriptions')
        .insert({
          user_id: req.user.id,
          tier_slug: 'starter',
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Award 10 coins for free trial
      try {
        const coinsService = require('../services/coinsService');
        await coinsService.addCoins(req.user.id, 10, 'Free trial activated');
      } catch (e) { console.warn('[COINS] Could not award trial coins:', e.message); }

      res.json({
        success: true,
        message: 'Free trial activated! You have 7 days of Starter tier.',
        subscription: sub,
        expires_at: expiresAt.toISOString(),
        coins_awarded: 10
      });
    } catch (err) {
      console.error('[PREMIUM] Free trial error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to activate trial.' });
    }
  }
}

module.exports = new PremiumController();
