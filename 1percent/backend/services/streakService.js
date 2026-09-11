const { adminClient } = require('../config/database');

// How many full calendar days a user can miss before the streak is considered dead.
// 1 = strict daily streak: come back every calendar day or it resets to 1.
// Every "is this streak alive" check in this file goes through _isAlive() so this
// number only ever has to be correct in one place.
const GRACE_DAYS = 1;

// A single missed day resets the streak count (that's the visible, motivating
// consequence) but costs nothing — it only starts costing coins from the
// SECOND consecutive missed day onward. Softens the punishment without
// softening the streak-reset itself.
const FREE_MISS_DAYS = 1;

// The app is Rwanda-only, so "today" for streak purposes means Rwanda's calendar
// day, not the server's UTC day. Named timezone (not a hardcoded +2 offset) so
// this stays correct even if Node ever runs on a host in a different region.
// Rwanda does not observe daylight saving time, so this offset is fixed year-round.
const APP_TIMEZONE = 'Africa/Kigali';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

class StreakService {
  /**
   * Get today's date string in Rwanda local time (YYYY-MM-DD).
   * A lesson finished at 1am Kigali time counts as "today" even though
   * it's still "yesterday" in UTC.
   */
  _today() {
    return dateFormatter.format(new Date());
  }

  /**
   * Normalize a date value coming back from Supabase into a plain YYYY-MM-DD
   * string. Defends against the column ever being read back as a full
   * timestamp (e.g. "2026-09-05T00:00:00.000Z") instead of a bare date,
   * which would otherwise silently turn every diff into NaN and make every
   * streak look "missed 3+ days".
   */
  _normalizeDate(value) {
    if (!value) return null;
    return String(value).split('T')[0];
  }

  /**
   * Difference in calendar days between two YYYY-MM-DD strings (b - a)
   */
  _dayDiff(a, b) {
    const msA = new Date(this._normalizeDate(a) + 'T00:00:00Z').getTime();
    const msB = new Date(this._normalizeDate(b) + 'T00:00:00Z').getTime();
    return Math.round((msB - msA) / 86400000);
  }

  /**
   * A date string N calendar days before Rwanda-local "today". Pure date-math
   * on top of _today(), so it stays consistent with everything else in this
   * file instead of recomputing "yesterday" a different way in UTC.
   */
  _daysAgo(n) {
    const ms = new Date(this._today() + 'T00:00:00Z').getTime() - n * 86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  /**
   * Single source of truth for "is a streak still alive given this gap".
   * diff === null means the user has never been active.
   * diff <= GRACE_DAYS means they're within the allowed grace window.
   */
  _isAlive(diff) {
    return diff !== null && diff <= GRACE_DAYS;
  }

  /**
   * How many days beyond the grace window were missed (0 if still alive),
   * capped at 3 for penalty purposes. Shared by updateStreak and
   * penalizeMissedStreaks so they can't compute different numbers for the
   * same gap.
   */
  _missedDays(diff) {
    if (diff === null) return 0;
    return Math.min(Math.max(0, diff - GRACE_DAYS), 3);
  }

  /**
   * Coin penalty for a given number of missed days. The first FREE_MISS_DAYS
   * are forgiven — the streak still resets, but it doesn't cost coins.
   * Shared by updateStreak and penalizeMissedStreaks so a single missed day
   * can't be charged by one code path and forgiven by the other.
   */
  _penaltyFor(missedDays) {
    if (missedDays <= FREE_MISS_DAYS) return 0;
    return missedDays * 3;
  }

  /**
   * Get user's current streak info
   */
  async getStreak(userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const today = this._today();
    const lastActive = this._normalizeDate(data.last_active_date);
    const diff = lastActive ? this._dayDiff(lastActive, today) : null;

    const isAlive = this._isAlive(diff);
    const streak = isAlive ? (data.streak_count || 0) : 0;

    return {
      streak,
      last_active: lastActive,
      is_active_today: lastActive === today,
      broken: !isAlive && lastActive !== null
    };
  }

  /**
   * Called when user completes a lesson.
   * - If already active today: no-op
   * - If active today or within the grace window: increment streak, award 4 coins
   * - If missed beyond the grace window: reset streak to 1, deduct coins
   */
  async updateStreak(userId) {
    const today = this._today();

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('streak_count, last_active_date')
      .eq('id', userId)
      .single();

    if (error || !profile) return;

    const lastActive = this._normalizeDate(profile.last_active_date);

    // Ignore duplicate activity in the same day.
    if (lastActive === today) return;

    const coinsService = require('./coinsService');
    const diff = lastActive ? this._dayDiff(lastActive, today) : null;

    // Still within the grace window — continue the streak
    if (this._isAlive(diff)) {
      const newStreak = (profile.streak_count || 0) + 1;
      await adminClient.from('profiles')
        .update({ streak_count: newStreak, last_active_date: today })
        .eq('id', userId);

      await coinsService.addCoins(userId, 4, `🔥 Streak day ${newStreak}`).catch(() => {});
      return;
    }

    // Missed beyond the grace window — reset streak
    const newStreak = 1;
    const missedDays = this._missedDays(diff);
    const penalty = this._penaltyFor(missedDays);

    await adminClient.from('profiles')
      .update({ streak_count: newStreak, last_active_date: today })
      .eq('id', userId);

    if (penalty > 0) {
      await coinsService.addCoins(userId, -penalty,
        `💔 Streak broken — missed ${missedDays} day${missedDays > 1 ? 's' : ''}`
      ).catch(() => {});
    }

    await coinsService.addCoins(userId, 4, '🔥 Streak day 1 (restarted)').catch(() => {});
  }

  /**
   * Scheduled job: deduct coins from users who are genuinely past the grace
   * window. Call this once daily (e.g. via a cron endpoint).
   */
  async penalizeMissedStreaks() {
    const today = this._today();
    const yesterday = this._daysAgo(1);

    // Find users who *might* be past the grace window (cheap DB-side prefilter).
    // The authoritative check is _isAlive(diff) below — this filter only
    // needs to be loose enough not to exclude anyone who could still be dead.
    const { data: users } = await adminClient
      .from('profiles')
      .select('id, streak_count, last_active_date')
      .gt('streak_count', 0)
      .lt('last_active_date', yesterday);

    if (!users?.length) return { penalized: 0 };

    const coinsService = require('./coinsService');
    let penalized = 0;

    for (const user of users) {
      const lastActive = this._normalizeDate(user.last_active_date);
      const diff = lastActive ? this._dayDiff(lastActive, today) : null;

      // Use the exact same rule updateStreak/getStreak use. This is the fix:
      // this used to say `if (diff < 2) continue`, which killed streaks a
      // full day earlier than the rest of the app considered them dead.
      if (this._isAlive(diff)) continue;

      const missedDays = this._missedDays(diff);
      if (missedDays === 0) continue;
      const penalty = this._penaltyFor(missedDays);

      // Reset streak
      await adminClient.from('profiles')
        .update({ streak_count: 0 })
        .eq('id', user.id);

      // Deduct coins — waived for a single missed day, see FREE_MISS_DAYS
      if (penalty > 0) {
        await coinsService.addCoins(user.id, -penalty,
          `💔 Streak lost — missed ${missedDays} day${missedDays > 1 ? 's' : ''}`
        ).catch(() => {});
      }

      penalized++;
    }

    return { penalized };
  }
}

module.exports = new StreakService();
