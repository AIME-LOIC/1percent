/**
 * services/github/issues.js
 *
 * PURPOSE:
 *   Issue operations through the GitHub App installation: list, read, create
 *   (used when a 1percent task becomes a GitHub issue), close, comment.
 *
 * EXPORTS: listIssues, createIssue, closeIssue, addComment
 * DEPENDENCIES: ./app.js
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { getInstallationToken } = require('./app');

const GITHUB_API = 'https://api.github.com';

async function gh(path, options = {}) {
  const token = await getInstallationToken();
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
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

async function listIssues(owner, repo, { state = 'open', perPage = 30 } = {}) {
  const data = await gh(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`);
  // GitHub returns PRs in the issues list — filter them out.
  return (data || []).filter(i => !i.pull_request).map(i => ({
    github_issue_id: i.id,
    number: i.number,
    title: i.title,
    state: i.state,
    author: i.user?.login || '',
    url: i.html_url,
    labels: (i.labels || []).map(l => l.name),
    created_at: i.created_at
  }));
}

async function createIssue(owner, repo, { title, body = '', labels = [] }) {
  const data = await gh(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels })
  });
  return {
    github_issue_id: data.id,
    number: data.number,
    url: data.html_url
  };
}

async function closeIssue(owner, repo, issueNumber, comment) {
  if (comment) {
    await gh(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: comment })
    });
  }
  return gh(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' })
  });
}

async function addComment(owner, repo, issueNumber, body) {
  return gh(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

module.exports = { listIssues, createIssue, closeIssue, addComment };
