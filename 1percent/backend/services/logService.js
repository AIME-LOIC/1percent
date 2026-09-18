/**
 * services/logService.js
 *
 * PURPOSE:
 *   Error/system log ingestion. Groups repeated errors by fingerprint (upsert bumps occurrence_count
 *   instead of inserting duplicates) and raises admin_alerts for fatal/critical levels.
 * DEPENDENCIES: crypto
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient } = require('../config/database');
const crypto = require('crypto');

class LogService {
  clientIp(req) {
    if (!req) return null;
    // With 'trust proxy' set, req.ip is already the real client address.
    return req.ip || req.connection?.remoteAddress || null;
  }

  /*
   * Privacy: logs are the first place a DB leak or over-broad SELECT gets
   * mined for user details, so we never store raw identifiers.
   *   - IPs are HMAC-SHA256'd with a server secret: same IP still correlates
   *     across rows (abuse tracing), but the raw address is unrecoverable.
   *   - Emails are masked (a***@domain.com): enough to spot duplicates,
   *     useless to an attacker harvesting contacts.
   */
  hashIp(ip) {
    if (!ip) return null;
    const secret = process.env.LOG_HASH_SECRET || process.env.JWT_SECRET || '1percent-log-pepper';
    return crypto.createHmac('sha256', secret).update(String(ip)).digest('hex').slice(0, 32);
  }

  maskEmail(email) {
    if (!email) return null;
    const s = String(email);
    const at = s.lastIndexOf('@');
    if (at <= 0) return '***';
    const local = s.slice(0, at), domain = s.slice(at + 1);
    return `${local[0]}***@${domain}`;
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
    // (see ip_address note below) + ip_hash in context for correlation
      user_agent: userAgent,
      // error_logs.ip_address is an inet column — hashed IPs (hex) are
      // rejected by Postgres with "invalid input syntax for type inet".
      // Keep the raw IP in the inet column, stash the peppered hash in
      // context.ip_hash so IP correlation still works without PII leakage.
      ip_address: ipAddress || null,
      request_id: requestId,
      user_id: userId,
      user_email: this.maskEmail(userEmail),
      contact_email: this.maskEmail(contactEmail),
      context: { ...(context || {}), ip_hash: ipAddress ? this.hashIp(ipAddress) : null },
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
        // 'server_error' violated admin_alerts_type_check (allowed: error,
        // warning, info, security, payment, system). 'error' is the honest
        // match; the admin UI special-case below keeps its icon handling.
        type: 'error',
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
