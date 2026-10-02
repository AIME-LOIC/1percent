/**
 * routes/githubApiRoutes.js
 *
 * PURPOSE:
 *   Authenticated GitHub API surface (Phase 22, 25): list installation
 *   repositories, connect a repo to a project (admin), read commits/branches
 *   for connected repos, webhook health. Credentials stay server-side; the
 *   browser only ever sees repository metadata.
 *
 * ENDPOINTS:
 *   GET  /health                        GitHub App configuration + webhook health (admin)
 *   GET  /repositories                  installation repositories (admin)
 *   POST /repositories/:githubId/connect  connect repo row → project (admin)
 *   GET  /activity                      recent project activities (auth, scoped)
 *
 * EXPORTS: githubApiRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../services/github, ../services/projectService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const github = require('../services/github');
const projectService = require('../services/projectService');

const router = Router();
router.use(authenticate);

/* ── health: is the GitHub App configured? (no secrets in response) ── */
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const { configSummary } = require('../services/github/app');
    const { adminClient } = require('../config/database');

    const [installationOk, { count: webhookCount }, { count: unprocessed }] = await Promise.all([
      github.app.isConfigured()
        ? github.repositories.listInstallationRepositories().then(r => ({ ok: true, repo_count: r.length }))
          .catch(e => ({ ok: false, error: e.message }))
        : Promise.resolve({ ok: false, error: 'GitHub App not configured' }),
      adminClient.from('github_webhook_events').select('*', { count: 'exact', head: true }),
      adminClient.from('github_webhook_events').select('*', { count: 'exact', head: true }).eq('processed', false)
    ]);

    res.json({
      success: true,
      github_app: configSummary(),
      installation: installationOk,
      webhooks: { total: webhookCount || 0, unprocessed: unprocessed || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'GITHUB_HEALTH_FAILED', message: 'Failed to check GitHub health.' } });
  }
});

/* ── repositories ─────────────────────────────────────────────── */

router.get('/repositories', requireAdmin, async (req, res) => {
  try {
    const repos = await github.repositories.listInstallationRepositories();
    res.json({ success: true, repositories: repos });
  } catch (err) {
    res.status(502).json({ success: false, error: { code: 'GITHUB_API_FAILED', message: 'Failed to list repositories. Is the GitHub App installed?' } });
  }
});

router.post('/repositories/:githubId/connect', requireAdmin, async (req, res) => {
  try {
    const { project_id } = req.body || {};
    if (!project_id) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'project_id is required.' } });
    }
    const { adminClient } = require('../config/database');
    const { data: repoRow } = await adminClient
      .from('repositories').select('id').eq('github_repo_id', Number(req.params.githubId)).maybeSingle();
    if (!repoRow) {
      return res.status(404).json({ success: false, error: { code: 'REPO_NOT_FOUND', message: 'Repository not found. Sync installation repositories first.' } });
    }
    const link = await projectService.connectRepository({
      project_id, repository_row_id: repoRow.id, connected_by: req.user.id
    });
    res.json({ success: true, connection: link });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'CONNECT_FAILED', message: String(err.message || 'Failed to connect repository.') } });
  }
});

/* ── activity: scoped by role (student → own projects, etc.) ──── */

router.get('/activity', async (req, res) => {
  try {
    const { project_id, limit } = req.query;
    const scope = await projectService.accessibleProjectIds(req.user, req.profile);
    if (scope.mode === 'ids' && scope.ids.length === 0) {
      return res.json({ success: true, activity: [] });
    }

    const { adminClient } = require('../config/database');
    let q = adminClient
      .from('project_activities')
      .select('id, project_id, type, actor, title, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 200));
    if (scope.mode === 'ids') q = q.in('project_id', scope.ids);
    if (project_id) {
      if (scope.mode === 'ids' && !scope.ids.includes(project_id)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No access to this project.' } });
      }
      q = q.eq('project_id', project_id);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, activity: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'ACTIVITY_FAILED', message: 'Failed to load activity.' } });
  }
});

module.exports = { githubApiRouter: router };
