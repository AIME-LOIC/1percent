/**
 * routes/studentDevRoutes.js
 *
 * PURPOSE:
 *   Student Developer Dashboard API (Phases 5–7). One aggregate endpoint for
 *   the dashboard shell (profile strip, current project card, progress,
 *   current tasks, team) plus the 14-day development-activity histogram.
 *   Read-only: students never mutate requirements here.
 *
 * ENDPOINTS:
 *   GET /dev-workspace      aggregate dashboard payload
 *   GET /activity/14d       14-day activity histogram
 *
 * EXPORTS: studentDevRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/projectService, ./activity
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const projectService = require('../services/projectService');
const activityEngine = require('../services/projectService/activity');

const router = Router();
router.use(authenticate);

/**
 * GET /dev-workspace — everything the dashboard needs in one round trip
 * (performance: avoid N calls on dashboard load, Phase 27).
 */
router.get('/dev-workspace', async (req, res) => {
  try {
    const { adminClient } = require('../config/database');

    // profile (existing profiles table)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, streak_count, coins')
      .eq('id', req.user.id).maybeSingle();

    // projects accessible (usually exactly one for a student)
    const { projects } = await projectService.listProjectsForUser(req.user, req.profile, { limit: 5 });
    const current = projects.find(p => ['PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'DEPLOYMENT'].includes(p.status)) || projects[0] || null;

    let currentProject = null;
    let myTasks = [];
    let activity14d = [];
    let recentActivity = [];
    let currentTeam = [];
    let currentRepositories = [];

    if (current) {
      const [progress, tasks, team, activity, recent, repositories] = await Promise.all([
        projectService.getProjectProgress(current.id).catch(() => null),
        projectService.listTasksForUser(req.user, req.profile, { project_id: current.id, assignee_id: req.user.id, limit: 20 }),
        projectService.listTeamMembers(current.id).catch(() => []),
        activityEngine.getActivity14d(req.user.id).catch(() => []),
        activityEngine.getProjectActivity(current.id, { limit: 8 }).catch(() => []),
        projectService.listProjectRepositories(current.id).catch(() => [])
      ]);
      currentTeam = team;
      currentRepositories = repositories;
      currentProject = {
        ...current,
        progress,
        my_role: (team.find(t => t.user_id === req.user.id)?.role) || 'developer',
        team,
        repositories,
        milestones: await projectService.listMilestones(current.id).catch(() => [])
      };
      myTasks = tasks.tasks || [];
      activity14d = activity;
      recentActivity = recent;
    }

    // GitHub connection status (existing integration: profile-level flag is not
    // stored; report whether any of the student's projects have repos connected)
    const githubConnected = current
      ? (await projectService.listProjectRepositories(current.id)).length > 0
      : false;

    res.json({
      success: true,
      profile: {
        ...(profile || { id: req.user.id }),
        grade: req.user?.user_metadata?.grade || req.user?.user_metadata?.class_level || ''
      },
      current_project: currentProject,
      team: currentTeam,
      repositories: currentRepositories,
      tasks: myTasks,
      activity_14d: activity14d,
      recent_activity: recentActivity,
      github_connected: githubConnected,
      states: {
        has_project: !!current,
        has_tasks: myTasks.length > 0,
        has_activity: activity14d.some(a => a.total > 0)
      }
    });
  } catch (err) {
    console.error('[STUDENT-DEV] workspace error:', err.message);
    res.status(500).json({ success: false, error: { code: 'WORKSPACE_ERROR', message: 'Failed to load workspace.' } });
  }
});

router.get('/activity/14d', async (req, res) => {
  try {
    const buckets = await activityEngine.getActivity14d(req.user.id);
    res.json({ success: true, days: buckets });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'ACTIVITY_ERROR', message: 'Failed to load activity.' } });
  }
});

module.exports = { studentDevRouter: router };
