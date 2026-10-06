const { adminClient } = require('../config/database');
const crypto = require('crypto');
const { parseStoredScopes } = require('../services/mcpOAuthService');

/* ═══════════════════════════════════════════════════════════════
   AI connections — the multi-AI bridge (ChatGPT + Gemini)
   Reuses the existing /mcp/oauth OAuth 2.0 + PKCE machine:
   register / authorize / token / revoke.  Each provider is just
   a registered mcp_oauth_clients row; the frontend/backend only
   forward the provider id as client_id.
   ═══════════════════════════════════════════════════════════════ */

/* ── POST /api/ai/connections (per-user provider connect) ── */
async function connectAi(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const provider = String(body.provider || '').toLowerCase();
  if (!provider || !['chatgpt', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider (expected chatgpt or gemini).' });
  }

  const flow = {
    client_id: provider + '-client',
    response_type: 'code',
    scope: 'read grade',
    redirect_uri: body.redirect_uri,
    state: body.state,
    code_challenge: body.code_challenge || null
  };

  // Same-origin connect (settings/admin button): redirect_uri is
  // optional — we land back with ?chatgpt=connected or ?gemini=connected.
  const sameOrigin = !flow.redirect_uri;
  const base = sameOrigin ? `/${req.baseUrl.split('/').pop()}` : flow.redirect_uri;
  const redirectTo = sameOrigin
    ? `${base}?${provider}=connected&state=${encodeURIComponent(flow.state || '')}`
    : `${flow.redirect_uri}${flow.state ? '&state=' + encodeURIComponent(flow.state) : ''}`;

  // Reuse the existing consent page: it fetches /mcp/oauth/authorize
  // with the same payload the /mcp/oauth/authorize GET already
  // accepts (PKCE, scope, approved scopes) and returns {redirect_to}.
  const authorizeRes = await fetch(`${req.protocol}://${req.get('host')}/mcp/oauth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${req.token ?? ''}` },
    body: JSON.stringify({ flow })
  });

  if (!authorizeRes.ok) {
    const err = await authorizeRes.json().catch(() => ({}));
    return res.status(400).json({ error: err.error || 'Connection failed' });
  }

  const { redirect_to } = await authorizeRes.json();

  // Persist the connection row (hashed provider token).
  const mcpTokenHash = body.mcp_token_hash || crypto.randomBytes(32).toString('base64url');
  const { error: connErr } = await adminClient
    .from('ai_connections')
    .insert({
      user_id: userId,
      provider,
      mcp_client_id: flow.client_id,
      mcp_token_hash: mcpTokenHash
    });

  if (connErr) {
    console.error('[AI CONNECT] row insert error:', connErr.message);
    return res.status(500).json({ error: 'Could not save connection.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    success: true,
    provider,
    client_id: flow.client_id,
    connected: true,
    redirect_to
  });
}

/* ── GET /api/ai/connections (per-user status) ── */
async function listAiConnections(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { data, error } = await adminClient
    .from('ai_connections')
    .select('*')
    .eq('user_id', userId)
    .in('provider', ['chatgpt', 'gemini']);

  if (error) {
    console.error('[AI CONNECT] list error:', error.message);
    return res.status(500).json({ error: 'Could not load connections.' });
  }

  const rows = data || [];
  const active = rows.filter(r => !r.revoked_at);
  const byProvider = {};
  ['chatgpt', 'gemini'].forEach(p => {
    const row = active.find(a => a.provider === p);
    byProvider[p] = row
      ? {
          connected: true,
          mcp_client_id: row.mcp_client_id,
          mcp_token_hash: row.mcp_token_hash,
          revoked_at: row.revoked_at || null
        }
      : { connected: false, mcp_client_id: null, mcp_token_hash: null, revoked_at: null };
  });

  res.json({
    success: true,
    connections: byProvider
  });
}

/* ── POST /api/ai/connections/register (admin: seed a new provider) ── */
async function adminRegisterConnection(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const client_name = String(body.client_name || '').slice(0, 200) || 'AI connection';
  const redirect_uris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter(u => typeof u === 'string' && u.trim())
    : [];
  const scope = String(body.scope || 'read grade');

  if (!redirect_uris.length) {
    return res.status(400).json({ error: 'redirect_uris must include at least one valid https:// URI.' });
  }

  const grant_types = ['authorization_code', 'refresh_token'];
  const authMethod = 'none';
  const clientId = body.client_id || (crypto.randomBytes(16).toString('hex') + '-ai');
  const clientSecret = crypto.randomBytes(32).toString('base64url');
  const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

  const { error } = await adminClient
    .from('mcp_oauth_clients')
    .insert({
      client_id: clientId,
      client_name,
      client_secret_hash: clientSecretHash,
      redirect_uris,
      grant_types,
      response_types: ['code'],
      token_endpoint_auth_method: authMethod,
      scope
    });

  if (error) {
    console.error('[AI CONNECT] admin register error:', error.message);
    return res.status(500).json({ error: 'Could not register provider.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    success: true,
    client_id: clientId,
    client_name,
    redirect_uris,
    scope
  });
}

/* ── DELETE /api/admin/ai/connections/:provider (admin: revoke) ──
   The admin panel passes the provider name (claude/chatgpt/gemini),
   not a row uuid — revoke every active connection for that provider. */
async function adminRevokeConnection(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const provider = String(req.params.id || '').toLowerCase();
  if (!provider || !['claude', 'chatgpt', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider (expected claude, chatgpt or gemini).' });
  }

  const { error } = await adminClient
    .from('ai_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('provider', provider)
    .is('revoked_at', null);

  if (error) {
    console.error('[AI CONNECT] revoke error:', error.message);
    return res.status(500).json({ error: 'Could not revoke connection.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ success: true, revoked: true, provider });
}

/* ── GET /api/admin/ai/connections (admin: refresh shared admin connector) ── */
async function listAdminAiConnections(req, res) {
  // Admin-level view: list every provider AI connection the platform
  // currently has (shared admin connector state).  This is the
  // admin-side "refresh" of the shared connector status.
  // Claude is a per-account personal connector — the admin panel also
  // shows it, so include it in the provider list.
  const { data, error } = await adminClient
    .from('ai_connections')
    .select('*');

  if (error) {
    console.error('[AI CONNECT] admin list error:', error.message);
    return res.status(500).json({ error: 'Could not load connections.' });
  }

  const rows = data || [];
  const active = rows.filter(r => !r.revoked_at);
  const byProvider = {};
  ['claude', 'chatgpt', 'gemini'].forEach(p => {
    const row = active.find(a => a.provider === p);
    byProvider[p] = row
      ? {
          connected: true,
          provider: row.provider,
          mcp_client_id: row.mcp_client_id,
          mcp_token_hash: row.mcp_token_hash,
          created_at: row.created_at,
          updated_at: row.updated_at,
          revoked_at: row.revoked_at || null
        }
      : { connected: false, provider: p, mcp_client_id: null, mcp_token_hash: null, created_at: null, updated_at: null, revoked_at: null };
  });

  res.json({
    success: true,
    connections: byProvider,
    total: active.length
  });
}

module.exports = {
  connectAi,
  listAiConnections,
  adminRegisterConnection,
  adminRevokeConnection,
  listAdminAiConnections
};
