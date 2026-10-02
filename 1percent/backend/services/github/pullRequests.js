/**
 * services/github/pullRequests.js
 *
 * PURPOSE:
 *   Pull request + review operations through the GitHub App installation:
 *   list PRs (with review state), read a PR, list reviews, request reviewers.
 *
 * EXPORTS: listPullRequests, getPullRequest, listReviews, requestReviewers
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

async function listPullRequests(owner, repo, { state = 'open', perPage = 30 } = {}) {
  const data = await gh(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`);
  return (data || []).map(p => ({
    github_pr_id: p.id,
    number: p.number,
    title: p.title,
    author: p.user?.login || '',
    state: p.merged_at ? 'merged' : p.state,
    draft: !!p.draft,
    url: p.html_url,
    base: p.base?.ref || '',
    head: p.head?.ref || '',
    opened_at: p.created_at,
    merged_at: p.merged_at
  }));
}

async function getPullRequest(owner, repo, number) {
  const p = await gh(`/repos/${owner}/${repo}/pulls/${number}`);
  return {
    github_pr_id: p.id,
    number: p.number,
    title: p.title,
    body: p.body || '',
    author: p.user?.login || '',
    state: p.merged_at ? 'merged' : p.state,
    url: p.html_url,
    additions: p.additions,
    deletions: p.deletions,
    head: p.head?.ref || '',
    base: p.base?.ref || '',
    opened_at: p.created_at,
    merged_at: p.merged_at
  };
}

async function listReviews(owner, repo, number) {
  const data = await gh(`/repos/${owner}/${repo}/pulls/${number}/reviews`);
  return (data || []).map(r => ({
    github_review_id: r.id,
    reviewer: r.user?.login || '',
    state: r.state, // APPROVED | CHANGES_REQUESTED | COMMENTED | DISMISSED
    body: r.body || '',
    submitted_at: r.submitted_at
  }));
}

async function requestReviewers(owner, repo, number, reviewers) {
  return gh(`/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`, {
    method: 'POST',
    body: JSON.stringify({ reviewers })
  });
}

module.exports = { listPullRequests, getPullRequest, listReviews, requestReviewers };
