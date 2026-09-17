/**
 * workers/aiRetrainCron.js
 *
 * PURPOSE:
 *   Scheduled offline retraining: reads graded submission corpus, calls ai/train.js, writes a new
 *   ai/model.json version row (ai_model_versions) for inspect/revert.
 *
 * EXPORTS: startAiRetrainCron, retrainOnce
 * DEPENDENCIES: node-cron
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

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
