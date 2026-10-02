/**
 * services/github/repositories.js
 *
 * PURPOSE:
 *   Repository operations through the GitHub App installation: list installed
 *   repos, read repo/branches/commits, create repos in the org, and upsert
 *   1percent `repositories` rows keyed by the STABLE GitHub repository ID
 *   (never the name — repos can be renamed; IDs cannot).
 *
 * EXPORTS: listInstallationRepositories, getRepository, listBranches, listCommits,
 *          getCommit, createOrgRepository, upsertRepositoryRow, getRepoRowByGithubId
 * DEPENDENCIES: ./app.js (installation token), ../config/database
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { getInstallationToken, getAppJwt, INSTALLATION_ID } = require('./app');
const { adminClient } = require('../../config/database');

const GITHUB_API = 'https://api.github.com';

/* ── Low-level GET helper (App installation token) ──────────── */
async function ghGet(path) {
  const token = await getInstallationToken();
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects'
    }
  });
  if (!res.ok) {
    const err = new Error(`GitHub API ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* ── Installation repositories ──────────────────────────────── */

async function listInstallationRepositories() {
  const token = await getInstallationToken();
  const res = await fetch(`${GITHUB_API}/installation/repositories?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects'
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub installation repositories failed (${res.status})`);
  }
  const data = await res.json();
  return (data.repositories || []).map(r => ({
    github_repo_id: r.id,
    owner: r.owner.login,
    name: r.name,
    full_name: r.full_name,
    url: r.html_url,
    default_branch: r.default_branch,
    is_private: r.private,
    installation_id: r.installation?.id ? String(r.installation.id) : INSTALLATION_ID
  }));
}

/* ── Single repository / branches / commits ─────────────────── */

async function getRepository(owner, repo) {
  return ghGet(`/repos/${owner}/${repo}`);
}

async function listBranches(owner, repo, perPage = 30) {
  const data = await ghGet(`/repos/${owner}/${repo}/branches?per_page=${perPage}`);
  return (data || []).map(b => ({ name: b.name, commit_sha: b.commit?.sha || null, protected: !!b.protected }));
}

async function listCommits(owner, repo, { sha, since, perPage = 30 } = {}) {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (sha) params.set('sha', sha);
  if (since) params.set('since', since);
  const data = await ghGet(`/repos/${owner}/${repo}/commits?${params.toString()}`);
  return (data || []).map(c => ({
    sha: c.sha,
    author: c.commit?.author?.name || c.author?.login || '',
    author_login: c.author?.login || '',
    message: c.commit?.message || '',
    date: c.commit?.author?.date || null,
    url: c.html_url
  }));
}

async function getCommit(owner, repo, ref) {
  const c = await ghGet(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);
  return {
    sha: c.sha,
    author: c.commit?.author?.name || '',
    message: c.commit?.message || '',
    date: c.commit?.author?.date || null,
    additions: c.stats?.additions ?? null,
    deletions: c.stats?.deletions ?? null,
    files: (c.files || []).map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }))
  };
}

/* ── Create repository in the 1percent-Rwanda org ───────────── */

async function createOrgRepository(name, { description = '', isPrivate = true } = {}) {
  const token = await getAppJwt(); // org repo creation via App JWT
  const res = await fetch(`${GITHUB_API}/orgs/1percent-Rwanda/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '1percent-projects'
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      has_issues: true,
      has_wiki: false,
      auto_init: true
    })
  });
  if (!res.ok && res.status !== 422 /* already exists */) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub org repo creation failed (${res.status})`);
  }
  const data = await res.json().catch(() => null);
  return data; // null when 422 already-exists with no body
}

/* ── 1percent repository rows (keyed by GitHub repo ID) ─────── */

async function upsertRepositoryRow(info) {
  const row = {
    github_repo_id: info.github_repo_id,
    owner: info.owner,
    name: info.name,
    full_name: info.full_name,
    url: info.url || '',
    default_branch: info.default_branch || 'main',
    installation_id: info.installation_id ? Number(info.installation_id) : null,
    is_private: !!info.is_private,
    sync_status: info.sync_status || 'ACTIVE',
    last_synced_at: new Date().toISOString()
  };
  const { data, error } = await adminClient
    .from('repositories')
    .upsert(row, { onConflict: 'github_repo_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getRepoRowByGithubId(githubRepoId) {
  const { data, error } = await adminClient
    .from('repositories')
    .select('*')
    .eq('github_repo_id', githubRepoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  listInstallationRepositories,
  getRepository,
  listBranches,
  listCommits,
  getCommit,
  createOrgRepository,
  upsertRepositoryRow,
  getRepoRowByGithubId
};
