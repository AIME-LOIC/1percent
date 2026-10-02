/**
 * services/github/app.js
 *
 * PURPOSE:
 *   GitHub App authentication — sign short-lived App JWTs and mint installation
 *   access tokens (cached until 5 min before expiry). Credentials come ONLY
 *   from server environment variables; this module must never be imported by
 *   anything that reaches the browser.
 *
 * EXPORTS: getAppJwt, getInstallationToken, isConfigured, configSummary
 * DEPENDENCIES: crypto (built-in), global fetch (Node 18+)
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const crypto = require('crypto');

/* ── Config (server-only) ───────────────────────────────────── */
const APP_ID = process.env.GITHUB_APP_ID || '';
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID || '';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

/**
 * The private key may be provided raw (PEM with \n newlines) or base64
 * (some hosts mangle multi-line env vars). Never logged.
 */
function getPrivateKey() {
  const raw = process.env.GITHUB_PRIVATE_KEY || '';
  if (!raw) return '';
  if (raw.includes('-----BEGIN')) return raw.replace(/\\n/g, '\n');
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN')) return decoded;
  } catch { /* not base64 — fall through */ }
  return raw;
}

function isConfigured() {
  return Boolean(APP_ID && INSTALLATION_ID && getPrivateKey());
}

/** Safe-to-log summary: never includes the key or secret. */
function configSummary() {
  return {
    app_id_configured: Boolean(APP_ID),
    installation_id_configured: Boolean(INSTALLATION_ID),
    private_key_configured: Boolean(getPrivateKey()),
    webhook_secret_configured: Boolean(WEBHOOK_SECRET)
  };
}

/* ── App JWT ─────────────────────────────────────────────────── */
/* RS256 JWT, exp ≤ 10 min (GitHub's max), iat with 60s clock skew. */

let cachedJwt = null; // { token, expiresAtMs }

function getAppJwt() {
  if (cachedJwt && Date.now() < cachedJwt.expiresAtMs) return cachedJwt.token;

  const key = getPrivateKey();
  if (!key || !APP_ID) throw new Error('GitHub App not configured (GITHUB_APP_ID / GITHUB_PRIVATE_KEY)');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: APP_ID };

  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(key, 'base64url');

  const token = `${signingInput}.${signature}`;
  cachedJwt = { token, expiresAtMs: (now + 8 * 60) * 1000 }; // refresh 1 min early
  return token;
}

/* ── Installation tokens ─────────────────────────────────────── */

const GITHUB_API = 'https://api.github.com';

let cachedInstallationToken = null; // { token, expiresAtMs }

async function getInstallationToken() {
  if (cachedInstallationToken && Date.now() < cachedInstallationToken.expiresAtMs - 5 * 60 * 1000) {
    return cachedInstallationToken.token;
  }

  const jwt = getAppJwt();
  const res = await fetch(`${GITHUB_API}/app/installations/${INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects'
    }
  });

  if (!res.ok) {
    await res.text().catch(() => ''); // consume body; never logged (may echo config)
    throw new Error(`GitHub installation token request failed (${res.status})`);
  }

  const data = await res.json();
  cachedInstallationToken = {
    token: data.token,
    expiresAtMs: new Date(data.expires_at).getTime()
  };
  return data.token;
}

module.exports = { getAppJwt, getInstallationToken, isConfigured, configSummary, INSTALLATION_ID, APP_ID };
