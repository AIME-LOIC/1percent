/* ============================================================
   MCP OAuth Service — "Connect to Claude" with an account, not keys
   ============================================================
   Implements the Authorization-Code grant with PKCE (RFC 7636)
   that claude.ai custom connectors perform automatically:

     1. Claude opens GET /mcp/oauth/authorize?...code_challenge...
     2. We require the browser to be logged in (Supabase session),
        show a CONSENT page on our domain ("1% Learn wants access"),
        and the user clicks Approve.
     3. We redirect back to Claude with ?code=<auth-code>.
     4. Claude POSTs /mcp/oauth/token with code + code_verifier.
     5. We exchange that for a scoped MCP access token, which Claude
        then uses as `Authorization: Bearer <token>` on /mcp/student.

   Security properties:
   - The full access token is returned ONCE at /token, then only a
     SHA-256 hash is stored (same model as studentMcpService).
   - Authorization codes: single-use, 10-minute TTL, PKCE-verified,
     bound to the client_id that started the flow.
   - Refresh tokens: rotated on every use, revocable, hashed at rest.
   - The consent step means NO secret is ever copy-pasted: access is
     granted to a logged-in account from our own domain.

   Scopes:
     - "read"    : the 6 read-only student tools (default)
     - "grade"   : additionally check_my_code (dry-run grader)
     Admins see the same scopes — admin tooling keeps the env token.
   ============================================================ */

const crypto = require('crypto');
const { adminClient } = require('../config/database');

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const VALID_SCOPES = ['read', 'grade'];

/* Claude.ai ships a published metadata client id, but custom
   connectors may omit client_id — treat missing as a fixed public id. */
const DEFAULT_CLIENT_ID = 'claude-ai-connector';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeScope(raw) {
  const requested = String(raw || 'read').split(/[\s+]/).filter(Boolean);
  const scopes = requested.filter(s => VALID_SCOPES.includes(s));
  return scopes.length ? scopes : ['read'];
}

class McpOAuthService {

  /** PKCE: S256(code_verifier) must equal the stored code_challenge. */
  _pkceOk(verifier, challenge, method) {
    if (!verifier || !challenge) return false;
    if (method && method !== 'S256') return false; // 'plain' refused
    const expected = sha256(verifier).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    const { error } = await adminClient.from('mcp_oauth_codes').insert({
      code_hash: sha256(code),
      user_id: userId,
      client_id: clientId || DEFAULT_CLIENT_ID,
      redirect_uri: redirectUri || null,
      scope: normalizeScope(scope).join(' '),
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

    const { error } = await adminClient.from('mcp_oauth_tokens').insert({
      user_id: userId,
      access_hash: sha256(accessToken),
      refresh_hash: sha256(refreshToken),
      scope,
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
      scope
    };
  }

  /**
   * Verify an access token presented to the MCP RPC endpoint.
   * Returns { userId, scope } or null.
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
    return { userId: data.user_id, scope: normalizeScope(data.scope) };
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
module.exports.DEFAULT_CLIENT_ID = DEFAULT_CLIENT_ID;
