/**
 * services/mcpOAuthService.js
 *
 * PURPOSE:
 *   Hand-rolled OAuth 2.0 + PKCE (S256) for the Claude connector: dynamic client registration,
 *   authorization codes (single-use, 10-min TTL, hashed at rest), token issue/refresh with rotation,
 *   and scope handling. The admin scope is SERVER-GRANTED ONLY: normalizeScope() strips it from
 *   client requests, while createAuthorizationCode()/_issueTokens() append it when the approver
 *   profiles.role = admin, re-verified at issue time.
 *
 * EXPORTS: VALID_SCOPES, ADMIN_SCOPE, parseStoredScopes, DEFAULT_CLIENT_ID, isValidRedirectUri, normalizeRedirectUris, normalizeRequestedScopes
 * DEPENDENCIES: crypto
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const crypto = require('crypto');
const { adminClient } = require('../config/database');

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const VALID_SCOPES = ['read', 'grade'];
/* 'admin' is server-granted only: normalizeScope() strips it from any
   client-supplied scope, and createAuthorizationCode re-adds it after
   checking the approver's profiles.role server-side. */
const ADMIN_SCOPE = 'admin';

/* Claude.ai ships a published metadata client id, but custom
   connectors may omit client_id — treat missing as a fixed public id. */
const DEFAULT_CLIENT_ID = 'claude-ai-connector';

/* RFC 7591 — Dynamic Client Registration. Public clients (no secret)
   are stored with their exact redirect_uris and checked on authorize.
   A client_id that is neither registered nor DEFAULT must fail CLOSED:
   unknown clients never reach the consent page. */
const REDIRECT_URI_MAX = 5;

function normalizeRedirectUris(raw) {
  const list = Array.isArray(raw) ? raw : (raw ? String(raw).split(/\s+/) : []);
  const uris = [];
  for (const item of list) {
    const uri = String(item || '').trim();
    if (!uri) continue;
    let u;
    try { u = new URL(uri); } catch { return null; } // malformed → reject whole request
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return null;
    if (u.hash) return null; // fragments are forbidden in redirect URIs
    if (!uris.includes(uri)) uris.push(uri);
  }
  return uris;
}

function isValidRedirectUri(uri) {
  const normalized = normalizeRedirectUris([uri]);
  return Array.isArray(normalized) && normalized.length === 1;
}

function normalizeRequestedScopes(raw) {
  return normalizeScope(Array.isArray(raw) ? raw.join(' ') : raw);
}

function normalizeGrantTypes(raw) {
  // Strict mode: if the caller explicitly requested grant_types, they
  // must be a subset of what we support AND include authorization_code.
  // Returns null when the request is unacceptable.
  if (raw === undefined || raw === null || raw === '') return null; // not specified → server default
  const list = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[\s+]/);
  const g = list.filter(Boolean);
  if (!g.length) return null;
  const supported = g.every(x => ['authorization_code', 'refresh_token'].includes(x));
  return supported && g.includes('authorization_code') ? g : null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeScope(raw) {
  const requested = String(raw || 'read').split(/[\s+]/).filter(Boolean);
  // 'admin' is never client-requestable — strip it unconditionally.
  const scopes = requested.filter(s => VALID_SCOPES.includes(s));
  return scopes.length ? scopes : ['read'];
}

/** Parse a scope string the SERVER previously stored (auth-code row,
 * token row). Unlike normalizeScope() — which is for CLIENT-supplied
 * scope and strips 'admin' — this keeps every stored scope, including
 * the server-granted 'admin'. */
function parseStoredScopes(raw) {
  const scopes = String(raw || 'read').split(/[\s+]/).filter(Boolean);
  return scopes.length ? scopes : ['read'];
}

class McpOAuthService {

  /* ── RFC 7591 dynamic client registration ────────────────── */

  /**
   * Register a public/confidential client. Returns the RFC 7591
   * response (201-shaped payload; the route sets the status).
   * Registration is unauthenticated (open) but rate-limited upstream
   * and every issued client_id is stored for revocation.
   */
  async registerClient({ clientName, redirectUris, grantTypes, responseTypes, tokenEndpointAuthMethod, scope }) {
    const uris = normalizeRedirectUris(redirectUris);
    if (!Array.isArray(uris) || uris.length === 0) {
      const e = new Error("redirect_uris must include at least one valid https:// URI (or http://localhost for development).");
      e.status = 400; e.oauthError = 'invalid_redirect_uri';
      throw e;
    }
    if (uris.length > REDIRECT_URI_MAX) {
      const e = new Error('Too many redirect_uris (max ' + REDIRECT_URI_MAX + ').');
      e.status = 400; e.oauthError = 'invalid_redirect_uri';
      throw e;
    }

    const grants = normalizeGrantTypes(grantTypes);
    if (!grants) {
      const e = new Error('grant_types must include authorization_code (refresh_token optional).');
      e.status = 400; e.oauthError = 'invalid_client_metadata';
      throw e;
    }

    const authMethod = tokenEndpointAuthMethod === 'client_secret_post' ? 'client_secret_post' : 'none';
    const scopes = normalizeRequestedScopes(scope).join(' ');
    const clientId = 'mcp-' + crypto.randomBytes(16).toString('hex');
    const clientSecret = authMethod === 'client_secret_post'
      ? crypto.randomBytes(32).toString('base64url')
      : null;

    const { error } = await adminClient.from('mcp_oauth_clients').insert({
      client_id: clientId,
      client_secret_hash: clientSecret ? sha256(clientSecret) : null,
      client_name: clientName ? String(clientName).slice(0, 200) : null,
      redirect_uris: uris,
      grant_types: grants,
      response_types: ['code'],
      token_endpoint_auth_method: authMethod,
      scope: scopes
    });
    if (error) throw error;

    const body = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName ? String(clientName).slice(0, 200) : null,
      redirect_uris: uris,
      grant_types: grants,
      response_types: ['code'],
      token_endpoint_auth_method: authMethod,
      scope: scopes
    };
    if (clientSecret) {
      body.client_secret = clientSecret;
      body.client_secret_expires_at = 0; // never expires
    }
    return body;
  }

  /**
   * Fetch a registered client by id (null if unknown or revoked).
   * Used by the authorize page to decide whether client_id is allowed.
   */
  async findClient(clientId) {
    if (!clientId || typeof clientId !== 'string') return null;
    const { data, error } = await adminClient
      .from('mcp_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    if (error || !data || data.revoked_at) return null;
    return data;
  }

  /** True when client_id may start an authorize flow (registered or DEFAULT). */
  async isKnownClient(clientId) {
    const id = String(clientId || DEFAULT_CLIENT_ID);
    if (id === DEFAULT_CLIENT_ID) return true;
    return (await this.findClient(id)) !== null;
  }

  /**
   * Redirect URI check for the authorize page.
   *  - client registered via RFC 7591 → exact-match against its list
   *  - DEFAULT_CLIENT_ID              → any valid https URL (claude.ai
   *    rotates its callback hosts, so an allowlist would break it)
   */
  async isAllowedRedirectUri(clientId, redirectUri) {
    const uri = String(redirectUri || '');
    if (!uri || !isValidRedirectUri(uri)) return false;
    const id = String(clientId || DEFAULT_CLIENT_ID);
    if (id === DEFAULT_CLIENT_ID) return true; // still must be a valid https URL
    const client = await this.findClient(id);
    if (!client) return false;
    return (client.redirect_uris || []).includes(uri);
  }

  /**
   * Client authentication at /token for confidential clients.
   * Returns { ok, reason } — reason is the RFC 6749 §5.2 error code.
   */
  async authenticateClient(clientId, clientSecret) {
    const id = String(clientId || '');
    if (id === DEFAULT_CLIENT_ID) {
      // DEFAULT stays a public client: PKCE-only, no secret.
      return { ok: true, client: null };
    }
    if (!id) return { ok: true, client: null }; // legacy flows omit client_id
    const client = await this.findClient(id);
    if (!client) return { ok: false, reason: 'invalid_client' };
    if (client.token_endpoint_auth_method === 'none') {
      // Public client: no secret expected; one must not be presented.
      return clientSecret ? { ok: false, reason: 'invalid_client' } : { ok: true, client };
    }
    if (!clientSecret) return { ok: false, reason: 'invalid_client' };
    const a = Buffer.from(sha256(String(clientSecret)));
    const b = Buffer.from(client.client_secret_hash || '');
    if (!a.length || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'invalid_client' };
    }
    return { ok: true, client };
  }

  /** PKCE: S256(code_verifier) must equal the stored code_challenge.
   * NOTE: the challenge is base64url(SHA-256(verifier)) — 43 chars —
   * NOT the hex digest. Hashing to hex here made every exchange fail
   * with invalid_grant (caught by test_mcp_oauth_registration.js). */
  _pkceOk(verifier, challenge, method) {
    if (!verifier || !challenge) return false;
    if (method && method !== 'S256') return false; // 'plain' refused
    const expected = crypto.createHash('sha256').update(String(verifier)).digest('base64url');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(challenge));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * Create a pending authorization (called when the USER approves on
   * the consent page — not when the flow starts). Returns the one-time
   * authorization code to hand back to Claude via redirect.
   */
  async createAuthorizationCode({ userId, clientId, redirectUri, scope, codeChallenge }) {
    const code = crypto.randomBytes(32).toString('base64url');
    // Scope is decided SERVER-SIDE: clients only ever propose read/grade;
    // 'admin' is appended here when the approving account really is an
    // admin (profiles.role), so the role check lives at approval time.
    const scopes = normalizeScope(scope);
    const { data: profile, error: roleErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (roleErr) throw roleErr;
    if (profile?.role === 'admin' && !scopes.includes(ADMIN_SCOPE)) scopes.push(ADMIN_SCOPE);

    const { error } = await adminClient.from('mcp_oauth_codes').insert({
      code_hash: sha256(code),
      user_id: userId,
      client_id: clientId || DEFAULT_CLIENT_ID,
      redirect_uri: redirectUri || null,
      scope: scopes.join(' '),
      code_challenge: codeChallenge || null,
      expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString()
    });
    if (error) throw error;
    return code;
  }

  /**
   * Exchange an authorization code (+ PKCE verifier) for tokens.
   * The code is deleted on ANY successful or failed verification —
   * single use, replay always fails.
   */
  async exchangeCodeForTokens({ code, clientId, redirectUri, codeVerifier }) {
    if (!code) throw new Error('invalid_grant');

    const { data, error } = await adminClient
      .from('mcp_oauth_codes')
      .select('*')
      .eq('code_hash', sha256(code))
      .maybeSingle();

    // Delete first — the code burns whether or not verification passes.
    if (data?.id) {
      await adminClient.from('mcp_oauth_codes').delete().eq('id', data.id);
    }
    if (error || !data) throw new Error('invalid_grant');
    if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('invalid_grant');
    if ((data.client_id || DEFAULT_CLIENT_ID) !== (clientId || DEFAULT_CLIENT_ID)) throw new Error('invalid_grant');
    // redirect_uri is required in the exchange if it was used in authorize
    if (data.redirect_uri && (redirectUri || '') !== data.redirect_uri) throw new Error('invalid_grant');
    if (!this._pkceOk(codeVerifier, data.code_challenge, 'S256')) throw new Error('invalid_grant');

    return this._issueTokens(data.user_id, data.scope);
  }

  /** Exchange a refresh token for a new access token (rotates it). */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) throw new Error('invalid_grant');

    const { data, error } = await adminClient
      .from('mcp_oauth_tokens')
      .select('id, user_id, scope, expires_at')
      .eq('refresh_hash', sha256(refreshToken))
      .maybeSingle();

    if (error || !data) throw new Error('invalid_grant');
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await adminClient.from('mcp_oauth_tokens').delete().eq('id', data.id);
      throw new Error('invalid_grant');
    }

    // Rotate: the presented refresh token dies now.
    await adminClient.from('mcp_oauth_tokens').delete().eq('id', data.id);
    return this._issueTokens(data.user_id, data.scope);
  }

  async _issueTokens(userId, scope) {
    const accessToken = crypto.randomBytes(32).toString('base64url');
    const refreshToken = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();

    // `scope` comes from OUR stored rows (auth code / previous refresh
    // token), so parse it WITHOUT the client-facing normalizer — calling
    // normalizeScope() here silently stripped the server-granted 'admin'
    // and every issued token came out student-only (production regression).
    let scopes = parseStoredScopes(scope);
    // Re-verify the role at ISSUE time too: the admin scope in `scope`
    // only survives if the account is still an admin right now. A user
    // demoted between consent and exchange gets a student-only token.
    if (scopes.includes(ADMIN_SCOPE)) {
      const { data: profile, error: roleErr } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (roleErr) throw roleErr;
      if (profile?.role !== 'admin') scopes = scopes.filter(s => s !== ADMIN_SCOPE);
    }

    const { error } = await adminClient.from('mcp_oauth_tokens').insert({
      user_id: userId,
      access_hash: sha256(accessToken),
      refresh_hash: sha256(refreshToken),
      scope: scopes.join(' '),
      expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
      last_used_at: null,
      revoked_at: null
    });
    if (error) throw error;

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refreshToken,
      scope: scopes.join(' ')
    };
  }

  /**
   * Verify an access token presented to the MCP RPC endpoint.
   * Returns { userId, scope } or null. The scope comes from the stored
   * row and keeps every server-granted value (parseStoredScopes — unlike
   * the client-facing normalizeScope — does not strip 'admin').
   */
  async verifyAccessToken(accessToken) {
    if (!accessToken || typeof accessToken !== 'string') return null;

    const { data, error } = await adminClient
      .from('mcp_oauth_tokens')
      .select('user_id, scope, expires_at, revoked_at')
      .eq('access_hash', sha256(accessToken))
      .maybeSingle();

    if (error) throw error;
    if (!data || data.revoked_at) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return { userId: data.user_id, scope: parseStoredScopes(data.scope) };
  }

  /** Stamp usage (fire-and-forget). */
  async touchLastUsed(accessToken) {
    try {
      await adminClient.from('mcp_oauth_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('access_hash', sha256(accessToken))
        .is('revoked_at', null);
    } catch { /* non-fatal */ }
  }

  /** Revoke ALL tokens for a user ("Disconnect" button / account offboard). */
  async revokeAllForUser(userId) {
    const { data, error } = await adminClient
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .select('id');
    if (error) throw error;
    return { revoked: (data || []).length };
  }

  /** Non-secret status for the settings page. */
  async getStatus(userId) {
    const { data, error } = await adminClient
      .from('mcp_oauth_tokens')
      .select('id, scope, created_at, last_used_at, revoked_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const rows = data || [];
    const active = rows.filter(r => !r.revoked_at);
    return {
      connected: active.length > 0,
      active_connections: active.length,
      scope: active[0]?.scope || null,
      created_at: active[0]?.created_at || null,
      last_used_at: active[0]?.last_used_at || null
    };
  }
}

module.exports = new McpOAuthService();
module.exports.VALID_SCOPES = VALID_SCOPES;
module.exports.ADMIN_SCOPE = ADMIN_SCOPE;
module.exports.parseStoredScopes = parseStoredScopes;
module.exports.DEFAULT_CLIENT_ID = DEFAULT_CLIENT_ID;
module.exports.isValidRedirectUri = isValidRedirectUri;
module.exports.normalizeRedirectUris = normalizeRedirectUris;
module.exports.normalizeRequestedScopes = normalizeRequestedScopes;
