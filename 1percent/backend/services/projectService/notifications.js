/**
 * services/projectService/notifications.js
 *
 * PURPOSE:
 *   Thin wrapper over the EXISTING notifications table (Phase 24). Deliberately
 *   quiet: only meaningful state changes notify (task assigned, changes
 *   requested, milestone completed, project status changed). GitHub events do
 *   NOT notify — they appear as activity, avoiding spam.
 *
 * EXPORTS: notifyUserSafe, notifyProjectStatus
 * DEPENDENCIES: ../../config/database
 *
 * Data model: database_consolidated.sql (notifications) · docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { adminClient } = require('../../config/database');

/** Best-effort insert — never throws (notifications must not break flows). */
async function notifyUserSafe(userId, title, message, type = 'info') {
  if (!userId) return;
  try {
    await adminClient.from('notifications').insert({ user_id: userId, title, message, type });
  } catch { /* non-fatal */ }
}

const STATUS_MESSAGES = {
  PLANNING: 'Your project entered planning.',
  IN_DEVELOPMENT: 'Development started on your project.',
  TESTING: 'Your project is in testing.',
  DEPLOYMENT: 'Your project is being deployed.',
  DELIVERED: 'Your project was delivered. 🎉',
  BLOCKED: 'Your project is blocked — the team is on it.'
};

async function notifyProjectStatus(project, status) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  try {
    const { data: members } = await adminClient
      .from('project_assignments')
      .select('user_id')
      .eq('project_id', project.id)
      .is('ended_at', null);
    for (const m of members || []) {
      await notifyUserSafe(m.user_id, `Project ${status.replace('_', ' ').toLowerCase()}`, `${project.name}: ${msg}`, status === 'BLOCKED' ? 'warning' : 'info');
    }
  } catch { /* non-fatal */ }
}

module.exports = { notifyUserSafe, notifyProjectStatus };
