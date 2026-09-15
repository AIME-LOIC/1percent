const streakService = require('../services/streakService');
const { adminClient } = require('../config/database');

class StreakController {
  async getStreak(req, res) {
    try {
      const streak = await streakService.getStreak(req.user.id);
      res.json({ success: true, streak });
    } catch (err) {
      res.json({ success: true, streak: { streak: 0, last_active: null, is_active_today: false } });
    }
  }

  async getLeaderboard(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const type = req.query.type || 'coins'; // 'coins' or 'streak'

      const column = type === 'streak' ? 'streak_count' : 'coins';

      const { data, error } = await adminClient
        .from('profiles')
        .select('id, full_name, coins, streak_count, avatar_url')
        .order(column, { ascending: false })
        .gt(column, 0)
        .limit(limit);

      if (error) throw error;

      // Which leaderboard users hold an active paid subscription?
      // (One batched query — powers the crown badge in the UI.)
      let premiumIds = new Set();
      if (data && data.length) {
        const { data: subs } = await adminClient
          .from('user_subscriptions')
          .select('user_id')
          .in('user_id', data.map(u => u.id))
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString());
        premiumIds = new Set((subs || []).map(s => s.user_id));
      }

      const board = (data || []).map((u, i) => ({
        rank: i + 1,
        id: u.id,
        name: u.full_name || 'Anonymous',
        coins: u.coins || 0,
        streak: u.streak_count || 0,
        avatar: u.avatar_url || null,
        is_premium: premiumIds.has(u.id),
        isCurrentUser: u.id === req.user?.id
      }));

      // Find current user's rank if not in top N
      let currentUserRank = null;
      if (req.user?.id && !board.find(u => u.isCurrentUser)) {
        const { count } = await adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt(column, (await adminClient.from('profiles').select(column).eq('id', req.user.id).single()).data?.[column] || 0);
        currentUserRank = (count || 0) + 1;
      }

      // ---- Rank movement (green ▲ / red ▼ vs the last snapshot) ----
      let movementByUser = new Map();
      try {
        movementByUser = await this._withRankMovement(board, type, column, req.user?.id, currentUserRank);
      } catch (mvErr) {
        // Movement is cosmetic — never fail the leaderboard over it.
        console.error('[LEADERBOARD] movement:', mvErr.message);
      }

      const boardWithMovement = board.map(u => ({
        ...u,
        rank_change: movementByUser.get(u.id) ?? null
      }));

      res.json({ success: true, leaderboard: boardWithMovement, currentUserRank, type });
    } catch (err) {
      console.error('[LEADERBOARD]', err.message);
      res.json({ success: true, leaderboard: [], currentUserRank: null });
    }
  }

  /**
   * Persist today's ranks as a snapshot, then compute each user's
   * movement vs their most recent snapshot from a PREVIOUS day.
   * rank_change > 0 → climbed (green ▲), < 0 → dropped (red ▼).
   */
  async _withRankMovement(board, type, column, currentUserId, currentUserRank) {
    const today = new Date().toISOString().slice(0, 10);
    const movement = new Map();

    // 1. Upsert today's snapshot for everyone currently on the board.
    const rows = board.map(u => ({
      user_id: u.id,
      board_type: type,
      rank: u.rank,
      score: u[column] || 0,
      snapshot_date: today
    }));
    // Include the current user even when outside the visible top N,
    // so their arrow works from day two.
    if (currentUserId && currentUserRank && !rows.some(r => r.user_id === currentUserId)) {
      const { data: me } = await adminClient.from('profiles').select(column).eq('id', currentUserId).single();
      rows.push({
        user_id: currentUserId,
        board_type: type,
        rank: currentUserRank,
        score: me?.[column] || 0,
        snapshot_date: today
      });
    }
    if (rows.length) {
      const { error: upErr } = await adminClient
        .from('leaderboard_rank_snapshots')
        .upsert(rows, { onConflict: 'user_id,board_type,snapshot_date' });
      if (upErr) throw upErr;
    }

    // 2. Latest snapshot per user from a previous day (batched, bounded).
    const userIds = rows.map(r => r.user_id);
    if (!userIds.length) return movement;
    const { data: history, error: hErr } = await adminClient
      .from('leaderboard_rank_snapshots')
      .select('user_id, rank, snapshot_date')
      .eq('board_type', type)
      .in('user_id', userIds)
      .lt('snapshot_date', today)
      .order('snapshot_date', { ascending: false })
      .limit(1000);
    if (hErr) throw hErr;

    // Rows come sorted by date desc → the first row seen per user is
    // their most recent previous-day rank.
    const seen = new Set();
    for (const h of history || []) {
      if (seen.has(h.user_id)) continue;
      seen.add(h.user_id);
      const current = rows.find(r => r.user_id === h.user_id);
      if (current) movement.set(h.user_id, current.rank - h.rank);
    }
    return movement;
  }

  // Called by a daily cron — deduct coins from users who broke streak
  async runDailyPenalty(req, res) {
    /* Fail CLOSED (red-teamed): the old check `secret !== CRON_SECRET &&
       production` let ANYONE through when CRON_SECRET was unset — the
       comparison with undefined always passed. Now: no secret configured →
       503 (endpoint unusable, not exploitable); secret required in the
       x-cron-secret HEADER only (a query-string secret leaks into proxy
       and access logs); constant-time compare. */
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return res.status(503).json({ error: 'Cron endpoint not configured (CRON_SECRET missing).' });
    }
    const provided = req.headers['x-cron-secret'];
    const a = Buffer.from(String(provided || ''));
    const b = Buffer.from(String(expected));
    const ok = a.length === b.length && require('crypto').timingSafeEqual(a, b);
    if (!ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await streakService.penalizeMissedStreaks();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: 'Penalty run failed.' });
    }
  }
}

module.exports = new StreakController();
