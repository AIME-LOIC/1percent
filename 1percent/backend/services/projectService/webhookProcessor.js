/**
 * services/projectService/webhookProcessor.js
 *
 * PURPOSE:
 *   Idempotency wrapper for GitHub webhook deliveries (Phase 2). Every
 *   delivery id (X-GitHub-Delivery) is recorded in github_webhook_events;
 *   duplicates are acknowledged (200) but NOT reprocessed. Processing is
 *   deferred to setImmediate so the webhook responds quickly.
 *
 * EXPORTS: handleWebhook
 * DEPENDENCIES: ./activity.js, ../logService, ../config/database
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { adminClient } = require('../../config/database');
const activityEngine = require('./activity');
const logService = require('../logService');

/**
 * @param {string} event        X-GitHub-Event header
 * @param {string} deliveryId   X-GitHub-Delivery header
 * @param {object} payload      parsed JSON body
 */
async function handleWebhook(event, deliveryId, payload) {
  // 1. Idempotency: insert the delivery row first — the unique(delivery_id)
  //    constraint is the lock. If it already exists, this delivery is a
  //    duplicate redelivery from GitHub: acknowledge, do nothing.
  const repoId = payload?.repository?.id || null;
  const action = payload?.action || '';

  const { data: inserted, error: insertErr } = await adminClient
    .from('github_webhook_events')
    .insert({
      delivery_id: deliveryId,
      event,
      action,
      repository_id: repoId,
      processed: false,
      // Trimmed, secret-free metadata subset only — full payloads can be huge.
      payload: {
        repository: payload?.repository ? { id: payload.repository.id, full_name: payload.repository.full_name } : null,
        sender: payload?.sender?.login || null,
        action
      }
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // Unique violation = duplicate delivery
    if (insertErr.code === '23505') {
      logService.logEvent({
        level: 'info',
        event: 'github_webhook_duplicate',
        message: `Duplicate delivery ${event}/${deliveryId} ignored`
      }).catch(() => {});
      return { duplicate: true };
    }
    throw insertErr;
  }

  // 2. Respond fast, process async.
  setImmediate(async () => {
    try {
      const recorded = await activityEngine.processWebhookEvent(event, payload);
      await adminClient
        .from('github_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', inserted.id);

      logService.logEvent({
        level: 'info',
        event: 'github_webhook_processed',
        message: `${event}${action ? `.${action}` : ''} processed`,
        metadata: { delivery_id: deliveryId, event, action, recorded }
      }).catch(() => {});
    } catch (err) {
      await adminClient
        .from('github_webhook_events')
        .update({ processed: false, error: String(err.message || err).slice(0, 500) })
        .eq('id', inserted.id)
        .catch(() => {});

      logService.logEvent({
        level: 'error',
        event: 'github_webhook_failed',
        message: `${event} processing failed: ${err.message}`,
        metadata: { delivery_id: deliveryId, event }
      }).catch(() => {});
    }
  });

  return { duplicate: false, eventId: inserted.id };
}

module.exports = { handleWebhook };
