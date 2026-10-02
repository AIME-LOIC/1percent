/**
 * routes/taskRoutes.js
 *
 * PURPOSE:
 *   Task API (Phases 7, 25): list (scoped, filterable, paginated), read,
 *   create (mentor/admin), update (mentor/admin), and the student-safe
 *   /transition endpoint (start | pause | submit | test; approve/block for
 *   mentors; students can never mark DONE).
 *
 * ENDPOINTS:
 *   GET  /                    list tasks (scoped by role)
 *   GET  /:id                 task detail (scoped)
 *   POST /                    create task (mentor/admin)
 *   PUT  /:id                 update task (mentor/admin)
 *   POST /:id/transition      {action: start|pause|submit|test|approve|block}
 *
 * EXPORTS: taskRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/projectService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const projectService = require('../services/projectService');

const router = Router();
router.use(authenticate);

function fail(res, err, fallback = 'Request failed') {
  const msg = String(err?.message || fallback);
  const status = /not found/i.test(msg) ? 404 : /cannot|do not mentor|only own|insufficient/i.test(msg) ? 403 : 400;
  return res.status(status).json({ success: false, error: { code: 'TASK_ERROR', message: msg } });
}

/* list — students see their own + their teams' tasks; mentors see assigned projects */
router.get('/', async (req, res) => {
  try {
    const { project_id, status, priority, milestone_id, requirement_id, assignee_id, limit, offset } = req.query;
    const scope = await projectService.accessibleProjectIds(req.user, req.profile);

    const { adminClient } = require('../config/database');
    let query = adminClient
      .from('project_tasks')
      .select('id, project_id, requirement_id, milestone_id, title, description, status, priority, assignee_id, estimate_hours, due_date, github_issue_url, github_pr_url, completed_at, blocked_reason, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (scope.mode === 'ids') {
      if (scope.ids.length === 0) return res.json({ success: true, tasks: [], total: 0 });
      query = query.in('project_id', scope.ids);
    }
    if (project_id) query = query.eq('project_id', project_id);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (milestone_id) query = query.eq('milestone_id', milestone_id);
    if (requirement_id) query = query.eq('requirement_id', requirement_id);
    // students default to their own tasks unless they pass an explicit assignee filter
    if (req.profile.role === 'student' && !assignee_id && !project_id) {
      query = query.eq('assignee_id', req.user.id);
    } else if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }

    const lim = Math.min(Number(limit) || 50, 200);
    const off = Number(offset) || 0;
    const { data, error, count } = await query.range(off, off + lim - 1);
    if (error) throw error;
    res.json({ success: true, tasks: data || [], total: count || 0, limit: lim, offset: off });
  } catch (err) { fail(res, err, 'Failed to list tasks'); }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await projectService.getTaskForUser(req.user, req.profile, req.params.id);
    if (!task) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    res.json({ success: true, task });
  } catch (err) { fail(res, err, 'Failed to load task'); }
});

/* create — mentor/admin only */
router.post('/', requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const { project_id, requirement_id, milestone_id, title, description, priority, assignee_id, estimate_hours, due_date } = req.body || {};
    if (!project_id || !title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'project_id and title are required.' } });
    }
    // mentor must mentor the project
    if (req.profile.role === 'mentor') {
      const ok = await projectService.isMentorOfProject(req.user.id, project_id);
      if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });
    }
    const task = await projectService.createTask(req.user, {
      project_id, requirement_id, milestone_id, title, description, priority, assignee_id, estimate_hours, due_date
    });
    res.status(201).json({ success: true, task });
  } catch (err) { fail(res, err, 'Failed to create task'); }
});

/* update — mentor/admin only (reassignment, priority, etc.) */
router.put('/:id', requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const existing = await projectService.getTaskForUser(req.user, req.profile, req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    if (req.profile.role === 'mentor') {
      const ok = await projectService.isMentorOfProject(req.user.id, existing.project_id);
      if (!ok) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not mentor this project.' } });
    }
    const task = await projectService.updateTask(req.user, req.params.id, req.body || {});
    res.json({ success: true, task });
  } catch (err) { fail(res, err, 'Failed to update task'); }
});

/* student-safe state machine transitions */
router.post('/:id/transition', async (req, res) => {
  try {
    const action = String(req.body?.action || '');
    const VALID = ['start', 'pause', 'submit', 'test', 'approve', 'block'];
    if (!VALID.includes(action)) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: `action must be one of: ${VALID.join(', ')}` } });
    }
    const task = await projectService.transitionTask(req.user, req.profile, req.params.id, action, {
      blocked_reason: req.body?.blocked_reason
    });
    res.json({ success: true, task });
  } catch (err) { fail(res, err, 'Transition failed'); }
});

module.exports = { taskRouter: router };
