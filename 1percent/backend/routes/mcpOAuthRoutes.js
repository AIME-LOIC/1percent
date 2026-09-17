/* ============================================================
   MCP OAuth Routes — account-based "Connect to Claude"
   ============================================================
   Flow (all on learn.1percent.rw, no keys to copy):

     GET  /mcp/oauth/authorize           → consent page (requires login)
     GET  /mcp/oauth/consent.js          → page script
     GET  /mcp/oauth/.well-known/oauth-authorization-server
     POST /mcp/oauth/register            → RFC 7591 dynamic client registration
     POST /mcp/oauth/token               → code/refresh exchange
     POST /mcp/oauth/revoke              → disconnect for the logged-in user

   The authorize page is gated by a Supabase browser session.
   claude.ai sends the user's browser here WITHOUT an Authorization
   header, so auth is read from the persisted Supabase session
   (same pattern dashboard.html uses), and a signed consent POST is
   verified server-side via the access token of that session.

   POST /mcp/oauth/token is a pure JSON API used server-to-server by
   Claude (client_secret_post if a secret is configured, else PKCE).
   POST /mcp/oauth/register implements RFC 7591 so claude.ai can
   create its own Client ID instead of asking for one manually.
   ============================================================ */

const express = require('express');
const crypto = require('crypto');
const { adminClient } = require('../config/database');
const mcpOAuthService = require('../services/mcpOAuthService');
const { VALID_SCOPES, DEFAULT_CLIENT_ID, isValidRedirectUri } = require('../services/mcpOAuthService');
const logService = require('../services/logService');
const { rateLimit } = require('../middlewares/rateLimit');

const router = express.Router();

const CONSENT_TTL_MS = 15 * 60 * 1000; // consent form validity window

/* Scopes a client may REQUEST. 'admin' exists but is server-granted
   only (added by the service when the approving account's
   profiles.role is admin) — a client asking for it gets it stripped. */
const USER_REQUESTABLE_SCOPES = VALID_SCOPES;

/* ── helpers ─────────────────────────────────────────────── */

function isHttpUrl(uri) {
  try { const u = new URL(uri); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}

/** Single JSON error shape for the token endpoint (RFC 6749 §5.2). */
function tokenError(res, error, status = 400) {
  return res.status(status).json({ error, error_description: OAUTH_DESCRIPTIONS[error] || error });
}

const OAUTH_DESCRIPTIONS = {
  invalid_request: 'The request is missing a required parameter or is malformed.',
  invalid_client: 'Client authentication failed.',
  invalid_grant: 'The authorization code or refresh token is invalid, expired, or already used.',
  unsupported_grant_type: 'Only authorization_code and refresh_token grants are supported.',
  invalid_scope: 'The requested scope is invalid or unknown.'
};

/* ── 1. GET /mcp/oauth/authorize — the consent page ──────── */

router.get('/authorize', async (req, res, next) => {
  try {
    const clientId = String(req.query.client_id || DEFAULT_CLIENT_ID);
    const redirectUri = req.query.redirect_uri ? String(req.query.redirect_uri) : null;
    const responseType = String(req.query.response_type || 'code');
    const scope = String(req.query.scope || 'read');
    const state = req.query.state ? String(req.query.state) : '';
    const codeChallenge = req.query.code_challenge ? String(req.query.code_challenge) : null;
    const codeChallengeMethod = req.query.code_challenge_method ? String(req.query.code_challenge_method) : null;

    // RFC 6749: validate redirect_uri FIRST — never echo an unvalidated one.
    if (redirectUri && !isValidRedirectUri(redirectUri)) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri must be a valid http(s) URL.' });
    }
    // RFC 7591: only registered clients (or the built-in DEFAULT id) may
    // start a flow — an unknown client_id fails closed.
    if (!(await mcpOAuthService.isKnownClient(clientId))) {
      return oauthErr(res, redirectUri, 'invalid_client', 'Unknown client_id. Register at /mcp/oauth/register first.');
    }
    if (redirectUri && !(await mcpOAuthService.isAllowedRedirectUri(clientId, redirectUri))) {
      return oauthErr(res, redirectUri, 'invalid_request', 'redirect_uri is not registered for this client.');
    }
    if (responseType !== 'code') {
      return oauthErr(res, redirectUri, 'unsupported_response_type', 'Only response_type=code is supported.');
    }
    const requestedScopes = String(scope || 'read').split(/[\s+]/).filter(Boolean);
    if (requestedScopes.some(s => !USER_REQUESTABLE_SCOPES.includes(s))) {
      return oauthErr(res, redirectUri, 'invalid_scope', `Valid scopes: ${USER_REQUESTABLE_SCOPES.join(', ')}.`);
    }
    // PKCE is mandatory: claude.ai always sends S256. Refuse plaintext and absence.
    if (!codeChallenge || codeChallengeMethod !== 'S256') {
      return oauthErr(res, redirectUri, 'invalid_request', 'PKCE (code_challenge_method=S256) is required.');
    }

    return sendConsentPage(res, {
      client_id: clientId,
      redirect_uri: redirectUri || '',
      scope: requestedScopes.filter(s => USER_REQUESTABLE_SCOPES.includes(s)).join(' ') || 'read',
      state,
      code_challenge: codeChallenge
    });
  } catch (err) {
    next(err);
  }
});

function oauthErr(res, redirectUri, error, description) {
  if (redirectUri && isHttpUrl(redirectUri)) {
    const u = new URL(redirectUri);
    u.searchParams.set('error', error);
    if (description) u.searchParams.set('error_description', description);
    return res.redirect(302, u.toString());
  }
  return res.status(400).json({ error, error_description: description || error });
}

/* ── consent page (inline, no template engine) ───────────── */

function sendConsentPage(res, flow) {
  const payload = Buffer.from(JSON.stringify(flow)).toString('base64url');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Connect Claude — 1% Expert Programme</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/main.css">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="/js/toast.js"></script>
<style>
  body{background:var(--bg,#f6f8f7);}
  .consent-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .consent-card{max-width:460px;width:100%;background:var(--bg-card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:20px;padding:36px 32px;box-shadow:0 8px 30px rgba(13,110,63,.08);}
  .consent-logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0d6e3f,#0a5c34);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin:0 auto 18px;}
  .consent-card h1{font-size:20px;font-weight:800;text-align:center;margin:0 0 6px;color:#111827;}
  .consent-card .sub{text-align:center;font-size:13px;color:#6b7280;margin-bottom:22px;}
  .consent-scope{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px 16px;margin-bottom:18px;}
  .consent-scope .t{font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;}
  .consent-scope ul{margin:0;padding-left:18px;font-size:13px;color:#4b5563;line-height:1.7;}
  .consent-user{display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;font-size:13px;color:#065f46;margin-bottom:18px;}
  .consent-actions{display:flex;gap:10px;margin-top:6px;}
  .consent-btn{flex:1;padding:11px 0;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s;}
  .consent-btn.approve{background:#0d6e3f;color:#fff;}
  .consent-btn.approve:hover{background:#0a5c34;}
  .consent-btn.approve:disabled{opacity:.55;cursor:wait;}
  .consent-btn.cancel{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;}
  .consent-note{font-size:11px;color:#9ca3af;text-align:center;margin-top:14px;line-height:1.6;}
  .consent-err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:none;}
  #consent-loading{font-size:13px;color:#6b7280;text-align:center;padding:30px 0;}
</style>
</head>
<body>
  <div class="consent-wrap">
    <div class="consent-card">
      <div class="consent-logo">1%</div>
      <h1>Connect Claude to 1% Learn</h1>
      <div class="sub">claude.ai is requesting read access to your learning data</div>

      <div class="consent-user" id="consent-user" style="display:none;"></div>
      <div class="consent-err" id="consent-err"></div>
      <div id="consent-loading">Checking your sign-in…</div>

      <form id="consent-form" style="display:none;">
        <div class="consent-scope">
          <div class="t">Claude will be able to:</div>
          <ul id="scope-list"></ul>
        </div>
        <div class="consent-actions">
          <button type="button" class="consent-btn cancel" id="consent-cancel">Cancel</button>
          <button type="submit" class="consent-btn approve" id="consent-approve">Approve</button>
        </div>
        <div class="consent-note">You are approving on your own account — no keys or tokens to copy.
        You can disconnect anytime from Settings → Connect to Claude.</div>
      </form>
    </div>
  </div>

<script>
const FLOW = JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob("${payload}"), c => c.charCodeAt(0))
));
const SCOPE_TEXT = {
  read:  'View your courses, progress, coins, streak, certificates, and lesson content (read-only).',
  grade: 'Dry-run your draft code against the practice grader — never submits work or earns coins.'
};
const ADMIN_SCOPE_TEXT = 'ADMIN ACCESS: manage the platform\\'s courses, lessons, and challenges (create, edit, delete) and view platform stats — because your account is an administrator.';
(function () {
  const list = document.getElementById('scope-list');
  FLOW.scope.split(/\\s+/).forEach(s => {
    const li = document.createElement('li');
    li.textContent = SCOPE_TEXT[s] || s;
    list.appendChild(li);
  });
})();

function showErr(msg) {
  const el = document.getElementById('consent-err');
  el.textContent = msg; el.style.display = '';
  document.getElementById('consent-loading').style.display = 'none';
}

async function getClient() {
  const cfg = await fetch('/api/config').then(r => r.json());
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof supabase === 'undefined') return null;
  return supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
}

(async function init() {
  const client = await getClient();
  if (!client) return showErr('Sign-in is not configured. Please try again later.');
  const { data: { session } } = await client.auth.getSession();
  let user = session?.user || null;

  // Proactively refresh a token that dies within 5 minutes.
  const exp = (session?.expires_at || 0) * 1000;
  if (user && exp && exp - Date.now() < 5 * 60 * 1000) {
    const fresh = await client.auth.refreshSession();
    user = fresh?.data?.session?.user || user;
  }

  if (!user) {
    // Not logged in → send to the login popup on the learn homepage IN THIS
    // TAB. sessionStorage survives same-tab navigation, and the login popup
    // reads mcpConsentReturn after a successful login and redirects straight
    // back here, resuming the consent flow.
    document.getElementById('consent-loading').style.display = 'none';
    const err = document.getElementById('consent-err');
    // NOTE: this whole page is a template literal — JS escapes for the
    // BROWSER must be doubled here (\\' → browser sees \'). A single
    // \' collapses to a bare ' in the output and SyntaxErrors the page
    // ("Unexpected identifier 'll'"), leaving consent stuck on loading.
    err.innerHTML = 'You are not signed in. <a href="/learn"><strong>Log in</strong></a> — you\\'ll be brought right back here to finish connecting.';
    err.style.display = '';
    sessionStorage.setItem('mcpConsentReturn', window.location.href);
    return;
  }

  const name = user.user_metadata?.full_name || user.email || 'Student';
  const email = user.email || '';
  const userEl = document.getElementById('consent-user');
  userEl.textContent = 'Signed in as ' + name + (email ? ' (' + email + ')' : '');

  // Admin detection: ask the server (it reads profiles.role under RLS,
  // so the answer cannot be tampered with from the client). Admins get
  // an explicit disclosure that approving also grants platform admin
  // tooling to Claude — informed consent, not a silent scope bump.
  let isAdmin = false;
  try {
    const meRes = await fetch('/mcp/oauth/me', {
      headers: { 'Authorization': 'Bearer ' + (session?.access_token || '') }
    });
    if (meRes.ok) {
      const me = await meRes.json();
      isAdmin = me.role === 'admin';
    }
  } catch { /* non-fatal: scope disclosure is best-effort */ }
  if (isAdmin) {
    const li = document.createElement('li');
    li.textContent = ADMIN_SCOPE_TEXT;
    li.style.cssText = 'font-weight:700;color:#92400e;';
    document.getElementById('scope-list').appendChild(li);
    const badge = document.createElement('div');
    badge.textContent = 'Admin account — approving also enables platform management tools.';
    badge.style.cssText = 'background:#fef3c7;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:700;border-radius:10px;padding:8px 12px;margin:-8px 0 18px;text-align:center;';
    document.querySelector('.consent-scope').insertAdjacentElement('afterend', badge);
  }

  // Consent-phishing mitigation: always show WHERE Claude will be sent back.
  try {
    if (FLOW.redirect_uri) {
      const host = new URL(FLOW.redirect_uri).host;
      const hostEl = document.createElement('div');
      hostEl.style.cssText = 'font-size:12px;color:#6b7280;margin:-10px 0 18px;text-align:center;';
      hostEl.textContent = 'Access will be granted to: ' + host;
      document.querySelector('.consent-scope').insertAdjacentElement('beforebegin', hostEl);
    }
  } catch { }
  document.getElementById('consent-loading').style.display = 'none';
  document.getElementById('consent-form').style.display = '';

  document.getElementById('consent-cancel').addEventListener('click', () => window.close());

  document.getElementById('consent-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('consent-approve');
    btn.disabled = true; btn.textContent = 'Approving…';
    try {
      const { data: { session: s } } = await client.auth.getSession();
      const token = s?.access_token;
      if (!token) throw new Error('Your session expired — reload the page.');
      const res = await fetch('/mcp/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ flow: FLOW })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.redirect_to) throw new Error(json.error_description || json.error || 'Approval failed.');
      window.location.href = json.redirect_to;
    } catch (err) {
      showErr(err.message);
      btn.disabled = false; btn.textContent = 'Approve';
    }
  });
})();
</script>
</body>
</html>`;
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
}

/* ── 2. GET /me — who is this token, and what can it do? ────
   The consent page calls this (with the user's Supabase access
   token) to learn whether the signed-in account is an admin, so the
   disclosure on the form matches the scope the server will actually
   grant. Returns role from profiles — read under RLS as the user. */

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Log in first.' });
    }
    const jwt = authHeader.slice(7).trim();
    const { data: { user }, error } = await adminClient.auth.getUser(jwt);
    if (error || !user) return res.status(401).json({ error: 'Invalid session. Log in again.' });

    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();
    if (profileErr) return res.status(403).json({ error: 'Could not verify role.' });

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      user_id: user.id,
      email: profile.email || user.email || null,
      full_name: profile.full_name || user.user_metadata?.full_name || null,
      role: profile.role || 'student',
      is_admin: profile.role === 'admin'
    });
  } catch (err) {
    next(err);
  }
});

/* ── 3. POST /mcp/oauth/authorize — approve (browser session) ── */

router.post('/authorize', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Log in first.' });
    }
    const jwt = authHeader.slice(7).trim();

    // Verify the Supabase JWT against Supabase (same as authenticate middleware).
    let userId = null;
    try {
      const { data: { user }, error } = await adminClient.auth.getUser(jwt);
      if (error || !user) return res.status(401).json({ error: 'Invalid session. Log in again.' });
      userId = user.id;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid session. Log in again.' });
    }

    const flow = req.body?.flow || {};
    const redirectUri = String(flow.redirect_uri || '');
    // redirect_uri is OPTIONAL: claude.ai always sends one, but a same-origin
    // connect (e.g. "try it now" from Settings) may omit it — then we bounce
    // the browser to a success page instead of erroring.
    if (redirectUri && !isValidRedirectUri(redirectUri)) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing redirect_uri.' });
    }
    if (!(await mcpOAuthService.isKnownClient(flow.client_id))) {
      return res.status(400).json({ error: 'invalid_client', error_description: 'Unknown client_id.' });
    }
    if (redirectUri && !(await mcpOAuthService.isAllowedRedirectUri(flow.client_id, redirectUri))) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is not registered for this client.' });
    }
    if (flow.code_challenge) {
      const challenge = String(flow.code_challenge);
      if (!/^[A-Za-z0-9\-_]{43,128}$/.test(challenge)) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'Malformed code_challenge.' });
      }
    }

    const code = await mcpOAuthService.createAuthorizationCode({
      userId,
      clientId: flow.client_id,
      redirectUri,
      scope: flow.scope,
      codeChallenge: flow.code_challenge
    });

    // No redirect_uri → same-origin connect: land back on Settings with a
    // success flag the settings page can pick up.
    const u = new URL(redirectUri || '/settings?claude=connected', `https://${req.headers.host || 'learn.1percent.rw'}`);
    u.searchParams.set('code', code);
    if (flow.state) u.searchParams.set('state', String(flow.state));

    logService.logEvent({
      level: 'info', event: 'mcp_oauth_consent_granted',
      message: 'User approved a Claude connection', userId,
      metadata: { client_id: flow.client_id || DEFAULT_CLIENT_ID, scope: flow.scope || 'read' }
    }).catch(() => {});

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: true, redirect_to: u.toString() });
  } catch (err) {
    next(err);
  }
});

/* ── 4. POST /mcp/oauth/token — code + refresh exchange ──── */

router.post('/token', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');

    const p = (req.body && typeof req.body === 'object') ? req.body : {};
    const grantType = String(p.grant_type || '');

    if (grantType === 'authorization_code') {
      const { code } = p;
      const codeVerifier = p.code_verifier ? String(p.code_verifier) : null;
      const clientId = p.client_id ? String(p.client_id) : null;
      const clientSecret = p.client_secret ? String(p.client_secret) : null;
      const redirectUri = p.redirect_uri ? String(p.redirect_uri) : null;

      // RFC 7591 client auth: registered confidential clients must present
      // their secret; public clients (claude.ai) authenticate via PKCE only.
      const clientAuth = await mcpOAuthService.authenticateClient(clientId, clientSecret);
      if (!clientAuth.ok) return tokenError(res, clientAuth.reason || 'invalid_client', 401);
      // Defence in depth for the built-in DEFAULT client: when
      // MCP_OAUTH_CLIENT_SECRET is set, a presented secret must match it.
      const expectedSecret = process.env.MCP_OAUTH_CLIENT_SECRET || null;
      if (expectedSecret && clientSecret) {
        const a = Buffer.from(clientSecret);
        const b = Buffer.from(expectedSecret);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return tokenError(res, 'invalid_client', 401);
        }
      }

      try {
        const tokens = await mcpOAuthService.exchangeCodeForTokens({ code, clientId, redirectUri, codeVerifier });
        return res.json(tokens);
      } catch (e) {
        if (e.message === 'invalid_grant') return tokenError(res, 'invalid_grant');
        throw e;
      }
    }

    if (grantType === 'refresh_token') {
      try {
        const tokens = await mcpOAuthService.refreshAccessToken(String(p.refresh_token || ''));
        return res.json(tokens);
      } catch (e) {
        if (e.message === 'invalid_grant') return tokenError(res, 'invalid_grant');
        throw e;
      }
    }

    return tokenError(res, 'unsupported_grant_type');
  } catch (err) {
    next(err);
  }
});

/* ── 5. POST /mcp/oauth/register — dynamic client registration ──
   RFC 7591. claude.ai custom connectors call this BEFORE authorize:
   no registration_endpoint in the discovery metadata is exactly what
   triggers "Automatic client registration isn't supported". Open
   registration is safe here because:
   - only public clients can be created from the outside (PKCE is
     still mandatory, consent still happens on our domain),
   - redirect_uris are stored and enforced exact-match at authorize,
   - the endpoint is rate-limited and every client_id is auditable. */

router.post('/register', rateLimit, async (req, res, next) => {
  try {
    const p = (req.body && typeof req.body === 'object') ? req.body : {};
    const client = await mcpOAuthService.registerClient({
      clientName: p.client_name,
      redirectUris: p.redirect_uris,
      grantTypes: p.grant_types,
      responseTypes: p.response_types,
      tokenEndpointAuthMethod: p.token_endpoint_auth_method,
      scope: p.scope
    });
    logService.logEvent({
      level: 'info', event: 'mcp_oauth_client_registered',
      message: 'Dynamically registered an MCP OAuth client',
      metadata: { client_id: client.client_id, client_name: client.client_name, redirect_uris: client.redirect_uris }
    }).catch(() => {});
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json(client);
  } catch (err) {
    if (err.oauthError) {
      return res.status(err.status || 400).json({ error: err.oauthError, error_description: err.message });
    }
    return next(err);
  }
});

/* ── 6. Discovery metadata for claude.ai ─────────────────── */

router.get('/.well-known/oauth-authorization-server', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'learn.1percent.rw';
  const base = `${proto}://${host}`;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/mcp/oauth/authorize`,
    token_endpoint: `${base}/mcp/oauth/token`,
    registration_endpoint: `${base}/mcp/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    registration_access_token_required: false,
    scopes_supported: VALID_SCOPES
  });
});

/* ── 7. POST /mcp/oauth/revoke — disconnect (browser session) ── */

router.post('/revoke', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { data: { user }, error } = await adminClient.auth.getUser(authHeader.slice(7).trim());
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });

    const result = await mcpOAuthService.revokeAllForUser(user.id);
    logService.logEvent({
      level: 'info', event: 'mcp_oauth_revoked',
      message: 'User disconnected Claude access', userId: user.id,
      metadata: { revoked: result.revoked }
    }).catch(() => {});
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
