/**
 * services/studentMcpService.js
 *
 * PURPOSE:
 *   Legacy student MCP paste-tokens: creation, sha256 hash storage, prefix display, last_used
 *   tracking, and revocation.
 * DEPENDENCIES: crypto
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const crypto = require('crypto');
const { adminClient } = require('../config/database');

const TOKEN_PREFIX = 'sk-mcp-';

class StudentMcpService {

  /** SHA-256 hex digest of a token string. */
  _hash(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  }

  /** Human-safe display form: first 12 chars + ellipsis. */
  _displayPrefix(token) {
    return String(token).slice(0, 12);
  }

  /**
   * Generate (or rotate) the student's MCP token.
   * Returns the full token ONCE — it is never stored in plaintext.
   */
  async generateToken(userId, label = 'Claude') {
    const token = TOKEN_PREFIX + crypto.randomBytes(16).toString('hex');
    const tokenHash = this._hash(token);
    const tokenPrefix = this._displayPrefix(token);

    // One active token per student — replace any existing row.
    const { data, error } = await adminClient
      .from('student_mcp_tokens')
      .upsert({
        user_id: userId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        label,
        created_at: new Date().toISOString(),
        last_used_at: null,
        revoked_at: null
      }, { onConflict: 'user_id' })
      .select('id, token_prefix, label, created_at')
      .single();

    if (error) throw error;

    return { token, meta: data }; // `token` shown once, then gone forever
  }

  /** Resolve a token to its owner's user_id, or null. */
  async verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    if (!token.startsWith(TOKEN_PREFIX)) return null;

    const { data, error } = await adminClient
      .from('student_mcp_tokens')
      .select('user_id, revoked_at')
      .eq('token_hash', this._hash(token))
      .maybeSingle();

    if (error) throw error;
    if (!data || data.revoked_at) return null;
    return data.user_id;
  }

  /** Mark the token as used (fire-and-forget from the MCP endpoint). */
  async touchLastUsed(userId) {
    try {
      await adminClient.from('student_mcp_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null);
    } catch { /* non-fatal */ }
  }

  /** Revoke the student's active token (idempotent). */
  async revokeToken(userId) {
    const { data, error } = await adminClient
      .from('student_mcp_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    return { revoked: !!data };
  }

  /** Non-secret status for the settings page. */
  async getStatus(userId) {
    const { data, error } = await adminClient
      .from('student_mcp_tokens')
      .select('token_prefix, label, created_at, last_used_at, revoked_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { connected: false };

    return {
      connected: !data.revoked_at,
      token_prefix: data.token_prefix,
      label: data.label,
      created_at: data.created_at,
      last_used_at: data.revoked_at ? null : data.last_used_at,
      revoked: !!data.revoked_at
    };
  }
}

module.exports = new StudentMcpService();
