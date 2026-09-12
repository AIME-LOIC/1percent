/* ============================================================
   Log Service
   ============================================================
   Minimal server-side logging service used by the observability
   routes and admin log endpoints. It writes to Supabase tables if
   available and degrades gracefully if the tables are missing.
   ============================================================ */

const { adminClient } = require('../config/database');

class LogService {
  clientIp(req) {
    if (!req) return null;
    const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']);
    if (forwarded) return Array.isArray(forwarded) ? forwarded[0] : String(forwarded).split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || null;
  }

  /** Emit a live event to all connected admin dashboards (best-effort). */
  _emitAdmins(event, payload) {
    try {
      const { getIo } = require('../config/socket');
      const io = getIo();
      if (io) io.to('admins').emit(event, payload);
    } catch { /* socket not initialized — ignore */ }
  }

  async _insert(table, payload) {
    if (!adminClient) return null;

    try {
      const { data, error } = await adminClient
        .from(table)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn(`[LOGS] ${table} insert failed: ${error.message}`);
        return null;
      }

      return data;
    } catch (err) {
      console.warn(`[LOGS] ${table} insert error: ${err.message}`);
      return null;
    }
  }

  _emitRowLive(table, row) {
    if (!row) return;
    if (table === 'error_logs') this._emitAdmins('admin:error', row);
    if (table === 'admin_alerts') this._emitAdmins('admin:alert', row);
  }

  async logError({
    level = 'error',
    source = 'backend',
    message,
    stack = null,
    errorCode = null,
    path = null,
    url = null,
    userAgent = null,
    ipAddress = null,
    requestId = null,
    userId = null,
    userEmail = null,
    contactEmail = null,
    context = {},
    isClientReported = false
  } = {}) {
    if (!message) return null;

    const row = await this._insert('error_logs', {
      level,
      source,
      message,
      stack,
      error_code: errorCode,
      path,
      url,
      user_agent: userAgent,
      ip_address: ipAddress,
      request_id: requestId,
      user_id: userId,
      user_email: userEmail,
      contact_email: contactEmail,
      context: context || {},
      is_client_reported: !!isClientReported,
      created_at: new Date().toISOString()
    });

    // Live-push new errors to connected admin dashboards.
    this._emitRowLive('error_logs', row);
    return row;
  }

  async logRequestError(req, err, options = {}) {
    const {
      level = 'error',
      statusCode = null,
      path = req?.path || null,
      message = err?.message || 'Unhandled server error'
    } = options;

    const [errorRow, alert] = await Promise.all([
      this.logError({
        level,
        source: 'backend',
        message,
        stack: err?.stack || null,
        path: path || req?.path || null,
        url: req?.originalUrl || null,
        userAgent: req?.headers?.['user-agent'] || null,
        ipAddress: this.clientIp(req),
        requestId: req?.id || req?.headers?.['x-request-id'] || null,
        userId: req?.user?.id || null,
        userEmail: req?.user?.email || null,
        context: {
          statusCode,
          method: req?.method || null,
          route: req?.route?.path || null
        }
      }),
      this.createAdminAlert({
        title: `Server error (${statusCode || 'unknown'})`,
        message: `${message}${statusCode ? ` (${statusCode})` : ''}`,
        type: 'server_error',
        severity: level === 'critical' ? 'critical' : level === 'fatal' ? 'critical' : 'high',
        link: path || req?.path || null,
        source: 'backend',
        metadata: {
          statusCode,
          method: req?.method || null,
          path: path || req?.path || null,
          level
        }
      })
    ]);

    return { errorRow, alert };
  }

  async logEvent({
    level = 'info',
    event,
    message = '',
    source = 'backend',
    userId = null,
    metadata = {}
  } = {}) {
    if (!event) return null;

    return this._insert('system_logs', {
      level,
      event,
      message,
      source,
      user_id: userId,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });
  }

  async createAdminAlert({
    title,
    message = '',
    type = 'info',
    severity = 'low',
    link = null,
    source = 'backend',
    metadata = {}
  } = {}) {
    if (!title) return null;

    const row = await this._insert('admin_alerts', {
      title,
      message,
      type,
      severity,
      link,
      source,
      metadata: metadata || {},
      is_read: false,
      created_at: new Date().toISOString()
    });

    // Live-push new alerts to connected admin dashboards.
    this._emitRowLive('admin_alerts', row);
    return row;
  }
}

module.exports = new LogService();
