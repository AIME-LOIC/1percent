/**
 * workers/streakCron.js
 *
 * PURPOSE:
 *   Nightly maintenance: expire stale streaks, apply freezes, snapshot
 *   leaderboard ranks, and notify students who have gone silent — so a
 *   learner who stops studying for a while gets a gentle, helpful nudge
 *   rather than silently vanishing.
 *
 * EXPORTS: startStreakCron
 * DEPENDENCIES: node-cron
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const cron = require('node-cron');
const streakService = require('../services/streakService');
const referralNotificationService = require('../services/referralNotificationService');

// Rwanda is UTC+2 and does not observe DST.
// node-cron uses the system timezone by default, but we specify
// Africa/Kigali explicitly so this stays correct even if the
// host machine's TZ is different.
const CRON_EXPRESSION = '10 0 * * *';
const TIMEZONE = 'Africa/Kigali';

// How many calendar days of no activity before we send the "what can we
// do to help you keep learning?" notification.
const INACTIVE_NOTIFY_DAYS = 7;

function startStreakCron() {
  cron.schedule(CRON_EXPRESSION, async () => {
    console.log('[STREAK-CRON] Running daily maintenance at', new Date().toISOString());

    // 1. Streak / coins hygiene.
    try {
      const result = await streakService.penalizeMissedStreaks();
      console.log('[STREAK-CRON] Done. Penalized:', result.penalized);
    } catch (err) {
      console.error('[STREAK-CRON] Streak error:', err.message);
    }

    // 2. Envoyer a friendly, helpful nudge to students who have gone silent.
    try {
      const inactive = await referralNotificationService.checkInactiveStudents({
        graceDays: INACTIVE_NOTIFY_DAYS,
        limit: 200
      });
      if (inactive.notified) {
        console.log(
          `[STREAK-CRON] Notified ${inactive.notified} inactive student(s).`
        );
      }
    } catch (err) {
      console.error('[STREAK-CRON] Inactive-notify error:', err.message);
    }
  }, {
    timezone: TIMEZONE
  });

  console.log(`[STREAK-CRON] Scheduled daily maintenance at 00:10 ${TIMEZONE}`);
}

module.exports = { startStreakCron };
