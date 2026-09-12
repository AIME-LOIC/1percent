/* ============================================================
   MCP over Streamable HTTP — remote MCP server for claude.ai
   ============================================================
   Endpoint : POST /mcp/<token>
   Auth     : the <token> path segment must equal MCP_HTTP_TOKEN
              from .env (constant-time compare). Claude.ai sends
              its stored credentials as the Bearer token — we
              accept Bearer, X-MCP-Token, or the path segment.

   Transport: Streamable HTTP (MCP spec 2025-03-26): POST with a
              JSON-RPC message → JSON response. Stateless single-
              message mode (no SSE sessions), so GET/DELETE → 405.
   Tools    : shared with the stdio server via backend/mcp/core.js
   ============================================================ */

const express = require('express');
const { handleRpcMessage } = require('../mcp/core');

const router = express.Router();

/* ── Constant-time string compare (avoid timing leaks) ── */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}

function resolveToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (req.headers['x-mcp-token']) return String(req.headers['x-mcp-token']);
  // Path token, captured by the parent-level middleware in index.js
  if (req.mcpPathToken) return String(req.mcpPathToken);
  // Fallback: parse from the original URL (works when mounted standalone)
  const m = (req.originalUrl || '').split('?')[0].match(/^\/mcp(?:\/([^/]+))?$/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return null;
}

/* ── Auth middleware — accepts Bearer, X-MCP-Token, or path token ── */
function requireToken(req, res, next) {
  const envToken = process.env.MCP_HTTP_TOKEN;
  if (!envToken) {
    return res.status(503).json({
      error: 'MCP_HTTP_TOKEN not configured on the server. Add it to .env and restart.'
    });
  }
  const headerToken = resolveToken(req);
  const ok = safeEqual(envToken, headerToken || '');
  if (!ok) {
    return res.status(401).json({ error: 'Invalid MCP token' });
  }
  next();
}

/* ── GET → 405 (stateless mode, no SSE stream) ── */
router.get('/', requireToken, (req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({
    error: 'This MCP endpoint is stateless (no SSE). Send JSON-RPC via POST.',
    server: { name: 'onepercent-learn', version: '1.0.0' }
  });
});

/* ── DELETE → 405 ── */
router.delete('/', requireToken, methodsNotAllowed);

/* ── POST — the main channel ── */
router.post('/', requireToken, async (req, res) => {
  // Accept both single messages and JSON-RPC batches
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
    const result = await handleRpcMessage(msg);
    if (!result.notification) responses.push(result.response);
  }

  if (responses.length === 0) {
    // All notifications → 202 Accepted, empty body (per spec)
    return res.status(202).end();
  }
  res.json(responses.length === 1 ? responses[0] : responses);
});

function methodsNotAllowed(req, res) {
  res.set('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed — this MCP endpoint is stateless. Use POST.' });
}

module.exports = router;
