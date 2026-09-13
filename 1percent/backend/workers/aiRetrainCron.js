/* ============================================================
   AI Model Nightly Retrain Cron
   ============================================================
   Schedules the training pipeline (backend/ai/train.js) once
   daily at 03:30 Africa/Kigali — an off-peak hour chosen to be
   well after the streak cron (00:10) and before the morning
   learning rush.

   What it does each night:
     1. Re-reads the FULL course corpus from Supabase (courses,
        lessons, challenges) plus the latest solved submissions.
     2. Compiles a fresh model.json (the reviewer hot-reloads it
        on its next review — no restart needed).
     3. Records the run in ai_model_versions for auditability.

   Started from server.js only — not from backend/index.js — so
   importing the app for tests doesn't schedule a real cron as a
   side effect (same rule as streakCron.js).
   ============================================================ */

const cron = require('node-cron');
const { adminClient } = require('../config/database');

const CRON_EXPRESSION = '30 3 * * *';
const TIMEZONE = 'Africa/Kigali';

async function retrainOnce(trigger = 'cron') {
  const { trainModel, MODEL_PATH } = require('../ai/train');
  const model = await trainModel({ verbose: false });
  try {
    await adminClient.from('ai_model_versions').insert({
      version: model.version || 1,
      stats: model.stats || {},
      notes: `auto-retrain (${trigger}): courses=${model.stats?.courses} challenges=${model.stats?.challenges} vocab=${model.stats?.vocabulary}`,
    });
  } catch (err) {
    // Audit row is best-effort — a missing table must not stop training
    console.warn('[AI-RETRAIN] could not record model version:', err.message);
  }
  console.log(`[AI-RETRAIN] model rebuilt (${trigger}):`, MODEL_PATH);
  return model;
}

function startAiRetrainCron() {
  cron.schedule(CRON_EXPRESSION, async () => {
    console.log('[AI-RETRAIN] nightly retrain starting at', new Date().toISOString());
    try {
      await retrainOnce('cron');
    } catch (err) {
      console.error('[AI-RETRAIN] nightly retrain failed (model.json unchanged):', err.message);
    }
  }, { timezone: TIMEZONE });

  console.log(`[AI-RETRAIN] Scheduled nightly model retrain at 03:30 ${TIMEZONE}`);
}

module.exports = { startAiRetrainCron, retrainOnce };
