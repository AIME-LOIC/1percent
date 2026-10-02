/**
 * routes/projectMcpRoutes.js
 *
 * PURPOSE:
 *   Streamable-HTTP MCP endpoint for PROJECT tools (Phase 19). Reuses the
 *   student MCP token infrastructure (hashed tokens in student_mcp_tokens)
 *   with token_type='project'. Tokens in the URL path or Bearer header —
 *   same transports as the student/admin MCP mounts.
 *
 * ENDPOINTS:
 *   ALL /mcp/projects/:token?   (mounted before the /mcp/:token catch-all)
 *
 * EXPORTS: projectMcpRpcRoutes
 * DEPENDENCIES: express, ../services/studentMcpService, ../mcp/projectCore
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const express = require('express');
const studentMcpService = require('../services/studentMcpService');
const logService = require('../services/logService');
const { handleProjectRpcMessage, SERVER_INFO } = require('../mcp/projectCore');

const router = express.Router();

/* ── Token resolution: path token or Bearer header ───────────── */

async function resolveUser(req) {
  let token = req.mcpPathToken || null;
  const authHeader = req.headers.authorization || '';
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) return null;

  const userId = await studentMcpService.verifyToken(token);
  if (!userId) return null;

  // Scope check: this endpoint only serves tokens typed 'project'.
  // Student/admin tokens keep their own dedicated endpoints.
  const { adminClient } = require('../config/database');
  const { data: row } = await adminClient
    .from('student_mcp_tokens')
    .select('token_type')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!row || row.token_type !== 'project') return null;

  return userId;
}

router.post('/', async (req, res) => {
  try {
    const userId = await resolveUser(req);
    if (!userId) {
      return res.status(401).json({
        jsonrpc: '2.0', id: null,
        error: { code: -32001, message: 'Unauthorized: invalid or missing project MCP token.' }
      });
    }

    const msg = req.body;
    if (!msg || typeof msg !== 'object') {
      return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC body.' } });
    }

    const { response } = await handleProjectRpcMessage(msg, userId);
    studentMcpService.touchLastUsed(userId).catch(() => {});
    logService.logEvent({
      level: 'info', event: 'project_mcp_call',
      message: `MCP ${msg.method}`,
      userId,
      metadata: { method: msg.method, tool: msg.params?.name || null }
    }).catch(() => {});

    res.json(response);
  } catch (err) {
    console.error('[PROJECT-MCP] error:', err.message);
    res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } });
  }
});

router.get('/', (req, res) => {
  res.json({
    jsonrpc: '2.0',
    result: {
      server: SERVER_INFO,
      hint: 'POST JSON-RPC 2.0 messages here with your project MCP token (path or Bearer).'
    }
  });
});

module.exports = { projectMcpRpcRoutes: router };
