/**
 * services/github/index.js
 *
 * PURPOSE:
 *   Facade for the GitHub App service layer. Also owns the webhook signature
 *   verification (HMAC-SHA256 over the RAW request body) — the single most
 *   security-critical line of the integration.
 *
 * EXPORTS: app (auth), repositories, issues, pullRequests, activity,
 *          verifyWebhookSignature
 * DEPENDENCIES: crypto
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const crypto = require('crypto');

const app = require('./app');
const repositories = require('./repositories');
const issues = require('./issues');
const pullRequests = require('./pullRequests');
const activity = require('./activity');

/**
 * Verify X-Hub-Signature-256 against the raw body.
 * MUST be called with the raw (unparsed) body bytes — verifying against a
 * re-serialized JSON object fails because key order/whitespace differ.
 *
 * @param {string} signatureHeader - value of X-Hub-Signature-256 ("sha256=…")
 * @param {Buffer|string} rawBody  - raw request body
 * @returns {boolean}
 */
function verifyWebhookSignature(signatureHeader, rawBody) {
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  if (!secret) return false;

  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b); // constant-time compare
}

module.exports = {
  app,
  repositories,
  issues,
  pullRequests,
  activity,
  verifyWebhookSignature
};
