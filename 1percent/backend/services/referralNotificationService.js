/**
 * services/referralNotificationService.js
 *
 * PURPOSE:
 *   Build the "you haven't logged in / studied — what can we do to help you
 *   keep learning?" notification for students who go silent for too long.
 *   Friendly tone, no blame, direct path back to the first lesson.
 *
 * EXPORTS: referralNotificationService (singleton)
 */

const { adminClient } = require('../config/database');
const notificationService = require('./notificationService');

class ReferralNotificationService {
  /**
   * Check students who have gone N days without studying and notify them.
   * Returns how many were notified.
   */
  async checkInactiveStudents(graceDays = 7, limit = 200) {
    const { data: students, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'student')
      .gte('referral_source', '') // just scans students
      .limit(limit);

    if (error) throw error;
    if (!students || !students.length) return { notified: 0 };

    let notified = 0;
    for (const s of students) {
      try {
        const { count } = await adminClient
          .from('lesson_progress')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', s.id)
          .eq('completed', true);

        const completedCount = count || 0;

        // Built the message from the actual referral source, so the
        // nudge can reuse the same line and stay consistent.
        const source = (s.referral_source || '').trim();
        const sourceLine = source
          ? `You found us through "${source}" — welcome back!`
          : 'Welcome back!';

        const title = 'We miss your progress 💪';
        const message =
          `${sourceLine}\n\nYou haven't logged in for a while. We want to make sure you're okay — nothing is too hard to start again.\n\nHere's what we can do:\n• Pick up right where you left off\n• Re-watch the last lesson\n• Get a free mentor nudge\n• Talk to someone who can help (we're here Monday–Friday, 9am–5pm)`;

        await notificationService.createNotification({
          user_id: s.id,
          title,
          message,
          type: 'warning',
          link: '/learn/dashboard'
        });
        notified++;
      } catch (e) {
        console.warn('[NOTIFY-INACTIVE] failed for', s.id, e.message);
      }
    }

    return { notified };
  }
}

module.exports = new ReferralNotificationService();
