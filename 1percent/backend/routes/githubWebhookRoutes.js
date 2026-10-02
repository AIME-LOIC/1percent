/**
 * routes/githubWebhookRoutes.js
 *
 * PURPOSE:
 *   Public GitHub webhook endpoint (Phase 2). Mounted in backend/index.js
 *   BEFORE express.json() so the raw body survives for HMAC verification.
 *   Verifies X-Hub-Signature-256 (HMAC-SHA256, constant-time), rejects
 *   invalid signatures with 401 + a security event, and hands off to the
 *   idempotent processor.
 *
 * ENDPOINTS:
 *   POST /webhooks/github   (path given at mount time)
 *
 * EXPORTS: githubWebhookRouter
 * DEPENDENCIES: express, ../services/github, ../services/projectService/webhookProcessor
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const github = require('../services/github');
const { handleWebhook } = require('../services/projectService/webhookProcessor');
const logService = require('../services/logService');

const router = Router();

/* Raw-body capture — replaces the parsed body with the raw bytes for
   signature verification. Runs before express.json() consumes the stream. */
router.use((req, res, next) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', () => res.status(400).json({ error: 'Bad request' }));
});

router.post('/', (req, res) => {
  const event = req.headers['x-github-event'] || '';
  const deliveryId = req.headers['x-github-delivery'] || '';
  const signature = req.headers['x-hub-signature-256'] || '';

  if (!event || !deliveryId) {
    return res.status(400).json({ error: 'Missing GitHub headers' });
  }

  // Signature verification — against the RAW body, never the parsed JSON.
  if (!github.verifyWebhookSignature(signature, req.rawBody)) {
    logService.logEvent({
      level: 'warning',
      event: 'github_webhook_rejected',
      message: 'Invalid webhook signature',
      metadata: { event, delivery_id: deliveryId } // never log the signature or secret
    }).catch(() => {});
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(req.rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  handleWebhook(event, deliveryId, payload)
    .then(result => res.status(200).json({ ok: true, duplicate: !!result.duplicate }))
    .catch(err => {
      console.error('[WEBHOOK] Processing error:', err.message);
      res.status(200).json({ ok: true }); // still acknowledge; GitHub retries otherwise
    });
});

module.exports = { githubWebhookRouter: router };
