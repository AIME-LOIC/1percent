/**
 * services/projectService/activity.js
 *
 * PURPOSE:
 *   Activity normalization layer (Phase 23): GitHub webhook payloads →
 *   1percent project_activities rows. One function per GitHub event type,
 *   all defensive: a bad payload logs and is skipped, never crashes the
 *   webhook pipeline. Also exposes the 14-day activity aggregation used by
 *   the student dashboard.
 *
 * EXPORTS: processWebhookEvent, getActivity14d, getProjectActivity
 * DEPENDENCIES: ../config/database
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { adminClient } = require('../../config/database');

/* ── helpers ─────────────────────────────────────────────────── */

async function resolveProjectId(githubRepoId) {
  if (!githubRepoId) return null;
  const { data, error } = await adminClient
    .from('project_repositories')
    .select('project_id')
    .eq('repository_id', githubRepoId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.project_id || null;
}

/**
 * Resolve a GitHub login to a 1percent profile id.
 * Matching strategy: profiles.email local part or full_name slug against the
 * GitHub login. Returns null when unmatched (activity is still recorded with
 * the GitHub actor as `actor`).
 */
const loginCache = new Map(); // login -> userId | null
async function resolveUser(githubLogin) {
  if (!githubLogin) return null;
  if (loginCache.has(githubLogin)) return loginCache.get(githubLogin);

  const slug = githubLogin.toLowerCase().replace(/[^a-z0-9]/g, '');
  let userId = null;
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .or(`email.ilike.${githubLogin}%,full_name.ilike.${githubLogin}%`)
    .limit(5);
  if (!error && data) {
    const hit = data.find(p =>
      (p.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') === slug ||
      (p.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === slug
    );
    userId = hit?.id || null;
  }
  loginCache.set(githubLogin, userId);
  if (loginCache.size > 2000) loginCache.clear();
  return userId;
}

async function insertActivity({ projectId, userId, type, actor, title, metadata, occurredAt }) {
  const row = {
    project_id: projectId,
    user_id: userId || null,
    type,
    actor: actor || '',
    title: (title || '').slice(0, 300),
    metadata: metadata || {},
    occurred_at: occurredAt || new Date().toISOString()
  };
  const { error } = await adminClient.from('project_activities').insert(row);
  if (error) throw error;
}

/* ── event handlers (payload → activity) ─────────────────────── */

async function onPush(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;

  const commits = payload.commits || [];
  const pusher = payload.pusher?.name || payload.pusher?.login || '';
  if (payload.created || payload.deleted) {
    // branch create/delete — record lightweight activity for branch creation only
    if (payload.created && payload.ref) {
      await insertActivity({
        projectId,
        type: 'BRANCH_CREATED',
        actor: pusher,
        title: `created branch ${payload.ref.replace('refs/heads/', '')}`,
        metadata: { ref: payload.ref },
        occurredAt: new Date().toISOString()
      });
    }
    return true;
  }
  for (const c of commits) {
    const userId = await resolveUser(c.author?.username || c.committer?.username || pusher);
    await insertActivity({
      projectId,
      userId,
      type: 'COMMIT_PUSHED',
      actor: c.author?.username || pusher,
      title: (c.message || '').split('\n')[0].slice(0, 200),
      metadata: { sha: c.id, url: c.url, added: (c.added || []).length, removed: (c.removed || []).length },
      occurredAt: c.timestamp || new Date().toISOString()
    });
  }
  return true;
}

async function onPullRequest(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const pr = payload.pull_request || {};
  const action = payload.action;
  const author = pr.user?.login || '';
  const userId = await resolveUser(author);

  if (action === 'opened' || action === 'reopened' || action === 'ready_for_review') {
    await insertActivity({
      projectId, userId, type: 'PR_OPENED', actor: author,
      title: pr.title || '', metadata: { number: pr.number, url: pr.html_url },
      occurredAt: pr.created_at || new Date().toISOString()
    });
    await upsertPullRequestRow(projectId, repoRow, pr, 'open');
  } else if (action === 'closed') {
    const merged = !!pr.merged;
    await insertActivity({
      projectId, userId, type: merged ? 'PR_MERGED' : 'PR_CLOSED', actor: author,
      title: pr.title || '', metadata: { number: pr.number, url: pr.html_url },
      occurredAt: pr.closed_at || new Date().toISOString()
    });
    await upsertPullRequestRow(projectId, repoRow, pr, merged ? 'merged' : 'closed');
  } else if (action === 'synchronize') {
    await upsertPullRequestRow(projectId, repoRow, pr, 'open');
  }
  return true;
}

async function onPullRequestReview(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const review = payload.review || {};
  const pr = payload.pull_request || {};
  const state = review.state; // approved | changes_requested | commented
  if (!['approved', 'changes_requested', 'commented'].includes(state)) return true;

  const map = { approved: 'APPROVED', changes_requested: 'CHANGES_REQUESTED', commented: 'COMMENTED' };
  const reviewer = review.user?.login || '';
  await insertActivity({
    projectId,
    type: 'REVIEW_SUBMITTED',
    actor: reviewer,
    title: `${map[state]}: ${pr.title || `PR #${pr.number}`}`,
    metadata: { pr_number: pr.number, state, url: review.html_url },
    occurredAt: review.submitted_at || new Date().toISOString()
  });

  // persist review row
  const { data: prRow } = await adminClient
    .from('pull_requests')
    .select('id')
    .eq('repository_id', repoRow.github_repo_id)
    .eq('github_pr_id', pr.id)
    .maybeSingle();
  if (prRow) {
    await adminClient.from('reviews').insert({
      pull_request_id: prRow.id,
      project_id: projectId,
      reviewer,
      state: map[state],
      body: (review.body || '').slice(0, 4000),
      submitted_at: review.submitted_at || new Date().toISOString()
    });
  }
  return true;
}

async function onIssues(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const issue = payload.issue || {};
  const action = payload.action;
  if (!['opened', 'closed', 'reopened'].includes(action)) return true;
  const author = issue.user?.login || '';
  await insertActivity({
    projectId,
    userId: await resolveUser(author),
    type: action === 'closed' ? 'ISSUE_CLOSED' : 'ISSUE_OPENED',
    actor: author,
    title: issue.title || '',
    metadata: { number: issue.number, url: issue.html_url },
    occurredAt: action === 'opened' ? issue.created_at : issue.closed_at || new Date().toISOString()
  });
  return true;
}

async function onIssueComment(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const comment = payload.comment || {};
  const issue = payload.issue || {};
  await insertActivity({
    projectId,
    type: 'ISSUE_COMMENT',
    actor: comment.user?.login || '',
    title: `on #${issue.number}: ${(comment.body || '').slice(0, 120)}`,
    metadata: { issue_number: issue.number, url: comment.html_url },
    occurredAt: comment.created_at || new Date().toISOString()
  });
  return true;
}

async function onCheckRun(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const run = payload.check_run || {};
  if (run.status !== 'completed') return true; // only completed runs matter
  const passed = run.conclusion === 'success';
  await insertActivity({
    projectId,
    type: passed ? 'TEST_PASSED' : 'TEST_FAILED',
    actor: '',
    title: run.name || 'check',
    metadata: { conclusion: run.conclusion, url: run.html_url, head_sha: run.head_sha },
    occurredAt: run.completed_at || new Date().toISOString()
  });
  return true;
}

async function onWorkflowRun(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const run = payload.workflow_run || {};
  if (run.status !== 'completed') return true;
  const passed = run.conclusion === 'success';
  await insertActivity({
    projectId,
    type: passed ? 'TEST_PASSED' : 'TEST_FAILED',
    actor: '',
    title: run.name || 'workflow',
    metadata: { conclusion: run.conclusion, branch: run.head_branch, url: run.html_url },
    occurredAt: run.updated_at || new Date().toISOString()
  });
  return true;
}

async function onDeployment(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const dep = payload.deployment || {};
  await insertActivity({
    projectId,
    type: 'DEPLOYMENT_STARTED',
    actor: dep.creator?.login || '',
    title: `${dep.environment} deployment`,
    metadata: { environment: dep.environment, ref: dep.ref, sha: dep.sha },
    occurredAt: dep.created_at || new Date().toISOString()
  });
  return true;
}

async function onDeploymentStatus(repoRow, payload) {
  const projectId = await resolveProjectId(repoRow.github_repo_id);
  if (!projectId) return false;
  const dep = payload.deployment || {};
  const status = payload.deployment_status || {};
  const done = ['success', 'inactive'].includes(status.state);
  await insertActivity({
    projectId,
    type: done ? 'DEPLOYMENT_COMPLETED' : 'DEPLOYMENT_STATUS',
    actor: status.creator?.login || '',
    title: `${dep.environment}: ${status.state}`,
    metadata: { environment: dep.environment, state: status.state, url: status.environment_url },
    occurredAt: status.created_at || new Date().toISOString()
  });
  // persist deployment row (latest state per github deployment id)
  await adminClient.from('deployments').upsert({
    project_id: projectId,
    repository_id: repoRow.github_repo_id,
    github_deployment_id: dep.id,
    environment: dep.environment || 'production',
    status: status.state || 'PENDING',
    url: status.environment_url || '',
    ref: dep.ref || '',
    deployed_at: status.created_at || new Date().toISOString()
  }, { onConflict: 'github_deployment_id' });
  return true;
}

async function onInstallationEvent(repoRow, payload, event, action) {
  // repository added/removed from installation — keep sync_status fresh
  const reposAdded = payload.repositories_added || [];
  const reposRemoved = payload.repositories_removed || [];
  for (const r of reposRemoved) {
    await adminClient.from('repositories')
      .update({ sync_status: 'REMOVED' })
      .eq('github_repo_id', r.id);
  }
  return true;
}

/* ── pull_requests cache upsert ───────────────────────────────── */

async function upsertPullRequestRow(projectId, repoRow, pr, state) {
  const row = {
    project_id: projectId,
    repository_id: repoRow.github_repo_id,
    github_pr_id: pr.id,
    number: pr.number,
    title: pr.title || '',
    author: pr.user?.login || '',
    state,
    url: pr.html_url || '',
    additions: pr.additions ?? null,
    deletions: pr.deletions ?? null,
    opened_at: pr.created_at || null,
    merged_at: pr.merged_at || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await adminClient
    .from('pull_requests')
    .upsert(row, { onConflict: 'repository_id,github_pr_id' });
  if (error) throw error;
}

/* ── dispatcher ───────────────────────────────────────────────── */

/**
 * Process one verified webhook event. Returns true when something was recorded.
 * @param {string} event    X-GitHub-Event
 * @param {object} payload  parsed JSON payload
 */
async function processWebhookEvent(event, payload) {
  const repo = payload?.repository;
  const repoGithubId = repo?.id;
  let repoRow = null;

  if (repoGithubId) {
    repoRow = {
      github_repo_id: repoGithubId,
      owner: repo.owner?.login || '',
      name: repo.name || '',
      full_name: repo.full_name || `${repo.owner?.login || ''}/${repo.name || ''}`,
      default_branch: repo.default_branch || 'main',
      url: repo.html_url || '',
      is_private: !!repo.private
    };
    // keep repositories row fresh (idempotent upsert by github_repo_id)
    const { repositories } = require('../github');
    try { await repositories.upsertRepositoryRow(repoRow); } catch { /* non-fatal */ }
  }

  switch (event) {
    case 'push':                    return repoRow ? onPush(repoRow, payload) : false;
    case 'pull_request':            return repoRow ? onPullRequest(repoRow, payload) : false;
    case 'pull_request_review':     return repoRow ? onPullRequestReview(repoRow, payload) : false;
    case 'issues':                  return repoRow ? onIssues(repoRow, payload) : false;
    case 'issue_comment':           return repoRow ? onIssueComment(repoRow, payload) : false;
    case 'check_run':               return repoRow ? onCheckRun(repoRow, payload) : false;
    case 'workflow_run':            return repoRow ? onWorkflowRun(repoRow, payload) : false;
    case 'deployment':              return repoRow ? onDeployment(repoRow, payload) : false;
    case 'deployment_status':       return repoRow ? onDeploymentStatus(repoRow, payload) : false;
    case 'installation':
    case 'installation_repositories': return onInstallationEvent(repoRow, payload, event, payload.action);
    case 'repository':
      // created/renamed/archived — upsert keeps names/urls fresh
      return repoRow ? true : false;
    default:
      return false; // unhandled event — acknowledged but not processed
  }
}

/* ── dashboard aggregation: 14-day development activity ──────── */

/**
 * 14-day activity histogram for a user (their commits, PRs, reviews, tests…)
 * combined across their projects. Returns per-day counts for the LAST 14
 * calendar days (UTC), oldest first.
 */
async function getActivity14d(userId) {
  const since = new Date(Date.now() - 13 * 24 * 3600 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await adminClient
    .from('project_activities')
    .select('type, occurred_at')
    .eq('user_id', userId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: true });
  if (error) throw error;

  const buckets = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    buckets.push({
      date: d.toISOString().slice(0, 10),
      commits: 0, tasks: 0, prs: 0, reviews: 0, tests: 0, other: 0, total: 0
    });
  }
  const byDate = new Map(buckets.map(b => [b.date, b]));

  for (const a of data || []) {
    const day = String(a.occurred_at).slice(0, 10);
    const b = byDate.get(day);
    if (!b) continue;
    if (a.type === 'COMMIT_PUSHED') b.commits++;
    else if (a.type === 'PR_OPENED' || a.type === 'PR_MERGED') b.prs++;
    else if (a.type === 'REVIEW_SUBMITTED') b.reviews++;
    else if (a.type === 'TEST_PASSED' || a.type === 'TEST_FAILED') b.tests++;
    else if (a.type === 'TASK_COMPLETED') b.tasks++;
    else b.other++;
    b.total++;
  }
  return buckets;
}

async function getProjectActivity(projectId, { limit = 50, type } = {}) {
  let q = adminClient
    .from('project_activities')
    .select('*')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false })
    .limit(Math.min(limit, 200));
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

module.exports = { processWebhookEvent, getActivity14d, getProjectActivity };
