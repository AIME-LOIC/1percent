/* ============================================================
   Student MCP Routes — "Connect to Claude" for students
   ============================================================
   TWO routers (mounted separately in index.js):

   1) studentMcpTokenRoutes — token management, mounted at /api/mcp
        GET    /api/mcp/student/status    → non-secret token status
        POST   /api/mcp/student/token     → generate/rotate (shown ONCE)
        DELETE /api/mcp/student/token     → revoke

   2) studentMcpRpcRoutes — MCP over Streamable HTTP, mounted at /mcp/student/:token?
        POST /mcp/student/<token>        → JSON-RPC, read-only student tools
        GET  /mcp/student/<token>        → 405 (stateless, no SSE)
   ============================================================ */

const express = require('express');
const { adminClient } = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const studentMcpService = require('../services/studentMcpService');
const mcpOAuthService = require('../services/mcpOAuthService');
const logService = require('../services/logService');
const { handleStudentRpcMessage, SERVER_INFO, STUDENT_TOOLS } = require('../mcp/studentCore');
const { TOOLS: ADMIN_TOOLS, handleRpcMessage: handleAdminRpc } = require('../mcp/core');

/* The 'admin' scope (server-granted when the approver's profiles.role
   is admin) unlocks the admin platform tools from backend/mcp/core.js
   — the same toolset the stdio Claude Desktop server exposes — served
   over this endpoint so claude.ai needs only one connector URL. */
const ADMIN_SCOPE = 'admin';

const router = express.Router();

/* ── Constant-time string compare (same approach as admin MCP) ── */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}

/* ============================================================
   TOKEN MANAGEMENT ROUTER — authenticated student endpoints
   ============================================================ */
const tokenRouter = express.Router();

/**
 * GET /api/mcp/student/status
 * Non-secret status for the settings page.
 */
tokenRouter.get('/student/status', authenticate, async (req, res) => {
  try {
    const [status, oauth] = await Promise.all([
      studentMcpService.getStatus(req.user.id),
      mcpOAuthService.getStatus(req.user.id).catch(() => ({ connected: false }))
    ]);
    res.json({ success: true, status: { ...status, oauth } });
  } catch (err) {
    console.error('[STUDENT-MCP] Status error:', err.message);
    res.status(500).json({ error: 'Failed to load connection status.' });
  }
});

/**
 * POST /api/mcp/student/token
 * Generate (or rotate) the student's MCP token.
 * The full token is returned ONCE and never stored in plaintext.
 */
tokenRouter.post('/student/token', authenticate, async (req, res) => {
  try {
    const label = typeof req.body?.label === 'string' && req.body.label.trim()
      ? req.body.label.trim().slice(0, 40)
      : 'Claude';

    const { token, meta } = await studentMcpService.generateToken(req.user.id, label);
    res.json({
      success: true,
      token,           // shown once — never retrievable again
      meta,
      connector_url: `${req.protocol}://${req.get('host')}/mcp/student/${token}`
    });
  } catch (err) {
    console.error('[STUDENT-MCP] Generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate token.' });
  }
});

/**
 * DELETE /api/mcp/student/token
 * Revoke the student's active token.
 */
tokenRouter.delete('/student/token', authenticate, async (req, res) => {
  try {
    const result = await studentMcpService.revokeToken(req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[STUDENT-MCP] Revoke error:', err.message);
    res.status(500).json({ error: 'Failed to revoke token.' });
  }
});

/* ============================================================
   RPC ROUTER — MCP over Streamable HTTP with student token auth
   ============================================================
   Mounted at /mcp/student/:token? — all routes are relative to
   that mount, so the JSON-RPC channel lives at '/'. Resolve the
   student token from Bearer / X-MCP-Token / path segment (same
   flexibility as the admin MCP endpoint), verify it against the
   hash table, then dispatch JSON-RPC scoped to that student's
   user_id.
   ============================================================ */

const rpcRouter = express.Router();

function resolveStudentToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (req.headers['x-mcp-token']) return String(req.headers['x-mcp-token']);
  if (req.mcpPathToken) return String(req.mcpPathToken);
  const m = (req.originalUrl || '').split('?')[0].match(/^\/mcp\/student(?:\/([^/?]+))?/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return null;
}

async function requireStudentToken(req, res, next) {
  const token = resolveStudentToken(req);
  if (!token) {
    // Point OAuth-capable clients (claude.ai) at the authorization metadata.
    res.setHeader('WWW-Authenticate', 'Bearer realm="mcp", resource_metadata="/.well-known/oauth-protected-resource"');
    return res.status(401).json({ error: 'Missing student MCP token' });
  }
  try {
    // OAuth (account-based "Connect to Claude") — Bearer tokens whose
    // value does NOT carry the legacy key prefix are OAuth access tokens.
    if (!token.startsWith('sk-mcp-')) {
      const auth = await mcpOAuthService.verifyAccessToken(token);
      if (auth) {
        req.mcpUserId = auth.userId;
        req.mcpScope = auth.scope;       // e.g. ['read'] or ['read','grade','admin']
        req.mcpIsAdmin = auth.scope.includes(ADMIN_SCOPE);
        req.mcpAuthKind = 'oauth';
        req.mcpAuthToken = token;        // for last_used stamping
        return next();
      }
      return res.status(401).json({ error: 'Invalid or revoked MCP access token' });
    }

    // Legacy per-user paste tokens (sk-mcp-…) — full student scope.
    const userId = await studentMcpService.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or revoked student MCP token' });
    }
    req.mcpUserId = userId;
    req.mcpScope = ['read', 'grade'];    // legacy tokens keep the old capabilities
    req.mcpAuthKind = 'paste-token';
    next();
  } catch (err) {
    console.error('[STUDENT-MCP] Verify error:', err.message);
    res.status(500).json({ error: 'Token verification failed.' });
  }
}

/** Tool invocation audit trail (fire-and-forget). */
function logToolUse(req, toolName) {
  logService.logEvent({
    level: 'info',
    event: 'mcp_tool_invoked',
    message: `MCP tool '${toolName}' called`,
    userId: req.mcpUserId || null,
    metadata: {
      tool: toolName,
      server: req.mcpIsAdmin ? 'student+admin' : 'student',
      auth_kind: req.mcpAuthKind || 'unknown',
      scope: Array.isArray(req.mcpScope) ? req.mcpScope.join(' ') : null
    }
  }).catch(() => {});
}

/* GET → 405 (stateless mode, no SSE stream) */
rpcRouter.get('/', requireStudentToken, (req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({
    error: 'This MCP endpoint is stateless (no SSE). Send JSON-RPC via POST.',
    server: SERVER_INFO
  });
});

/* POST — the main channel */
rpcRouter.post('/', requireStudentToken, async (req, res) => {
  try {
    const body = req.body;
    const messages = Array.isArray(body) ? body : [body];
    const responses = [];

    for (const msg of messages) {
      if (!msg || typeof msg !== 'object' || !msg.method) {
        responses.push({
          jsonrpc: '2.0', id: msg?.id ?? null,
          error: { code: -32600, message: 'Invalid Request: missing method' }
        });
        continue;
      }

      // Per-tool scope gate: the grader dry-run needs the 'grade' scope,
      // which a user may not have approved on the consent page.
      if (msg.method === 'tools/call') {
        const toolName = msg.params?.name;
        if (toolName === 'check_my_code' && !(req.mcpScope || []).includes('grade')) {
          responses.push({
            jsonrpc: '2.0', id: msg.id ?? null,
            error: {
              code: -32003,
              message: "This Claude connection was approved without the 'grade' scope. Reconnect from Settings → Connect to Claude to enable code checking."
            }
          });
          continue;
        }
        if (toolName) logToolUse(req, toolName);
      }

      // Admin-scoped OAuth connections: the admin toolset answers tools/*
      // (write access to courses/lessons/challenges + platform stats),
      // while student self tools stay available alongside it. Every admin
      // response is audited with the acting user id.
      if (req.mcpIsAdmin && (msg.method === 'tools/list' || msg.method === 'tools/call')) {
        if (msg.method === 'tools/list') {
          responses.push({
            jsonrpc: '2.0', id: msg.id ?? null,
            result: { tools: [...ADMIN_TOOLS, ...STUDENT_TOOLS] }
          });
          continue;
        }
        const adminToolNames = new Set(ADMIN_TOOLS.map(t => t.name));
        if (adminToolNames.has(msg.params?.name)) {
          const result = await handleAdminRpc(msg);
          if (!result.notification) responses.push(result.response);
          continue;
        }
      }

      const result = await handleStudentRpcMessage(msg, req.mcpUserId);
      if (!result.notification) responses.push(result.response);
    }

    if (responses.length === 0) {
      return res.status(202).end();
    }
    res.json(responses.length === 1 ? responses[0] : responses);

    // Fire-and-forget usage stamp (after the response is on the wire)
    if (req.mcpAuthKind === 'oauth') {
      mcpOAuthService.touchLastUsed(req.mcpAuthToken).catch(() => {});
    } else {
      studentMcpService.touchLastUsed(req.mcpUserId).catch(() => {});
    }
  } catch (err) {
    console.error('[STUDENT-MCP] RPC error:', err.message);
    res.status(500).json({ error: 'MCP request failed.' });
  }
});

/* DELETE → 405 */
rpcRouter.delete('/', requireStudentToken, (req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed — this MCP endpoint is stateless. Use POST.' });
});

module.exports = { studentMcpTokenRoutes: tokenRouter, studentMcpRpcRoutes: rpcRouter };
