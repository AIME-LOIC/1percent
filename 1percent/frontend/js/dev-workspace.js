/* ============================================================
   dev-workspace.js — Developer Workspace for the student dashboard
   (Phases 5–7). Appends the workspace to #dev-workspace-root on
   dashboard.html. Uses OPSession (existing auth) — no new auth.
   All states handled: loading, empty, error, unauthorized (Phase 16).
   ============================================================ */

(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const STATUS_LABEL = {
    REQUESTED: 'Requested', REVIEW: 'In review', APPROVED: 'Approved', PLANNING: 'Planning',
    IN_DEVELOPMENT: 'In development', TESTING: 'Testing', DEPLOYMENT: 'Deployment',
    DELIVERED: 'Delivered', ARCHIVED: 'Archived', BLOCKED: 'Blocked'
  };
  const TASK_LABEL = {
    TODO: 'To do', IN_PROGRESS: 'In progress', BLOCKED: 'Blocked',
    IN_REVIEW: 'In review', TESTING: 'Testing', DONE: 'Done'
  };
  const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

  async function api(path, options = {}) {
    const token = await OPSession.getToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body?.error?.message || body?.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  function when(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60 * 1000) return 'just now';
    if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  /* ============================================================
     Render
     ============================================================ */

  async function init(rootSelector) {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    // LOADING state (skeletons, Phase 34)
    root.innerHTML = `
      <div class="opdev">
        <div class="opdev-card opdev-profile"><div class="opdev-skeleton" style="width:40%"></div><div class="opdev-skeleton" style="width:60%"></div></div>
        <div class="opdev-card opdev-project"><div class="opdev-skeleton" style="width:30%"></div><div class="opdev-skeleton" style="width:80%"></div><div class="opdev-skeleton" style="width:50%"></div></div>
        <div class="opdev-card opdev-progress"><div class="opdev-skeleton"></div><div class="opdev-skeleton"></div><div class="opdev-skeleton"></div></div>
        <div class="opdev-card opdev-tasks"><div class="opdev-skeleton"></div><div class="opdev-skeleton"></div><div class="opdev-skeleton"></div></div>
      </div>`;

    try {
      // UNAUTHORIZED state
      const user = await OPSession.getUser();
      if (!user) {
        root.innerHTML = `<div class="opdev"><div class="opdev-card opdev-error">Please log in to see your developer workspace.</div></div>`;
        return;
      }

      const ws = await api('/api/student/dev/dev-workspace');
      renderWorkspace(root, ws);
    } catch (err) {
      console.warn('[dev-workspace]', err.message);
      root.innerHTML = `<div class="opdev"><div class="opdev-card opdev-error">Could not load your workspace: ${esc(err.message)}</div></div>`;
    }
  }

  function renderWorkspace(root, ws) {
    const p = ws.current_project;
    const tasks = ws.tasks || [];

    const html = [];

    /* ---- profile strip (Phase 5) ---- */
    const prof = ws.profile || {};
    const initials = (prof.full_name || prof.email || '?').slice(0, 2).toUpperCase();
    html.push(`
      <section class="opdev-card opdev-profile" aria-label="Profile">
        ${prof.avatar_url
          ? `<img class="opdev-avatar" src="${esc(prof.avatar_url)}" alt="">`
          : `<div class="opdev-avatar" aria-hidden="true">${esc(initials)}</div>`}
        <div class="opdev-profile-meta">
          <div class="name">${esc(prof.full_name || 'Student')}</div>
          <div class="sub">Software Developer${prof.grade ? ` · ${esc(prof.grade)}` : ''}${prof.streak_count ? ` · ${prof.streak_count}-day streak` : ''}</div>
        </div>
        <div class="opdev-chips">
          ${ws.github_connected ? '<span class="opdev-chip ok">GitHub connected</span>' : '<span class="opdev-chip">GitHub not connected</span>'}
          ${tasks.length ? `<span class="opdev-chip">${tasks.length} task${tasks.length > 1 ? 's' : ''}</span>` : ''}
        </div>
      </section>`);

    /* ---- current project (Phase 5) ---- */
    if (!p) {
      html.push(`
        <section class="opdev-card opdev-project opdev-empty" aria-label="Current project">
          <h3>Current project</h3>
          <p>You don't have an active project yet.<br>
          <span style="font-size:13px">Ask your mentor or an admin to be added to a project team.</span></p>
        </section>`);
    } else {
      const overall = p.progress?.overall_percent ?? 0;
      html.push(`
        <section class="opdev-card opdev-project" aria-label="Current project">
          <div class="opdev-project-top">
            <div>
              <h3 style="margin-bottom:4px">${esc(p.name)}</h3>
              <div class="sub" style="font-size:13px;color:#64748b">
                Role: <strong>${esc(p.my_role)}</strong>
                ${p.milestones?.[0] ? ` · Milestone: ${esc(p.milestones[0].name)}` : ''}
                ${p.repositories?.[0]?.repositories?.url ? ` · <a href="${esc(p.repositories[0].url)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}
              </div>
            </div>
            <span class="opdev-status">${esc(STATUS_LABEL[p.status] || p.status)}</span>
          </div>
          <div style="margin-top:12px">
            <div class="opdev-bar"><span style="width:${Math.min(overall, 100)}%"></span></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-top:6px">
              <span>Overall progress — requirement-driven</span><strong>${overall}%</strong>
            </div>
          </div>
          <div class="opdev-stats">
            <div class="opdev-stat"><div class="num">${tasks.filter(t => t.status === 'DONE').length}/${tasks.length}</div><div class="lbl">My tasks</div></div>
            <div class="opdev-stat"><div class="num">${(ws.activity_14d || []).reduce((s, d) => s + d.commits, 0)}</div><div class="lbl">Commits (14d)</div></div>
            <div class="opdev-stat"><div class="num">${(ws.activity_14d || []).reduce((s, d) => s + d.prs, 0)}</div><div class="lbl">PRs (14d)</div></div>
            <a class="opdev-btn primary" style="display:inline-flex;align-items:center;text-decoration:none" href="/project.html?id=${esc(p.id)}">Open project →</a>
          </div>
        </section>`);
    }

    /* ---- progress (dimension bars) ---- */
    if (p?.progress?.dimensions) {
      const dims = p.progress.dimensions;
      const dimRows = [
        ['Requirements', dims.requirements], ['Development', dims.development],
        ['Testing', dims.testing], ['Documentation', dims.documentation],
        ['Deployment', dims.deployment]
      ];
      html.push(`
        <section class="opdev-card opdev-progress" aria-label="Progress">
          <h3>Progress</h3>
          ${dimRows.map(([label, val]) => `
            <div class="opdev-dim">
              <div class="row"><span>${esc(label)}</span><span class="val">${Number(val) || 0}%</span></div>
              <div class="opdev-bar ${val >= 70 ? 'ok' : ''}"><span style="width:${Math.min(val, 100)}%"></span></div>
            </div>`).join('')}
          ${p.progress.requirement_progress?.length ? `
            <h3 style="margin-top:20px">Requirements</h3>
            ${p.progress.requirement_progress.map(r => `
              <div class="opdev-req">
                <div class="row"><span>${esc(r.name)}</span><span class="w">${r.weight}% · ${r.completion_percent}%</span></div>
                <div class="opdev-bar ${r.completion_percent >= 70 ? 'ok' : ''}"><span style="width:${Math.min(r.completion_percent, 100)}%"></span></div>
              </div>`).join('')}` : ''}
        </section>`);
    }

    /* ---- current tasks (Phase 7) ---- */
    html.push(`
      <section class="opdev-card opdev-tasks" aria-label="My tasks">
        <h3>My tasks</h3>
        <div id="opdev-task-list">
        ${tasks.length === 0
          ? `<div class="opdev-empty">No tasks assigned.</div>`
          : tasks.map(taskCard).join('')}
        </div>
      </section>`);

    /* ---- 14-day activity (Phase 6) ---- */
    html.push(`
      <section class="opdev-card opdev-activity" aria-label="14-day development activity">
        <h3>14-day development activity</h3>
        <div id="opdev-activity-grid"></div>
        <p style="font-size:12px;color:#64748b;margin:10px 0 0">Commits · tasks · PRs · reviews · tests — evidence of building, not a score.</p>
      </section>`);

    /* ---- recent activity ---- */
    const recent = Array.isArray(ws.recent_activity) ? ws.recent_activity : [];
    html.push(`
      <section class="opdev-card opdev-recent" aria-label="Recent development activity">
        <div class="opdev-section-head">
          <h3>Recent activity</h3>
          <span class="opdev-section-note">${recent.length} events</span>
        </div>
        <ul class="opdev-feed">
          ${recent.length ? recent.slice(0, 6).map(a => `
            <li>
              <span class="opdev-feed-dot" aria-hidden="true"></span>
              <div class="opdev-feed-main">
                <div class="opdev-feed-title">${esc(a.title || a.type || 'Development activity')}</div>
                <div class="opdev-feed-meta">${esc(String(a.type || '').replaceAll('_', ' '))} · ${esc(when(a.occurred_at))}</div>
              </div>
              ${a.metadata?.url ? `<a class="opdev-feed-link" href="${esc(a.metadata.url)}" target="_blank" rel="noopener" aria-label="Open activity">↗</a>` : ''}
            </li>`).join('') : '<li class="opdev-feed-empty">No development activity recorded yet.</li>'}
        </ul>
      </section>`);

    /* ---- team ---- */
    const team = Array.isArray(p?.team) ? p.team : (Array.isArray(ws.team) ? ws.team : []);
    html.push(`
      <section class="opdev-card opdev-team" aria-label="Team and project information">
        <div class="opdev-section-head">
          <h3>Team &amp; project information</h3>
          <a class="opdev-section-link" href="${p ? `/project.html?id=${esc(p.id)}` : '#'}">${p ? 'View project →' : 'Project details'}</a>
        </div>
        ${team.length ? `
          <div class="opdev-team-grid">
            ${team.slice(0, 6).map(member => {
              const name = member.profiles?.full_name || member.full_name || member.name || member.email || 'Team member';
              const initials = name.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
              return `
                <div class="opdev-member">
                  ${member.profiles?.avatar_url || member.avatar_url ? `<img class="opdev-member-avatar" src="${esc(member.profiles?.avatar_url || member.avatar_url)}" alt="">` : `<div class="opdev-member-avatar">${esc(initials)}</div>`}
                  <div class="opdev-member-meta">
                    <strong>${esc(name)}</strong>
                    <span>${esc(member.role || 'Developer')}${member.user_id === prof.id ? ' · You' : ''}</span>
                  </div>
                </div>`;
            }).join('')}
          </div>` : '<div class="opdev-empty opdev-team-empty">Your project team will appear here when you are assigned.</div>'}
        ${p ? `
          <div class="opdev-project-meta">
            <div><span>Project</span><strong>${esc(p.name)}</strong></div>
            <div><span>Status</span><strong>${esc(STATUS_LABEL[p.status] || p.status)}</strong></div>
            <div><span>Assigned tasks</span><strong>${tasks.length}</strong></div>
            <div><span>Milestone</span><strong>${esc(p.milestones?.[0]?.name || '—')}</strong></div>
          </div>` : ''}
      </section>`);

    root.innerHTML = `<div class="opdev">${html.join('')}</div>`;

    // bind activity grid
    const gridEl = root.querySelector('#opdev-activity-grid');
    if (gridEl && window.OPDevActivity) {
      OPDevActivity.render(gridEl, ws.activity_14d || []);
    }

    // bind task actions
    root.querySelectorAll('[data-task-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId = btn.dataset.taskId;
        const action = btn.dataset.action;
        btn.disabled = true;
        try {
          await api(`/api/tasks/${taskId}/transition`, {
            method: 'POST',
            body: JSON.stringify({ action })
          });
          await init(rootSelector); // refresh
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function taskCard(t) {
    const actions = [];
    if (t.status === 'TODO') actions.push(['start', 'Start', 'primary']);
    if (t.status === 'IN_PROGRESS') {
      actions.push(['submit', 'Submit for review', 'primary']);
      actions.push(['pause', 'Pause', '']);
    }
    if (t.status === 'IN_REVIEW') actions.push(['test', 'Mark in testing', '']);
    // NOTE: no "mark done" for students — mentors approve (Phase 35).

    return `
      <div class="opdev-task">
        <div class="t-main">
          <div class="t-title">${esc(t.title)}</div>
          <div class="t-meta">
            ${esc(TASK_LABEL[t.status] || t.status)} · ${esc(PRIORITY_LABEL[t.priority] || t.priority)}
            ${t.due_date ? ` · due ${esc(t.due_date)}` : ''}
            ${t.github_pr_url ? ` · <a href="${esc(t.github_pr_url)}" target="_blank" rel="noopener">PR ↗</a>` : ''}
            ${t.github_issue_url ? ` · <a href="${esc(t.github_issue_url)}" target="_blank" rel="noopener">Issue ↗</a>` : ''}
          </div>
        </div>
        <div class="t-actions">
          ${actions.map(([a, label, cls]) =>
            `<button class="opdev-btn ${cls}" data-task-action data-task-id="${esc(t.id)}" data-action="${esc(a)}">${esc(label)}</button>`
          ).join('')}
        </div>
      </div>`;
  }

  window.OPDevWorkspace = { init };
})();
