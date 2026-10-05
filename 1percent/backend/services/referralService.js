/**
 * services/referralService.js
 *
 * PURPOSE:
 *   Track where new students heard about 1% Learn, log the source + source
 *   URL, and attach the referral to their profile. All mutations go through
 *   this service so the intake routes stay thin.
 *
 * DATA MODEL:
 *   profiles: referral_source (text), referral_source_url (text)
 *   referral_links: id, user_id, source, source_url, clicked_at
 *
 * EXPORTS: referralService (singleton)
 */

const { adminClient } = require('../config/database');

class ReferralService {
  /* ---------- public intake: entrypoint for signup/landing pages ---------- */

  /**
   * Record where a new student heard about us.
   * Safe to call from the web/guest path; the DB insert is best-effort
   * (never blocks signup).
   */
  async recordReferral({ userId, source, sourceUrl }) {
    source = (source || '').toString().trim().slice(0, 80) || null;
    sourceUrl = (sourceUrl || '').toString().trim().slice(0, 500) || null;

    if (userId) {
      try {
        await adminClient.from('profiles').update({
          referral_source: source,
          referral_source_url: sourceUrl
        }).eq('id', userId);
      } catch (e) {
        console.warn('[REFERRAL] profile update failed:', e.message);
      }
    }

    if (source || sourceUrl) {
      try {
        await adminClient
          .from('referral_links')
          .insert({ user_id: userId, source, source_url: sourceUrl });
      } catch (e) {
        console.warn('[REFERRAL] referral_links insert failed:', e.message);
      }
    }

    return { success: true };
  }
}

module.exports = new ReferralService();
