/* ============================================================
   Observability Service
   ============================================================
   Admin-facing read/query operations over the observability
   tables (error_logs, system_logs, admin_alerts).
   ============================================================ */

const { adminClient } = require('../config/database');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

class ObservabilityService {
  _clamp(limit, fallback = DEFAULT_LIMIT) {
    const n = parseInt(limit, 10);
    if (Number.isNaN(n) || n <= 0) return fallback;
    return Math.min(n, MAX_LIMIT);
  }

  _offset(offset) {
    const n = parseInt(offset, 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }

  /* ==========================================================
     ERRORS
     ========================================================== */

  async listErrors(options = {}) {
    const { level, source, resolved, userId, search, since } = options;
    const limit = this._clamp(options.limit);
    const offset = this._offset(options.offset);

    let query = adminClient
      .from('error_logs')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (level) query = query.eq('level', level);
    if (source) query = query.eq('source', source);
    if (userId) query = query.eq('user_id', userId);
    if (resolved === true || resolved === 'true') query = query.eq('is_resolved', true);
    if (resolved === false || resolved === 'false') query = query.eq('is_resolved', false);
    if (since) query = query.gte('created_at', since);
    if (search) query = query.ilike('message', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      errors: data || [],
      total: count || 0,
      limit,
      offset
    };
  }

  async getError(id) {
    const { data, error } = await adminClient
      .from('error_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Resolve/reopen an error and attach a support note.
   */
  async updateErrorStatus(id, { resolved, adminId, note } = {}) {
    const updates = {};

    if (resolved === true || resolved === 'true') {
      updates.is_resolved = true;
      updates.resolved_by = adminId || null;
      updates.resolved_at = new Date().toISOString();
    } else if (resolved === false || resolved === 'false') {
      updates.is_resolved = false;
      updates.resolved_by = null;
      updates.resolved_at = null;
    }

    if (note !== undefined) updates.resolution_note = note;

    const { data, error } = await adminClient
      .from('error_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteError(id) {
    const { error } = await adminClient.from('error_logs').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }

  /** Grouped, unresolved errors — one row per distinct bug. */
  async listErrorGroups(options = {}) {
    const limit = this._clamp(options.limit);
    const { data, error } = await adminClient
      .from('unresolved_error_summary')
      .select('*')
      .limit(limit);

    if (error) {
      // View missing (error.sql not applied) — degrade gracefully.
      return { groups: [] };
    }
    return { groups: data || [] };
  }

  /* ==========================================================
     SYSTEM LOGS
     ========================================================== */

  async listSystemLogs(options = {}) {
    const { level, event, userId, search, since } = options;
    const limit = this._clamp(options.limit, 50);
    const offset = this._offset(options.offset);

    let query = adminClient
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (level) query = query.eq('level', level);
    if (event) query = query.eq('event', event);
    if (userId) query = query.eq('user_id', userId);
    if (since) query = query.gte('created_at', since);
    if (search) query = query.ilike('event', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return { logs: data || [], total: count || 0, limit, offset };
  }

  /* ==========================================================
     ADMIN ALERTS
     ========================================================== */

  async listAlerts(options = {}) {
    const { type, severity, read } = options;
    const limit = this._clamp(options.limit, 50);
    const offset = this._offset(options.offset);

    let query = adminClient
      .from('admin_alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (severity) query = query.eq('severity', severity);
    if (read === true || read === 'true') query = query.eq('is_read', true);
    if (read === false || read === 'false') query = query.eq('is_read', false);

    const { data, error, count } = await query;
    if (error) throw error;

    const { count: unreadCount } = await adminClient
      .from('admin_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    return {
      alerts: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
      limit,
      offset
    };
  }

  async markAlertRead(id, adminId) {
    const { data, error } = await adminClient
      .from('admin_alerts')
      .update({ is_read: true, read_by: adminId || null, read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markAllAlertsRead(adminId) {
    const { error } = await adminClient
      .from('admin_alerts')
      .update({ is_read: true, read_by: adminId || null, read_at: new Date().toISOString() })
      .eq('is_read', false);

    if (error) throw error;
    return { success: true };
  }

  async deleteAlert(id) {
    const { error } = await adminClient.from('admin_alerts').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }

  /* ==========================================================
     STATS (dashboard cards)
     ========================================================== */

  async getStats(options = {}) {
    const since = options.since
      || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const countHead = async (table, apply) => {
      let q = adminClient.from(table).select('*', { count: 'exact', head: true });
      if (apply) q = apply(q);
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    };

    const [
      errors24h,
      errorsTotal,
      unresolvedErrors,
      fatal24h,
      clientReported24h,
      events24h,
      unreadAlerts,
      criticalAlerts
    ] = await Promise.all([
      countHead('error_logs', q => q.gte('created_at', since)),
      countHead('error_logs'),
      countHead('error_logs', q => q.eq('is_resolved', false)),
      countHead('error_logs', q => q.gte('created_at', since).in('level', ['fatal', 'critical'])),
      countHead('error_logs', q => q.gte('created_at', since).eq('is_client_reported', true)),
      countHead('system_logs', q => q.gte('created_at', since)),
      countHead('admin_alerts', q => q.eq('is_read', false)),
      countHead('admin_alerts', q => q.eq('is_read', false).eq('severity', 'critical'))
    ]);

    return {
      windowHours: 24,
      since,
      errors24h,
      errorsTotal,
      unresolvedErrors,
      fatal24h,
      clientReported24h,
      events24h,
      unreadAlerts,
      criticalAlerts
    };
  }
}

module.exports = new ObservabilityService();
