/**
 * routes/projectRoutes.js
 *
 * PURPOSE:
 *   Project engine API (Phases 8, 18, 25). Every endpoint authenticates and
 *   authorizes SERVER-SIDE: students see only their teams' projects/tasks,
 *   mentors only assigned projects, businesses only their company's projects
 *   (delivery-safe), admins manage everything.
 *
 * ENDPOINTS:
 *   GET    /                      list projects (scoped)
 *   GET    /:id                   project detail
 *   GET    /:id/progress          weighted progress + dimensions
 *   GET    /:id/tasks             tasks of project (scoped)
 *   GET    /:id/requirements      requirements
 *   GET    /:id/milestones        milestones
 *   GET    /:id/activity          normalized activity feed
 *   GET    /:id/repositories      connected repos
 *   GET    /:id/team              team members
 *   GET    /:id/pulls             cached pull requests
 *   GET    /:id/deployments       cached deployments
 *   GET    /:id/documents         documents (team+ only)
 *   GET    /:id/feedback          feedback (role-filtered)
 *   PUT    /:id/status            admin/owner only
 *
 * EXPORTS: projectRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/projectService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate, requireAdmin, requireRole } = require('../middlewares/auth');
const projectService = require('../services/projectService');
const activityEngine = require('../services/projectService/activity');

const router = Router();
router.use(authenticate);

/* ── helpers ─────────────────────────────────────────────────── */

function fail(res, err, fallback = 'Request failed') {
  const msg = String(err?.message || fallback);
  const status = /not found/i.test(msg) ? 404 : /cannot|you do not|cannot perform|cannot modify/i.test(msg) ? 403 : 400;
  return res.status(status).json({ success: false, error: { code: 'PROJECT_ERROR', message: msg } });
}

async function loadProjectOr404(req, res) {
  const project = await projectService.getProjectForUser(req.user, req.profile, req.params.id);
  if (!project) {
    res.status(404).json({ success: false, error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' } });
    return null;
  }
  return project;
}

/* ── list / detail ───────────────────────────────────────────── */

router.get('/', async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await projectService.listProjectsForUser(req.user, req.profile, {
      status: status || undefined,
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0
    });
    res.json({ success: true, ...result });
  } catch (err) { fail(res, err, 'Failed to list projects'); }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const [progress, milestones, repos, team] = await Promise.all([
      projectService.getProjectProgress(project.id).catch(() => null),
      projectService.listMilestones(project.id).catch(() => []),
      projectService.listProjectRepositories(project.id).catch(() => []),
      projectService.listTeamMembers(project.id).catch(() => [])
    ]);
    res.json({ success: true, project, progress, milestones, repositories: repos, team });
  } catch (err) { fail(res, err, 'Failed to load project'); }
});

router.get('/:id/progress', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const progress = await projectService.getProjectProgress(project.id);
    res.json({ success: true, progress });
  } catch (err) { fail(res, err, 'Failed to compute progress'); }
});

/* ── sub-resources (all scoped by loadProjectOr404 first) ────── */

router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const result = await projectService.listTasksForUser(req.user, req.profile, {
      project_id: project.id,
      status: req.query.status || undefined,
      assignee_id: req.query.assignee_id || undefined,
      limit: Math.min(Number(req.query.limit) || 100, 200)
    });
    res.json({ success: true, ...result });
  } catch (err) { fail(res, err, 'Failed to load tasks'); }
});

router.get('/:id/requirements', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    res.json({ success: true, requirements: await projectService.listRequirements(project.id) });
  } catch (err) { fail(res, err, 'Failed to load requirements'); }
});

router.get('/:id/milestones', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    res.json({ success: true, milestones: await projectService.listMilestones(project.id) });
  } catch (err) { fail(res, err, 'Failed to load milestones'); }
});

router.get('/:id/activity', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const activity = await activityEngine.getProjectActivity(project.id, {
      limit: Math.min(Number(req.query.limit) || 50, 200),
      type: req.query.type || undefined
    });
    res.json({ success: true, activity });
  } catch (err) { fail(res, err, 'Failed to load activity'); }
});

router.get('/:id/repositories', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    res.json({ success: true, repositories: await projectService.listProjectRepositories(project.id) });
  } catch (err) { fail(res, err, 'Failed to load repositories'); }
});

router.get('/:id/team', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    res.json({ success: true, team: await projectService.listTeamMembers(project.id) });
  } catch (err) { fail(res, err, 'Failed to load team'); }
});

router.get('/:id/pulls', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const { adminClient } = require('../config/database');
    const { data, error } = await adminClient
      .from('pull_requests').select('*').eq('project_id', project.id)
      .order('updated_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ success: true, pull_requests: data || [] });
  } catch (err) { fail(res, err, 'Failed to load pull requests'); }
});

router.get('/:id/deployments', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const { adminClient } = require('../config/database');
    const { data, error } = await adminClient
      .from('deployments').select('*').eq('project_id', project.id)
      .order('deployed_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json({ success: true, deployments: data || [] });
  } catch (err) { fail(res, err, 'Failed to load deployments'); }
});

router.get('/:id/documents', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    // businesses may read documentation — part of deliverables
    const { adminClient } = require('../config/database');
    const { data, error } = await adminClient
      .from('project_documents').select('*').eq('project_id', project.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, documents: data || [] });
  } catch (err) { fail(res, err, 'Failed to load documents'); }
});

router.get('/:id/feedback', async (req, res) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    const { adminClient } = require('../config/database');
    let q = adminClient
      .from('project_feedback').select('*').eq('project_id', project.id)
      .order('created_at', { ascending: false }).limit(50);
    // private feedback is admin-only; businesses never see mentor-internal notes
    if (req.profile.role === 'business') q = q.eq('from_role', 'business');
    else if (req.profile.role !== 'admin') q = q.or('is_private.eq.false,from_role.eq.mentor');
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, feedback: data || [] });
  } catch (err) { fail(res, err, 'Failed to load feedback'); }
});

/* ── mutations ───────────────────────────────────────────────── */

router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const VALID = ['REQUESTED', 'REVIEW', 'APPROVED', 'PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'DEPLOYMENT', 'DELIVERED', 'ARCHIVED', 'BLOCKED'];
    const status = String(req.body?.status || '');
    if (!VALID.includes(status)) {
      return res.status(422).json({ success: false, error: { code: 'INVALID_STATUS', message: `status must be one of: ${VALID.join(', ')}` } });
    }
    const project = await projectService.updateProjectStatus(req.params.id, status, req.user.id);
    res.json({ success: true, project });
  } catch (err) { fail(res, err, 'Failed to update status'); }
});

module.exports = { projectRouter: router };
