/**
 * controllers/logController.js
 *
 * PURPOSE:
 *   HTTP layer for error/system logs (admin): list/filter, resolve with note, and the public
 *   client-error report endpoint (rate-limited, fingerprinted).
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const logService = require('../services/logService');
const observabilityService = require('../services/observabilityService');

class LogController {
  /* ==========================================================
     CLIENT-FACING (reporting)
     ========================================================== */

  /**
   * POST /api/logs/error
   * A user (or client) reports an error they hit so support can help.
   */
  async reportClientError(req, res) {
    try {
      const {
        message,
        stack,
        level = 'error',
        source = 'frontend',
        error_code: errorCode = null,
        path: reportedPath = null,
        url = null,
        contact_email: contactEmail = null,
        context = {}
      } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A message is required' });
      }

      const row = await logService.logError({
        level: ['error', 'warning', 'fatal'].includes(level) ? level : 'error',
        source: ['frontend', 'cli', 'vscode', 'worker'].includes(source) ? source : 'frontend',
        message,
        stack: stack || null,
        errorCode,
        path: reportedPath || req.path,
        url,
        userAgent: req.headers['user-agent'],
        ipAddress: logService.clientIp(req),
        requestId: req.headers['x-request-id'] || null,
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        contactEmail,
        context,
        isClientReported: true
      });

      // Always answer 202 — logging must never break the client.
      res.status(202).json({ success: true, id: row?.id || null });
    } catch (err) {
      console.error('[LOGS] reportClientError error:', err.message);
      res.status(202).json({ success: true, id: null });
    }
  }

  /**
   * POST /api/logs/event
   * Client reports a notable interaction/event (page error boundary hit,
   * feature used, etc.) for the activity log.
   */
  async reportClientEvent(req, res) {
    try {
      const { event, message = '', metadata = {}, level = 'info' } = req.body;

      if (!event || typeof event !== 'string') {
        return res.status(400).json({ error: 'An event name is required' });
      }

      await logService.logEvent({
        level: ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info',
        event,
        message,
        source: 'frontend',
        userId: req.user?.id || null,
        metadata
      });

      res.status(202).json({ success: true });
    } catch (err) {
      console.error('[LOGS] reportClientEvent error:', err.message);
      res.status(202).json({ success: true });
    }
  }

  /**
   * POST /api/logs/bug
   * User-submitted bug report from the "Report a Bug" UI. Filed as a
   * client-reported error log + a medium-severity admin alert so it
   * surfaces in the admin panel immediately (not buried in errors).
   */
  async reportBug(req, res) {
    try {
      const { description, page = null, expected = null, actual = null } = req.body || {};

      if (!description || typeof description !== 'string' || description.trim().length < 5) {
        return res.status(400).json({ error: 'Please describe the bug (at least a few words).' });
      }

      const userEmail = req.user?.email || null;
      const rows = [
        `What happened: ${description.trim()}`,
        expected ? `Expected: ${expected}` : null,
        actual ? `Actual result: ${actual}` : null,
        `Page: ${page || req.get('referer') || req.headers.origin || 'unknown'}`
      ].filter(Boolean);

      const message = `🐞 Bug report: ${description.trim().slice(0, 300)}`;

      const [row] = await Promise.all([
        logService.logError({
          level: 'warning',
          source: 'frontend',
          message,
          path: page || req.path,
          url: req.get('referer') || null,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: logService.clientIp(req),
          userId: req.user?.id || null,
          userEmail,
          context: { expected, actual, page },
          isClientReported: true
        }),
        logService.createAdminAlert({
          title: `🐞 Bug report${userEmail ? ` — ${logService.maskEmail(userEmail)}` : ''}`,
          message: rows.join('\n'),
          type: 'warning',
          severity: 'medium',
          link: page || null,
          source: 'user-report',
          metadata: { userId: req.user?.id || null, page }
        })
      ]);

      res.status(201).json({ success: true, id: row?.id || null });
    } catch (err) {
      console.error('[LOGS] reportBug error:', err.message);
      res.status(500).json({ error: 'Failed to submit bug report. Please try again.' });
    }
  }

  /* ==========================================================
     ADMIN — ERRORS
     ========================================================== */

  async getErrors(req, res) {
    try {
      const { level, source, resolved, user_id, search, since, limit, offset } = req.query;
      const result = await observabilityService.listErrors({
        level, source, resolved, userId: user_id, search, since, limit, offset
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[LOGS] getErrors error:', err.message);
      res.status(500).json({ error: 'Failed to load error logs' });
    }
  }

  async getErrorGroups(req, res) {
    try {
      const { limit } = req.query;
      const result = await observabilityService.listErrorGroups({ limit });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[LOGS] getErrorGroups error:', err.message);
      res.status(500).json({ error: 'Failed to load error groups' });
    }
  }

  async getError(req, res) {
    try {
      const error = await observabilityService.getError(req.params.id);
      res.json({ success: true, error });
    } catch (err) {
      console.error('[LOGS] getError error:', err.message);
      res.status(404).json({ error: 'Error log not found' });
    }
  }

  async resolveError(req, res) {
    try {
      const { resolved = true, note } = req.body;
      const error = await observabilityService.updateErrorStatus(req.params.id, {
        resolved,
        note,
        adminId: req.user?.id
      });
      res.json({ success: true, error });
    } catch (err) {
      console.error('[LOGS] resolveError error:', err.message);
      res.status(500).json({ error: 'Failed to update error log' });
    }
  }

  async deleteError(req, res) {
    try {
      await observabilityService.deleteError(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[LOGS] deleteError error:', err.message);
      res.status(500).json({ error: 'Failed to delete error log' });
    }
  }

  /* ==========================================================
     ADMIN — SYSTEM LOGS
     ========================================================== */

  async getSystemLogs(req, res) {
    try {
      const { level, event, user_id, search, since, limit, offset } = req.query;
      const result = await observabilityService.listSystemLogs({
        level, event, userId: user_id, search, since, limit, offset
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[LOGS] getSystemLogs error:', err.message);
      res.status(500).json({ error: 'Failed to load system logs' });
    }
  }

  /* ==========================================================
     ADMIN — ALERTS
     ========================================================== */

  async getAlerts(req, res) {
    try {
      const { type, severity, read, limit, offset } = req.query;
      const result = await observabilityService.listAlerts({
        type, severity, read, limit, offset
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[LOGS] getAlerts error:', err.message);
      res.status(500).json({ error: 'Failed to load admin alerts' });
    }
  }

  async markAlertRead(req, res) {
    try {
      const alert = await observabilityService.markAlertRead(req.params.id, req.user?.id);
      res.json({ success: true, alert });
    } catch (err) {
      console.error('[LOGS] markAlertRead error:', err.message);
      res.status(500).json({ error: 'Failed to mark alert as read' });
    }
  }

  async markAllAlertsRead(req, res) {
    try {
      const result = await observabilityService.markAllAlertsRead(req.user?.id);
      res.json(result);
    } catch (err) {
      console.error('[LOGS] markAllAlertsRead error:', err.message);
      res.status(500).json({ error: 'Failed to mark alerts as read' });
    }
  }

  async deleteAlert(req, res) {
    try {
      await observabilityService.deleteAlert(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[LOGS] deleteAlert error:', err.message);
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  }

  /* ==========================================================
     ADMIN — STATS + MANUAL EVENT/ALERT CREATION
     ========================================================== */

  async getStats(req, res) {
    try {
      const { since } = req.query;
      const stats = await observabilityService.getStats({ since });
      res.json({ success: true, stats });
    } catch (err) {
      console.error('[LOGS] getStats error:', err.message);
      res.status(500).json({ error: 'Failed to load stats' });
    }
  }

  /** POST /api/admin/logs/events — admin records a manual system event. */
  async createEvent(req, res) {
    try {
      const { event, message = '', level = 'info', metadata = {} } = req.body;
      if (!event) return res.status(400).json({ error: 'event is required' });

      const row = await logService.logEvent({
        event,
        message,
        level,
        source: 'backend',
        userId: req.user?.id || null,
        metadata
      });
      res.status(201).json({ success: true, log: row });
    } catch (err) {
      console.error('[LOGS] createEvent error:', err.message);
      res.status(500).json({ error: 'Failed to create system log' });
    }
  }

  /** POST /api/admin/logs/alerts — admin raises a manual alert. */
  async createAlert(req, res) {
    try {
      const { title, message = '', type = 'info', severity = 'low', link = null, metadata = {} } = req.body;
      if (!title) return res.status(400).json({ error: 'title is required' });

      const alert = await logService.createAdminAlert({
        title,
        message,
        type,
        severity,
        link,
        source: 'backend',
        metadata
      });
      res.status(201).json({ success: true, alert });
    } catch (err) {
      console.error('[LOGS] createAlert error:', err.message);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
}

module.exports = new LogController();
