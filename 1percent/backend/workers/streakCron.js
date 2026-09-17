/**
 * workers/streakCron.js
 *
 * PURPOSE:
 *   Nightly streak maintenance: expire stale streaks, apply freezes, snapshot leaderboard ranks.
 *
 * EXPORTS: startStreakCron
 * DEPENDENCIES: node-cron
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const cron = require('node-cron');
const streakService = require('../services/streakService');

// Rwanda is UTC+2 and does not observe DST.
// node-cron uses the system timezone by default, but we specify
// Africa/Kigali explicitly so this stays correct even if the
// host machine's TZ is different.
const CRON_EXPRESSION = '10 0 * * *';
const TIMEZONE = 'Africa/Kigali';

function startStreakCron() {
  cron.schedule(CRON_EXPRESSION, async () => {
    console.log('[STREAK-CRON] Running daily penalty at', new Date().toISOString());
    try {
      const result = await streakService.penalizeMissedStreaks();
      console.log('[STREAK-CRON] Done. Penalized:', result.penalized);
    } catch (err) {
      console.error('[STREAK-CRON] Error:', err.message);
    }
  }, {
    timezone: TIMEZONE
  });

  console.log(`[STREAK-CRON] Scheduled daily penalty at 00:10 ${TIMEZONE}`);
}

module.exports = { startStreakCron };
