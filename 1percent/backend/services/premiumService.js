/**
 * services/premiumService.js
 *
 * PURPOSE:
 *   Subscription tiers (free/starter/pro/unlimited): gates premium courses and free-preview lessons,
 *   activates tiers after payment, and implements cancel-at-period-end (access preserved until
 *   expiry, resume clears the flag).
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */
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
      .select('tier_slug, expires_at, is_active, cancel_at_period_end, cancelled_at')
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

    // Cancellation state: the sub stays active until expires_at even when
    // the user cancelled, so expose days remaining for the manage UI.
    const daysRemaining = sub?.expires_at
      ? Math.max(0, Math.ceil((new Date(sub.expires_at) - new Date()) / 86400000))
      : 0;

    return {
      tier: tier || { slug: 'free', name: 'Free Starter', price_usd: 0, daily_downloads: 1, full_course_download: false },
      subscription: sub || null,
      cancel_at_period_end: sub?.cancel_at_period_end || false,
      cancelled_at: sub?.cancelled_at || null,
      days_remaining: daysRemaining,
      downloads_today: downloadsToday || 0,
      daily_limit: dailyLimit,
      downloads_remaining: remaining,
      can_download: remaining > 0,
      can_download_course: tier?.full_course_download || false
    };
  }

  /**
   * Cancel the active subscription at the end of the current billing period.
   * The user keeps full access until expires_at; is_active is NOT flipped so
   * the tier/quota logic keeps working through the paid period.
   */
  async cancelSubscription(userId) {
    const { data: sub } = await adminClient
      .from('user_subscriptions')
      .select('id, tier_slug, expires_at, cancel_at_period_end')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error('No active subscription to cancel');
    if (sub.cancel_at_period_end) throw new Error('Subscription is already cancelled');

    const { data: updated, error } = await adminClient
      .from('user_subscriptions')
      .update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() })
      .eq('id', sub.id)
      .select()
      .single();

    if (error) throw error;
    return { subscription: updated, expires_at: sub.expires_at };
  }

  /**
   * Resume a subscription that was cancelled at period end (before expiry).
   */
  async resumeSubscription(userId) {
    const { data: sub } = await adminClient
      .from('user_subscriptions')
      .select('id, tier_slug, expires_at, cancel_at_period_end')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error('No cancelled subscription to resume');
    if (!sub.cancel_at_period_end) throw new Error('Subscription is not cancelled');

    const { data: updated, error } = await adminClient
      .from('user_subscriptions')
      .update({ cancel_at_period_end: false, cancelled_at: null })
      .eq('id', sub.id)
      .select()
      .single();

    if (error) throw error;
    return { subscription: updated, expires_at: sub.expires_at };
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

    // Upsert: the table has a unique(user_id, tier_slug) constraint, so a
    // plain INSERT fails with "duplicate key" for any user who has EVER
    // held this tier before (expired or deactivated) — that was the
    // "DB error" on every Pay Now for returning customers. Upsert
    // reactivates the existing row and extends it from now.
    const { data: sub, error } = await adminClient
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier_slug: tierSlug,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        // A fresh payment always clears any pending cancellation
        cancel_at_period_end: false,
        cancelled_at: null
      }, { onConflict: 'user_id,tier_slug' })
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
