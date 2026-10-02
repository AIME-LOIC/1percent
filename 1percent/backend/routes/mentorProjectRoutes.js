/**
 * routes/mentorProjectRoutes.js
 *
 * PURPOSE:
 *   Mentor dashboard API (Phase 9): assigned projects, students, task
 *   distribution, blocked work, PRs requiring review — plus mentor ACTIONS:
 *   assign/reassign tasks, review (request changes / approve), feedback,
 *   block/unblock, complete milestones, set requirement status.
 *
 *   All endpoints enforce mentor↔project scoping server-side.
 *
 * ENDPOINTS:
 *   GET  /projects                        assigned projects with progress
 *   GET  /projects/:id                    mentor project view
 *   POST /projects/:id/tasks              assign task
 *   PUT  /tasks/:id                       reassign / edit task
 *   POST /tasks/:id/review                {action: approve|request_changes|block, comment}
 *   POST /requirements/:id/status         {status}
 *   POST /milestones/:id/complete
 *   GET  /students                        assigned students + activity
 *
 * EXPORTS: mentorProjectRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/projectService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const projectService = require('../services/projectService');
const { adminClient } = require('../config/database');

const router = Router();
router.use(authenticate, requireRole('mentor', 'admin'));

function fail(res, err, fallback = 'Request failed') {
  const msg = String(err?.message || fallback);
  const status = /not found/i.test(msg) ? 404 : /cannot|do not mentor|only/i.test(msg) ? 403 : 400;
  return res.status(status).json({ success: false, error: { code: 'MENTOR_ERROR', message: msg } });
}

/* ── projects ────────────────────────────────────────────────── */

router.get('/projects', async (req, res) => {
  try {
    const projects = await projectService.listMentorProjects(req.user);
    const withProgress = await Promise.all(projects.map(async p => ({
      ...p,
      progress: await projectService.getProjectProgress(p.id).catch(() => null)
    })));
    res.json({ success: true, projects: withProgress });
  } catch (err) { fail(res, err, 'Failed to load projects'); }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const ok = req.profile.role === 'admin' || await projectService.isMentorOfProject(req.user.id, req.params.id);
    if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });

    const project = await projectService.getProjectForUser(req.user, req.profile, req.params.id);
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });

    const [progress, team, tasks, milestones, pulls] = await Promise.all([
      projectService.getProjectProgress(project.id),
      projectService.listTeamMembers(project.id),
      projectService.listTasksForUser(req.user, req.profile, { project_id: project.id, limit: 200 }),
      projectService.listMilestones(project.id),
      adminClient.from('pull_requests').select('*').eq('project_id', project.id)
        .eq('state', 'open').order('updated_at', { ascending: false }).limit(20)
    ]);

    res.json({
      success: true,
      project,
      progress: progress,
      team,
      tasks: tasks.tasks || [],
      task_distribution: {
        todo: (tasks.tasks || []).filter(t => t.status === 'TODO').length,
        in_progress: (tasks.tasks || []).filter(t => t.status === 'IN_PROGRESS').length,
        blocked: (tasks.tasks || []).filter(t => t.status === 'BLOCKED').length,
        in_review: (tasks.tasks || []).filter(t => t.status === 'IN_REVIEW').length,
        testing: (tasks.tasks || []).filter(t => t.status === 'TESTING').length,
        done: (tasks.tasks || []).filter(t => t.status === 'DONE').length
      },
      milestones,
      open_pull_requests: pulls.data || []
    });
  } catch (err) { fail(res, err, 'Failed to load project'); }
});

/* ── task actions ────────────────────────────────────────────── */

router.post('/projects/:id/tasks', async (req, res) => {
  try {
    const ok = req.profile.role === 'admin' || await projectService.isMentorOfProject(req.user.id, req.params.id);
    if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });
    const { title, description, requirement_id, milestone_id, priority, assignee_id, estimate_hours, due_date } = req.body || {};
    if (!title) return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'title is required.' } });
    const task = await projectService.createTask(req.user, {
      project_id: req.params.id, title, description, requirement_id, milestone_id,
      priority, assignee_id, estimate_hours, due_date
    });
    res.status(201).json({ success: true, task });
  } catch (err) { fail(res, err, 'Failed to create task'); }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const existing = await projectService.getTaskForUser(req.user, req.profile, req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    const ok = req.profile.role === 'admin' || await projectService.isMentorOfProject(req.user.id, existing.project_id);
    if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });
    const task = await projectService.updateTask(req.user, req.params.id, req.body || {});
    res.json({ success: true, task });
  } catch (err) { fail(res, err, 'Failed to update task'); }
});

/**
 * Review actions: approve (IN_REVIEW/TESTING → DONE), request_changes
 * (→ IN_PROGRESS with feedback), block (→ BLOCKED with reason).
 */
router.post('/tasks/:id/review', async (req, res) => {
  try {
    const existing = await projectService.getTaskForUser(req.user, req.profile, req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    const ok = req.profile.role === 'admin' || await projectService.isMentorOfProject(req.user.id, existing.project_id);
    if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });

    const { action, comment } = req.body || {};
    if (action === 'approve') {
      const task = await projectService.transitionTask(req.user, req.profile, req.params.id, 'approve');
      if (existing.assignee_id) {
        await projectService.addActivity({
          project_id: existing.project_id, user_id: existing.assignee_id,
          type: 'MENTOR_FEEDBACK', actor: req.user.email || 'mentor',
          title: `approved: ${existing.title}`, metadata: { task_id: existing.id, comment: (comment || '').slice(0, 1000) }
        }).catch(() => {});
      }
      return res.json({ success: true, task });
    }
    if (action === 'request_changes') {
      const task = await projectService.updateTask(req.user, req.params.id, { status: 'IN_PROGRESS' });
      if (existing.assignee_id) {
        const { notifyUserSafe } = require('../services/projectService/notifications');
        await notifyUserSafe(existing.assignee_id, 'Changes requested',
          `${existing.title}: ${comment || 'Please revise your work.'}`, 'warning').catch(() => {});
      }
      return res.json({ success: true, task });
    }
    if (action === 'block') {
      const task = await projectService.transitionTask(req.user, req.profile, req.params.id, 'block', { blocked_reason: comment });
      return res.json({ success: true, task });
    }
    return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'action must be approve|request_changes|block' } });
  } catch (err) { fail(res, err, 'Review failed'); }
});

/* ── requirements + milestones ───────────────────────────────── */

router.post('/requirements/:id/status', async (req, res) => {
  try {
    const VALID = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE'];
    const status = String(req.body?.status || '');
    if (!VALID.includes(status)) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: `status must be one of: ${VALID.join(', ')}` } });
    }
    const req0 = await adminClient.from('project_requirements').select('project_id').eq('id', req.params.id).maybeSingle();
    if (!req0.data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Requirement not found.' } });
    const ok = req.profile.role === 'admin' || await projectService.isMentorOfProject(req.user.id, req0.data.project_id);
    if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });

    const requirement = await projectService.updateRequirement(req.user, req.profile, req.params.id, { status });
    res.json({ success: true, requirement });
  } catch (err) { fail(res, err, 'Failed to update requirement'); }
});

router.post('/milestones/:id/complete', async (req, res) => {
  try {
    const milestone = await projectService.completeMilestone(req.user, req.profile, req.params.id);
    res.json({ success: true, milestone });
  } catch (err) { fail(res, err, 'Failed to complete milestone'); }
});

/* ── students overview ───────────────────────────────────────── */

router.get('/students', async (req, res) => {
  try {
    const { data: assigned } = await adminClient
      .from('mentor_assignments')
      .select('learner_id, profiles!mentor_assignments_learner_id_fkey(id, full_name, email, avatar_url, role)')
      .eq('mentor_id', req.user.id);
    const learners = (assigned || []).filter(a => a.profiles?.role === 'student').map(a => a.profiles);

    const students = await Promise.all(learners.map(async s => {
      const { count: openTasks } = await adminClient
        .from('project_tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', s.id).in('status', ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'TESTING']);
      const { count: blocked } = await adminClient
        .from('project_tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', s.id).eq('status', 'BLOCKED');
      const activity = await require('../services/projectService/activity')
        .getActivity14d(s.id).catch(() => []);
      return {
        ...s,
        open_tasks: openTasks || 0,
        blocked_tasks: blocked || 0,
        activity_14d_total: activity.reduce((sum, d) => sum + d.total, 0)
      };
    }));
    res.json({ success: true, students });
  } catch (err) { fail(res, err, 'Failed to load students'); }
});

module.exports = { mentorProjectRouter: router };
