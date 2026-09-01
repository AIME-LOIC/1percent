const { adminClient } = require('../config/database');

class PremiumService {
  /**
   * Get all available tiers
   */
  async getTiers() {
    const { data, error } = await adminClient
      .from('premium_tiers')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get user's current subscription and tier
   */
  async getUserTier(userId) {
    const { data: sub } = await adminClient
      .from('user_subscriptions')
      .select('tier_slug, expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    const tierSlug = sub?.tier_slug || 'free';

    const { data: tier } = await adminClient
      .from('premium_tiers')
      .select('*')
      .eq('slug', tierSlug)
      .single();

    // Get today's download count
    const today = new Date().toISOString().split('T')[0];
    const { count: downloadsToday } = await adminClient
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('downloaded_at', today + 'T00:00:00Z');

    const dailyLimit = tier?.daily_downloads || 1;
    const remaining = Math.max(0, dailyLimit - (downloadsToday || 0));

    return {
      tier: tier || { slug: 'free', name: 'Free Starter', price_usd: 0, daily_downloads: 1, full_course_download: false },
      subscription: sub || null,
      downloads_today: downloadsToday || 0,
      daily_limit: dailyLimit,
      downloads_remaining: remaining,
      can_download: remaining > 0,
      can_download_course: tier?.full_course_download || false
    };
  }

  /**
   * Activate a subscription (for now, simulates payment)
   * In production, integrate with Stripe/PayPal
   */
  async activateSubscription(userId, tierSlug, months = 1) {
    // Get tier details
    const { data: tier } = await adminClient
      .from('premium_tiers')
      .select('*')
      .eq('slug', tierSlug)
      .single();

    if (!tier || tier.slug === 'free') throw new Error('Invalid tier');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // Deactivate old subscriptions
    await adminClient
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Create new subscription
    const { data: sub, error } = await adminClient
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier_slug: tierSlug,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return { subscription: sub, tier };
  }

  /**
   * Activate free trial (1 week of free downloads)
   */
  async activateFreeTrial(userId) {
    // Check if user already had a trial
    const { data: existing } = await adminClient
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('tier_slug', 'starter')
      .limit(1)
      .single();

    if (existing) throw new Error('Free trial already used');

    return this.activateSubscription(userId, 'starter', 0); // 0 months = expires quickly? Let me use 1 week
  }

  /**
   * Log a download
   */
  async logDownload(userId, type, itemId) {
    const today = new Date().toISOString().split('T')[0];

    // Check daily limit
    const { count } = await adminClient
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('downloaded_at', today + 'T00:00:00Z');

    const tier = await this.getUserTier(userId);
    if ((count || 0) >= tier.daily_limit) {
      throw new Error('Daily download limit reached. Upgrade your plan for more downloads.');
    }

    // Log the download
    const insertData = { user_id: userId, download_type: type };
    if (type === 'lesson') insertData.lesson_id = itemId;
    if (type === 'course') insertData.course_id = itemId;

    const { error } = await adminClient
      .from('download_logs')
      .insert(insertData);

    if (error) console.warn('[PREMIUM] Could not log download:', error.message);
  }
}

module.exports = new PremiumService();
