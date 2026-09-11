/* ============================================================
   Onboarding Notification Worker
   ============================================================
   Sends a "complete your profile" notification to existing users
   who haven't finished onboarding. Can be called via API or cron.
   ============================================================ */

const { adminClient } = require('../config/database');
const notificationService = require('../services/notificationService');

async function notifyIncompleteOnboarding() {
  // Find users who haven't completed onboarding
  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id')
    .or('onboarding_completed.is.null,onboarding_completed.eq.false');

  if (error) throw error;
  if (!users?.length) return { notified: 0 };

  let notified = 0;
  for (const user of users) {
    try {
      // Check if user already has a recent onboarding notification
      const { data: existing } = await adminClient
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', 'Complete Your Profile')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing?.length) continue; // Skip — already notified this week

      await notificationService.createNotification({
        user_id: user.id,
        title: 'Complete Your Profile',
        message: 'Tell us more about yourself so we can personalize your learning experience and recommend the right courses for you.',
        type: 'info',
        link: '/onboarding'
      });
      notified++;
    } catch (e) {
      console.warn('[ONBOARD-NOTIFY] Failed for user:', user.id, e.message);
    }
  }

  return { notified };
}

module.exports = { notifyIncompleteOnboarding };
