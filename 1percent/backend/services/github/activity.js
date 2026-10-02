/**
 * services/github/activity.js
 *
 * PURPOSE:
 *   Read-only GitHub activity helpers used by dashboards and admin health:
 *   workflow runs (tests), deployments, check suites, org members.
 *
 * EXPORTS: listWorkflowRuns, listDeployments, listCheckRuns, listOrgMembers
 * DEPENDENCIES: ./app.js
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { getInstallationToken, getAppJwt } = require('./app');

const GITHUB_API = 'https://api.github.com';

async function gh(path, options = {}, useJwt = false) {
  const token = useJwt ? await getAppJwt() : await getInstallationToken();
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects'
    },
    ...options
  });
  if (!res.ok) {
    await res.text().catch(() => {});
    const err = new Error(`GitHub API ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function listWorkflowRuns(owner, repo, { perPage = 20 } = {}) {
  const data = await gh(`/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`);
  return (data.workflow_runs || []).map(r => ({
    github_run_id: r.id,
    name: r.name,
    event: r.event,
    status: r.status,
    conclusion: r.conclusion, // success | failure | cancelled | …
    branch: r.head_branch,
    url: r.html_url,
    created_at: r.created_at
  }));
}

async function listDeployments(owner, repo, { perPage = 20 } = {}) {
  const data = await gh(`/repos/${owner}/${repo}/deployments?per_page=${perPage}`);
  return (data || []).map(d => ({
    github_deployment_id: d.id,
    environment: d.environment,
    ref: d.ref,
    sha: d.sha,
    created_at: d.created_at,
    url: d.repository_url
  }));
}

async function listCheckRuns(owner, repo, ref) {
  const data = await gh(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs`);
  return (data.check_runs || []).map(c => ({
    github_check_id: c.id,
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
    url: c.html_url
  }));
}

async function listOrgMembers(org = '1percent-Rwanda') {
  // Org members need the App JWT (org-level permission), not installation token.
  const data = await gh(`/orgs/${org}/members?per_page=100`, {}, true);
  return (data || []).map(m => ({ login: m.login, id: m.id, type: m.type }));
}

module.exports = { listWorkflowRuns, listDeployments, listCheckRuns, listOrgMembers };
