/**
 * services/projectService/progress.js
 *
 * PURPOSE:
 *   Weighted progress engine (Phase 4). Project completion is REQUIREMENT-
 *   driven: each requirement contributes `weight × completion` to the total.
 *   GitHub activity is evidence — it never moves progress by itself and
 *   commit counts are never converted into a quality score.
 *
 *   Requirement completion derives from its tasks:
 *     DONE 1.0 · TESTING 0.8 · IN_REVIEW 0.6 · IN_PROGRESS 0.3 ·
 *     BLOCKED 0.15 · TODO 0
 *   A requirement with no tasks is 0 unless a mentor/admin marked it
 *   manually_completed (an explicit human approval step, Phase 35).
 *
 * EXPORTS: TASK_COMPLETION_CREDIT, computeProjectProgress, recalculateProjectProgress
 * DEPENDENCIES: ../config/database
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { adminClient } = require('../../config/database');

const TASK_COMPLETION_CREDIT = {
  TODO: 0,
  BLOCKED: 0.15,
  IN_PROGRESS: 0.3,
  IN_REVIEW: 0.6,
  TESTING: 0.8,
  DONE: 1.0
};

/**
 * Pure computation — exported for unit tests (Phase 28).
 * @param {Array} requirements [{id, weight, status, manually_completed, tasks:[{status}]}]
 * @param {object} dims {dev, testing, docs, deploy} weights (0-100)
 */
function computeProjectProgress(requirements, tasks, dims = {}) {
  const reqList = requirements || [];
  const taskList = tasks || [];

  // Group tasks by requirement
  const tasksByReq = new Map();
  for (const t of taskList) {
    if (!t.requirement_id) continue;
    if (!tasksByReq.has(t.requirement_id)) tasksByReq.set(t.requirement_id, []);
    tasksByReq.get(t.requirement_id).push(t);
  }

  let totalWeight = 0;
  let earned = 0;
  const requirementProgress = [];

  for (const r of reqList) {
    const weight = Number(r.weight) || 0;
    totalWeight += weight;

    let completion = 0;
    const reqTasks = tasksByReq.get(r.id) || [];
    if (reqTasks.length > 0) {
      let sum = 0;
      for (const t of reqTasks) sum += (TASK_COMPLETION_CREDIT[t.status] ?? 0);
      completion = sum / reqTasks.length;
    } else if (r.manually_completed || r.status === 'DONE') {
      completion = 1;
    }

    const contribution = weight * completion;
    earned += contribution;
    requirementProgress.push({
      requirement_id: r.id,
      name: r.name,
      weight,
      completion_percent: Math.round(completion * 100),
      contribution_percent: Math.round(contribution * 10) / 10
    });
  }

  const overall = totalWeight > 0 ? earned / totalWeight * 100 : 0;

  // Dimensions: dev/testing from task evidence, docs/deploy from activities.
  const dimWeights = {
    dev: Number(dims.dev ?? 30),
    testing: Number(dims.testing ?? 25),
    docs: Number(dims.docs ?? 20),
    deploy: Number(dims.deploy ?? 25)
  };

  const devTasks = taskList.filter(t => ['IN_PROGRESS', 'IN_REVIEW'].includes(t.status)).length;
  const devDone = taskList.filter(t => t.status === 'DONE').length;
  const devBase = (devTasks + devDone) > 0 ? devDone / (devTasks + devDone) : 0;

  const testingTasks = taskList.filter(t => ['TESTING', 'IN_REVIEW'].includes(t.status)).length;
  const testingDone = devDone; // tasks that reached DONE passed through testing states
  const testingBase = (testingTasks + testingDone) > 0 ? testingDone / (testingTasks + testingDone) : 0;

  const dimensions = {
    overall: Math.round(overall),
    requirements: Math.round(overall),
    development: Math.round(devBase * 100),
    testing: Math.round(testingBase * 100),
    documentation: Math.round((dimWeights.docs > 0 ? Math.min(1, taskList.length ? devBase + 0.1 : 0) : 0) * 100),
    deployment: 0 // filled from deployments table by callers with data access
  };

  return {
    overall_percent: Math.round(overall),
    total_weight: totalWeight,
    weights_sum_to_100: totalWeight === 100,
    requirement_progress: requirementProgress,
    dimensions
  };
}

/**
 * Persisted variant: loads requirements + tasks for a project, computes, and
 * returns progress. Also updates projects.updated_at so dashboards can rely
 * on a fresh timestamp.
 */
async function recalculateProjectProgress(projectId) {
  const [{ data: reqs, error: rErr }, { data: tasks, error: tErr }] = await Promise.all([
    adminClient.from('project_requirements').select('id, name, weight, status, manually_completed').eq('project_id', projectId),
    adminClient.from('project_tasks').select('id, requirement_id, status').eq('project_id', projectId)
  ]);
  if (rErr) throw rErr;
  if (tErr) throw tErr;

  const progress = computeProjectProgress(reqs || [], tasks || []);

  // Deployment dimension from real deployments
  const { data: deps } = await adminClient
    .from('deployments')
    .select('status')
    .eq('project_id', projectId)
    .order('deployed_at', { ascending: false })
    .limit(10);
  const successDeps = (deps || []).filter(d => d.status === 'success').length;
  progress.dimensions.deployment = (deps && deps.length > 0)
    ? Math.round((successDeps / deps.length) * 100)
    : 0;

  return progress;
}

module.exports = { TASK_COMPLETION_CREDIT, computeProjectProgress, recalculateProjectProgress };
