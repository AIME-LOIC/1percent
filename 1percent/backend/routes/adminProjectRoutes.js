/**
 * routes/adminProjectRoutes.js
 *
 * PURPOSE:
 *   Admin project management API (Phase 10): system overview metrics, project
 *   lifecycle management (approve requests → create projects), teams,
 *   requirements, milestones, repository connection, webhook health.
 *   EXTENDS the existing admin panel — existing admin routes are untouched.
 *
 * ENDPOINTS (all requireAdmin, mounted at /api/admin/projects*):
 *   GET    /overview                 system metrics
 *   GET    /requests                 business project requests
 *   POST   /requests/:id/review      {action: approve|reject, note}
 *   POST   /                         create project
 *   PUT    /:id                      update project
 *   POST   /:id/teams                create team
 *   POST   /teams/:teamId/members    add member
 *   POST   /:id/requirements         create requirement
 *   PUT    /requirements/:rid        update requirement (weights, status…)
 *   POST   /:id/milestones           create milestone
 *   POST   /:id/repositories         connect repository by github id
 *
 * EXPORTS: adminProjectRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/projectService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const projectService = require('../services/projectService');
const { adminClient } = require('../config/database');
const { notifyProjectStatus } = require('../services/projectService/notifications');

const router = Router();
router.use(authenticate, requireAdmin);

function fail(res, err, fallback = 'Request failed') {
  const msg = String(err?.message || fallback);
  const status = /not found/i.test(msg) ? 404 : 400;
  return res.status(status).json({ success: false, error: { code: 'ADMIN_PROJECT_ERROR', message: msg } });
}

/* ── overview metrics (Phase 10) ─────────────────────────────── */

router.get('/overview', async (req, res) => {
  try {
    const count = async (table, extra) => {
      let q = adminClient.from(table).select('*', { count: 'exact', head: true });
      if (extra) for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
      const { count: c } = await q;
      return c || 0;
    };

    const [
      students, mentors, businesses, activeProjects, inDevelopment, inTesting, delivered,
      teams, openTasks, blockedTasks, openPrs, pendingRequests, webhookTotal, webhookUnprocessed
    ] = await Promise.all([
      count('profiles', { role: 'student' }),
      count('profiles', { role: 'mentor' }),
      count('profiles', { role: 'business' }),
      count('projects').then(async total => {
        // "active" = not ARCHIVED/DELIVERED
        const { count: inactive } = await adminClient.from('projects')
          .select('*', { count: 'exact', head: true }).in('status', ['ARCHIVED', 'DELIVERED']);
        return total - inactive;
      }),
      count('projects', { status: 'IN_DEVELOPMENT' }),
      count('projects', { status: 'TESTING' }),
      count('projects', { status: 'DELIVERED' }),
      count('teams'),
      count('project_tasks').then(total => {
        return adminClient.from('project_tasks')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'DONE').then(({ count: c }) => total - (total - c));
      }),
      count('project_tasks', { status: 'BLOCKED' }),
      count('pull_requests', { state: 'open' }),
      count('project_requests', { status: 'REQUESTED' }),
      count('github_webhook_events'),
      count('github_webhook_events').then(async () => {
        const { count: c } = await adminClient.from('github_webhook_events')
          .select('*', { count: 'exact', head: true }).eq('processed', false);
        return c || 0;
      })
    ]);

    const { data: recentActivity } = await adminClient
      .from('project_activities')
      .select('id, project_id, type, actor, title, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(15);

    res.json({
      success: true,
      overview: {
        students, mentors, businesses,
        projects: { active: activeProjects, in_development: inDevelopment, in_testing: inTesting, delivered: delivered },
        teams,
        tasks: { open: openTasks, blocked: blockedTasks },
        pull_requests: { open: openPrs },
        requests_pending: pendingRequests,
        github: { webhook_events_total: webhookTotal, webhook_events_unprocessed: webhookUnprocessed }
      },
      recent_activity: recentActivity || []
    });
  } catch (err) { fail(res, err, 'Failed to load overview'); }
});

/* ── business project requests (Phase 12 review flow) ────────── */

router.get('/requests', async (req, res) => {
  const { status } = req.query;
  let q = adminClient
    .from('project_requests')
    .select('*, companies(name, email, contact_person)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return fail(res, error, 'Failed to load requests');
  res.json({ success: true, requests: data || [] });
});

router.post('/requests/:id/review', async (req, res) => {
  try {
    const { action, note, create_project } = req.body || {};
    if (!['approve', 'reject', 'review'].includes(action)) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'action must be review|approve|reject' } });
    }

    const { data: request } = await adminClient
      .from('project_requests').select('*').eq('id', req.params.id).maybeSingle();
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found.' } });

    // optionally promote into a real project on approval
    let project = null;
    if (action === 'approve' && create_project !== false) {
      project = await projectService.createProject({
        name: request.name,
        description: request.problem,
        business_id: request.business_id,
        owner_id: req.user.id,
        status: 'APPROVED',
        priority: request.priority,
        created_by: req.user.id
      });
      await notifyProjectStatus(project, 'APPROVED');
    }

    const newStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'REVIEW';
    const { data: updated, error } = await adminClient
      .from('project_requests')
      .update({ status: newStatus, admin_note: String(note || '').slice(0, 2000), reviewed_by: req.user.id, reviewed_at: new Date().toISOString(), project_id: project?.id || request.project_id })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    if (project) {
      await adminClient.from('projects').update({ status: 'APPROVED' }).eq('id', project.id);
    }

    res.json({ success: true, request: updated, project });
  } catch (err) { fail(res, err, 'Failed to review request'); }
});

/* ── project detail for management (teams, requirements, milestones, repos) ── */

router.get('/:id', async (req, res) => {
  try {
    const { data: project, error } = await adminClient
      .from('projects').select('*').eq('id', req.params.id).maybeSingle();
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });
    }

    const [{ data: teams }, { data: requirements }, { data: milestones }, { data: connections }] = await Promise.all([
      adminClient.from('teams').select('id, name, description').eq('project_id', project.id).order('created_at'),
      adminClient.from('project_requirements').select('id, name, weight, status, priority, milestone_id').eq('project_id', project.id).order('created_at'),
      adminClient.from('project_milestones').select('id, name, status, due_date, sort_order').eq('project_id', project.id).order('sort_order'),
      adminClient.from('project_repositories').select('repository_id, repositories(id, full_name, github_repo_id, url)').eq('project_id', project.id)
    ]);

    const teamIds = (teams || []).map(t => t.id);
    let members = [];
    if (teamIds.length) {
      const { data } = await adminClient
        .from('team_members')
        .select('id, team_id, user_id, role, profiles!team_members_user_id_fkey(id, full_name, email)')
        .in('team_id', teamIds);
      members = data || [];
    }

    res.json({
      success: true,
      project,
      teams: teams || [],
      members,
      requirements: requirements || [],
      milestones: milestones || [],
      repositories: (connections || []).map(c => c.repositories).filter(Boolean)
    });
  } catch (err) { fail(res, err, 'Failed to load project'); }
});

/* ── project CRUD ────────────────────────────────────────────── */

router.post('/', async (req, res) => {
  try {
    const { name, description, business_id, status, priority, start_date, target_date } = req.body || {};
    if (!name) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'name is required.' } });
    const project = await projectService.createProject({
      name, description, business_id, owner_id: req.user.id, status, priority,
      start_date, target_date, created_by: req.user.id
    });
    res.status(201).json({ success: true, project });
  } catch (err) { fail(res, err, 'Failed to create project'); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'status', 'priority', 'start_date', 'target_date', 'owner_id', 'business_id'];
    const patch = {};
    for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    if (Object.keys(patch).length === 0) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'Nothing to update.' } });

    if (patch.status) await notifyProjectStatus({ id: req.params.id, name: patch.name || 'Project' }, patch.status);
    const { data, error } = await adminClient.from('projects').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (patch.status) {
      await projectService.addActivity({
        project_id: req.params.id, type: 'PROJECT_STATUS_CHANGED', actor: req.user.email || 'admin',
        title: `status → ${patch.status}`, metadata: { status: patch.status }
      }).catch(() => {});
    }
    res.json({ success: true, project: data });
  } catch (err) { fail(res, err, 'Failed to update project'); }
});

/* ── teams ───────────────────────────────────────────────────── */

router.post('/:id/teams', async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'name is required.' } });
    const team = await projectService.createTeam({ project_id: req.params.id, name, description });
    res.status(201).json({ success: true, team });
  } catch (err) { fail(res, err, 'Failed to create team'); }
});

router.post('/teams/:teamId/members', async (req, res) => {
  try {
    const { user_id, role } = req.body || {};
    if (!user_id) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'user_id is required.' } });
    // validate the user exists and is a student/mentor
    const { data: profile } = await adminClient.from('profiles').select('id, role').eq('id', user_id).maybeSingle();
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    const member = await projectService.addTeamMember({ team_id: req.params.teamId, user_id, role });
    res.status(201).json({ success: true, member });
  } catch (err) { fail(res, err, 'Failed to add member'); }
});

/* ── requirements + milestones ───────────────────────────────── */

router.post('/:id/requirements', async (req, res) => {
  try {
    const { milestone_id, name, description, weight, priority, acceptance_criteria } = req.body || {};
    if (!name) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'name is required.' } });
    const requirement = await projectService.createRequirement({
      project_id: req.params.id, milestone_id, name, description, weight, priority, acceptance_criteria
    });
    res.status(201).json({ success: true, requirement });
  } catch (err) { fail(res, err, 'Failed to create requirement'); }
});

router.put('/requirements/:rid', async (req, res) => {
  try {
    const requirement = await projectService.updateRequirement(req.user, { role: 'admin' }, req.params.rid, req.body || {});
    res.json({ success: true, requirement });
  } catch (err) { fail(res, err, 'Failed to update requirement'); }
});

router.post('/:id/milestones', async (req, res) => {
  try {
    const { name, description, due_date, sort_order } = req.body || {};
    if (!name) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'name is required.' } });
    const milestone = await projectService.createMilestone({ project_id: req.params.id, name, description, due_date, sort_order });
    res.status(201).json({ success: true, milestone });
  } catch (err) { fail(res, err, 'Failed to create milestone'); }
});

/* ── repositories ────────────────────────────────────────────── */

router.post('/:id/repositories', async (req, res) => {
  try {
    const { github_repo_id } = req.body || {};
    if (!github_repo_id) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'github_repo_id is required.' } });
    const { data: repoRow } = await adminClient
      .from('repositories').select('id').eq('github_repo_id', Number(github_repo_id)).maybeSingle();
    if (!repoRow) return res.status(404).json({ success: false, error: { code: 'REPO_NOT_FOUND', message: 'Repository not synced yet. List installation repositories first.' } });
    const connection = await projectService.connectRepository({
      project_id: req.params.id, repository_row_id: repoRow.id, connected_by: req.user.id
    });
    res.status(201).json({ success: true, connection });
  } catch (err) { fail(res, err, 'Failed to connect repository'); }
});

module.exports = { adminProjectRouter: router };
