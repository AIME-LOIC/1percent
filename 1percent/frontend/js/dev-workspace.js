/* ============================================================
   dev-workspace.js — Developer Workspace for the student dashboard
   (Phases 5–7, redesigned to the v2 card grid).

   v2 targets (dashboard.html template):
     #dv2-hero-root      profile card + current project card
     #dv2-progress-root  donut + dimension bars
     #dv2-tasks-root     current tasks list
     #dv2-heat-root      14-day activity heatmap (rows × 14 days)
     #dv2-team-root      team members + project information
     #dv2-feed-root      recent project activity feed

   Legacy fallback: a page with only #dev-workspace-root gets the
   old stacked rendering (unchanged behavior).

   Uses OPSession (existing auth) — no new auth. All states handled:
   loading, empty, error, unauthorized (Phase 16).
   ============================================================ */

(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const STATUS_LABEL = {
    REQUESTED: 'Requested', REVIEW: 'In review', APPROVED: 'Approved', PLANNING: 'Planning',
    IN_DEVELOPMENT: 'In Development', TESTING: 'Testing', DEPLOYMENT: 'Deployment',
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
    if (diff < 7 * 24 * 3600 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function initialsOf(name) {
    return String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }

  /* ============================================================
     Init — resolves v2 roots or the legacy single root
     ============================================================ */

  function resolveRoots() {
    if (document.getElementById('dv2-hero-root')) {
      return {
        v2: true,
        hero: document.getElementById('dv2-hero-root'),
        progress: document.getElementById('dv2-progress-root'),
        tasks: document.getElementById('dv2-tasks-root'),
        heat: document.getElementById('dv2-heat-root'),
        team: document.getElementById('dv2-team-root'),
        feed: document.getElementById('dv2-feed-root')
      };
    }
    const legacy = document.getElementById('dev-workspace-root');
    return legacy ? { v2: false, hero: legacy } : null;
  }

  async function init(rootSelector) {
    const roots = resolveRoots();
    if (!roots) return;

    if (roots.v2) {
      for (const el of Object.values(roots)) {
        if (el) el.innerHTML = '<div class="dv2-empty">Loading…</div>';
      }
    } else {
      roots.hero.innerHTML = `
        <div class="opdev">
          <div class="opdev-card opdev-profile"><div class="opdev-skeleton" style="width:40%"></div><div class="opdev-skeleton" style="width:60%"></div></div>
          <div class="opdev-card opdev-project"><div class="opdev-skeleton" style="width:30%"></div><div class="opdev-skeleton" style="width:80%"></div><div class="opdev-skeleton" style="width:50%"></div></div>
        </div>`;
    }

    try {
      const user = await OPSession.getUser();
      if (!user) {
        const msg = 'Please log in to see your developer workspace.';
        for (const el of Object.values(roots)) {
          if (el) el.innerHTML = `<div class="dv2-empty">${msg}</div>`;
        }
        return;
      }

      const ws = await api('/api/student/dev/dev-workspace');
      if (roots.v2) renderV2(roots, ws);
      else renderLegacy(roots.hero, ws);
    } catch (err) {
      console.warn('[dev-workspace]', err.message);
      const msg = `Could not load your workspace: ${esc(err.message)}`;
      for (const el of Object.values(roots)) {
        if (el) el.innerHTML = `<div class="dv2-empty">${msg}</div>`;
      }
    }
  }

  /* ============================================================
     v2 rendering — one function per card
     ============================================================ */

  function renderV2(roots, ws) {
    renderHero(roots.hero, ws);
    renderProgress(roots.progress, ws);
    renderTasks(roots.tasks, ws.tasks || []);
    renderHeat(roots.heat, ws.activity_14d || []);
    renderTeam(roots.team, ws);
    renderFeed(roots.feed, ws.recent_activity || []);

    // Task transition buttons (delegated once per render)
    const tasksRoot = roots.tasks;
    tasksRoot.querySelectorAll('[data-task-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api(`/api/tasks/${btn.dataset.taskId}/transition`, {
            method: 'POST',
            body: JSON.stringify({ action: btn.dataset.taskAction })
          });
          await init(); // refresh
        } catch (err) {
          if (window.NotificationPopup) NotificationPopup.showPopup('Not allowed', err.message, 'error');
          else alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  /* ---- hero row: profile card + current project card ---- */
  function renderHero(root, ws) {
    const p = ws.current_project;
    const prof = ws.profile || {};
    const tasks = ws.tasks || [];
    const pic = prof.avatar_url
      ? `<img src="${esc(prof.avatar_url)}" alt="">`
      : esc(initialsOf(prof.full_name || prof.email));

    // Profile card
    const profileCard = `
      <section class="dv2-card" aria-label="Profile">
        <div class="dv2-profilecard">
          <div class="pic">${pic}</div>
          <div class="meta">
            <div class="name">${esc(prof.full_name || 'Student')}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#10b981" stroke="#fff" stroke-width="1.5" aria-label="Verified"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.5 3.2 1.5 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.7 12 2.2 8.8l3-1.6 1-3.3 3.4.5z"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="role-row">
              Software Developer <span class="dot-sep">•</span> ${esc(p?.my_role ? String(p.my_role).replace(/_/g, ' ') : 'Developer')}
            </div>
            <div class="team-row">${ws.team?.length ? `Team: <b>${esc(teamName(ws))}</b>` : ''}</div>
            ${p ? `<div class="team-row">Project: <b>${esc(p.name)}</b></div>` : ''}
          </div>
          <div class="badges">
            ${p ? '<span class="dv2-pill">● Active</span>' : '<span class="dv2-pill off">No project yet</span>'}
            ${ws.github_connected || prof.github_username
              ? `<span class="dv2-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.14c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg> GitHub Connected</span>`
              : `<a class="dv2-pill off" style="text-decoration:none" href="#gh-link-hint">GitHub not connected</a>`}
          </div>
        </div>
      </section>`;

    // Current project card
    let projectCard;
    if (!p) {
      projectCard = `
        <section class="dv2-card" aria-label="Current project">
          <div class="dv2-projectcard-head">
            <h3>Current Project</h3>
          </div>
          <div class="dv2-empty">You don't have an active project yet.<br>
            <span style="font-size:12px">Ask your mentor or an admin to be added to a project team.</span>
          </div>
        </section>`;
    } else {
      const overall = p.progress?.overall_percent ?? 0;
      const milestone = p.milestones?.find(m => m.status !== 'DONE') || p.milestones?.[0];
      const due = p.target_date || milestone?.due_date;
      projectCard = `
        <section class="dv2-card" aria-label="Current project">
          <div class="dv2-projectcard-head">
            <h3>Current Project</h3>
            <a class="dv2-link" href="/project.html?id=${esc(p.id)}">View Project →</a>
          </div>
          <div class="dv2-project">
            <div class="icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <div style="min-width:0">
              <div class="name">${esc(p.name)}</div>
              <div class="desc">${esc(p.description || 'No description yet.')}</div>
            </div>
            <span class="dv2-pill status">${esc(STATUS_LABEL[p.status] || p.status)}</span>
          </div>
          <div class="bar"><span style="width:${Math.min(overall, 100)}%"></span></div>
          <div class="pct-row"><span>Progress</span><b>${overall}%</b></div>
          <div class="dv2-project-meta">
            <div><div class="lbl">Team</div><div class="val">${ws.team?.length || 0} members</div></div>
            <div><div class="lbl">Milestone</div><div class="val">${esc(milestone?.name || '—')}</div></div>
            <div><div class="lbl">Due Date</div><div class="val">${esc(fmtDate(due))}</div></div>
          </div>
        </section>`;
    }

    root.innerHTML = profileCard + projectCard;
  }

  function teamName(ws) {
    // team rows carry team_id — show the first team's id-derived label only if
    // a name wasn't provided by the API.
    return ws.team_name || (ws.team?.length ? `${ws.team.length} members` : '—');
  }

  /* ---- progress donut + dimension bars ---- */
  function renderProgress(root, ws) {
    const p = ws.current_project;
    if (!root) return;
    if (!p?.progress) {
      root.innerHTML = '<div class="dv2-empty">Join a project to see requirement-driven progress here.</div>';
      return;
    }
    const overall = p.progress.overall_percent ?? 0;
    const dims = p.progress.dimensions || {};
    const dimRows = [
      ['Requirements', dims.requirements, '#0d6e3f'],
      ['Development', dims.development, '#f59e0b'],
      ['Testing', dims.testing, '#3b82f6'],
      ['Documentation', dims.documentation, '#8b5cf6'],
      ['Deployment', dims.deployment, '#6366f1']
    ];
    root.innerHTML = `
      <div class="dv2-donut-wrap">
        <div class="dv2-donut" style="--pct:${Math.min(overall, 100)}" role="img" aria-label="Overall completion ${overall}%">
          <div class="center"><b>${overall}%</b><span>Overall Completion</span></div>
        </div>
        <div class="dv2-dims">
          ${dimRows.map(([label, val, color]) => `
            <div class="dv2-dim">
              <span class="cdot" style="background:${color}"></span>
              <span class="track"><span style="width:${Math.min(Number(val) || 0, 100)}%;background:${color}"></span></span>
              <span class="pct">${Number(val) || 0}%</span>
            </div>`).join('')}
        </div>
      </div>
      ${p.progress.requirement_progress?.length ? `
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
          ${p.progress.requirement_progress.map(r => `
            <div class="dv2-dim" style="grid-template-columns:1fr 56px 44px">
              <span style="font-size:12.5px;color:var(--dv2-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)} <span style="color:#94a3b8">· ${r.weight}%</span></span>
              <span class="track"><span style="width:${Math.min(r.completion_percent, 100)}%;background:#0d6e3f"></span></span>
              <span class="pct">${r.completion_percent}%</span>
            </div>`).join('')}
        </div>` : ''}`;
  }

  /* ---- tasks ---- */
  function taskActionButtons(t) {
    const actions = [];
    if (t.status === 'TODO') actions.push(['start', 'Start', 'primary']);
    if (t.status === 'IN_PROGRESS') {
      actions.push(['submit', 'Submit', 'primary']);
      actions.push(['pause', 'Pause', '']);
    }
    if (t.status === 'IN_REVIEW') actions.push(['test', 'Test', '']);
    // NOTE: no "mark done" for students — mentors approve (Phase 35).
    return actions.map(([a, label, cls]) =>
      `<button class="dv2-mini-btn ${cls}" data-task-action data-task-id="${esc(t.id)}" data-task-action="${esc(a)}">${esc(label)}</button>`
    ).join('');
  }

  function renderTasks(root, tasks) {
    if (!root) return;
    if (!tasks.length) {
      root.innerHTML = '<div class="dv2-empty">No tasks assigned yet — your mentor will assign them from the project board.</div>';
      return;
    }
    root.innerHTML = `<div class="dv2-tasks">${tasks.map(t => `
      <div class="dv2-task ${t.status === 'DONE' ? 'done' : ''}">
        <span class="check">${t.status === 'DONE' ? '✓' : ''}</span>
        <div class="t-main">
          <div class="t-title">${esc(t.title)}</div>
          <div class="t-tags">
            <span class="dv2-tag prio-${esc(t.priority || 'MEDIUM')}">${esc(PRIORITY_LABEL[t.priority] || t.priority)}</span>
            <span class="dv2-tag st-${esc(t.status)}">${esc(TASK_LABEL[t.status] || t.status)}</span>
          </div>
        </div>
        <span class="due">${t.due_date ? esc(fmtDate(t.due_date)) : ''}</span>
        <div class="t-actions">${taskActionButtons(t)}</div>
      </div>`).join('')}</div>`;
  }

  /* ---- 14-day heatmap (rows × 14 days, mockup style) ---- */
  function renderHeat(root, days) {
    if (!root) return;
    if (!days.length || days.every(d => !d.total)) {
      root.innerHTML = '<div class="dv2-empty">No development activity in the last 14 days. Push a commit to a connected repo — or complete tasks — and it shows up here.</div>';
      return;
    }
    const rows = [
      ['Commits', 'commits'], ['Tasks', 'tasks'], ['PRs', 'prs'],
      ['Reviews', 'reviews'], ['Tests', 'tests'], ['Deployments', 'deployments'], ['Docs', 'docs']
    ];
    const dayLabel = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00Z');
      return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    };
    const level = (v, max) => {
      if (!v) return 0;
      const r = v / Math.max(max, 1);
      return r > 0.66 ? 3 : r > 0.33 ? 2 : 1;
    };

    const head = `<div class="dv2-heat-cols"><span></span><div class="dv2-heat-days">${days.map(d => `<span>${esc(dayLabel(d.date))}</span>`).join('')}</div></div>`;
    const grid = rows.map(([label, key]) => {
      const vals = days.map(d => Number(d[key]) || 0);
      const max = Math.max(1, ...vals);
      return `
        <div class="dv2-heat-row">
          <span class="rl">${label}</span>
          <div class="dv2-heat-cells">
            ${days.map((d, i) => `<span class="dv2-heat-cell lvl${level(vals[i], max)}" title="${esc(d.date)} — ${label}: ${vals[i]}"></span>`).join('')}
          </div>
        </div>`;
    }).join('');
    const legend = `
      <div class="dv2-heat-legend">Low activity
        <i style="background:#eef2ef"></i><i style="background:#d3ead9"></i><i style="background:#7fc79a"></i><i style="background:#0d6e3f"></i>
        High activity</div>`;

    root.innerHTML = `<div class="dv2-heat">${head}${grid}</div>${legend}`;
  }

  /* ---- team members + project info ---- */
  function renderTeam(root, ws) {
    if (!root) return;
    const p = ws.current_project;
    const team = ws.team || [];
    const meId = ws.profile?.id;

    const members = team.length
      ? `<div class="dv2-team">${team.map(m => {
          const prof = m.profiles || {};
          const isMe = m.user_id === meId;
          return `
            <div class="dv2-member ${isMe ? 'me' : ''}">
              <span class="pic">${prof.avatar_url ? `<img src="${esc(prof.avatar_url)}" alt="">` : esc(initialsOf(prof.full_name || prof.email))}</span>
              <span class="who"><b>${esc(prof.full_name || 'Member')}${isMe ? ' · You' : ''}</b><span>${esc(String(m.role || 'developer').replace(/_/g, ' '))}</span></span>
            </div>`;
        }).join('')}</div>`
      : '<div class="dv2-empty">No team members yet.</div>';

    const milestone = p?.milestones?.find(m => m.status !== 'DONE') || p?.milestones?.[0];
    const doneTasks = (ws.task_stats?.mine_done ?? 0);
    const totalTasks = (ws.task_stats?.mine_total ?? 0);
    const repo = ws.repository;

    const info = p ? `
      <div class="dv2-project-meta" style="grid-template-columns:repeat(3,1fr);margin-top:14px">
        <div><div class="lbl">Project Name</div><div class="val">${esc(p.name)}</div></div>
        <div><div class="lbl">Start Date</div><div class="val">${esc(fmtDate(p.start_date))}</div></div>
        <div><div class="lbl">Repository</div><div class="val">${repo ? `<a href="${esc(repo.html_url || '#')}" target="_blank" rel="noopener" style="color:var(--dv2-primary);text-decoration:none">${esc(repo.full_name || 'repo')}</a>` : '—'}</div></div>
        <div><div class="lbl">Business</div><div class="val">${esc(p.business_name || '1percent Rwanda')}</div></div>
        <div><div class="lbl">Target Date</div><div class="val">${esc(fmtDate(p.target_date))}</div></div>
        <div><div class="lbl">Current Milestone</div><div class="val">${esc(milestone?.name || '—')}</div></div>
        <div><div class="lbl">Status</div><div class="val"><span class="dv2-pill" style="padding:2px 9px">${esc(STATUS_LABEL[p.status] || p.status)}</span></div></div>
        <div><div class="lbl">Priority</div><div class="val"><span class="dv2-tag prio-${esc(p.priority || 'MEDIUM')}">${esc(PRIORITY_LABEL[p.priority] || p.priority)}</span></div></div>
        <div><div class="lbl">Assigned Tasks</div><div class="val">${doneTasks} / ${totalTasks}</div></div>
      </div>` : '';

    root.innerHTML = members + info;
  }

  /* ---- recent activity feed ---- */
  const FEED_ICON = {
    COMMIT_PUSHED: '<path d="M12 2v14"/><path d="m8 8 4-4 4 4"/><circle cx="12" cy="18" r="3"/>',
    PR_OPENED: '<circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><circle cx="18" cy="18" r="3"/><path d="M18 15V9a3 3 0 0 0-3-3h-3"/><path d="m10 9 3-3-3-3"/>',
    PR_MERGED: '<circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><circle cx="18" cy="18" r="3"/><path d="M18 15V9a3 3 0 0 0-3-3h-3"/><path d="m10 9 3-3-3-3"/>',
    REVIEW_SUBMITTED: '<path d="M9 22h6"/><path d="M5 19h14"/><path d="m7 4 10 0 0 8a5 5 0 0 1-10 0z" /><path d="M17 5h2a2 2 0 0 1 0 4h-2"/>',
    TASK_COMPLETED: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m8 12 3 3 5-6"/>',
    MILESTONE_COMPLETED: '<path d="M6 22V4"/><path d="M6 4h12l-2 4 2 4H6"/>',
    DEPLOYMENT_COMPLETED: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
    ISSUE_OPENED: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    ISSUE_CLOSED: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
    MENTOR_FEEDBACK: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  };

  function renderFeed(root, items) {
    if (!root) return;
    if (!items.length) {
      root.innerHTML = '<div class="dv2-empty">No recent activity yet. Connect a repository and start building!</div>';
      return;
    }
    root.innerHTML = `<div class="dv2-feed">${items.slice(0, 8).map(a => {
      const icon = FEED_ICON[a.type] || FEED_ICON.ISSUE_OPENED;
      const l1 = a.title || a.type.replace(/_/g, ' ').toLowerCase();
      const l2 = a.metadata?.repo_full_name || a.metadata?.repo || (a.actor ? `by ${a.actor}` : '');
      return `
        <div class="dv2-feed-item">
          <span class="ic t-${esc(a.type)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>
          <div class="txt">
            <div class="l1">${esc(l1)}</div>
            ${l2 ? `<div class="l2">${esc(l2)}</div>` : ''}
          </div>
          <span class="when">${esc(when(a.occurred_at))}</span>
        </div>`;
    }).join('')}</div>`;
  }

  /* ============================================================
     Legacy rendering (pages still using #dev-workspace-root)
     ============================================================ */

  function renderLegacy(root, ws) {
    const p = ws.current_project;
    const tasks = ws.tasks || [];
    const html = [];

    const prof = ws.profile || {};
    const initials = initialsOf(prof.full_name || prof.email);
    html.push(`
      <section class="opdev-card opdev-profile" aria-label="Profile">
        ${prof.avatar_url
          ? `<img class="opdev-avatar" src="${esc(prof.avatar_url)}" alt="">`
          : `<div class="opdev-avatar" aria-hidden="true">${esc(initials)}</div>`}
        <div class="opdev-profile-meta">
          <div class="name">${esc(prof.full_name || 'Student')}</div>
          <div class="sub">Software Developer${prof.streak_count ? ` · 🔥 ${prof.streak_count}-day streak` : ''}</div>
        </div>
        <div class="opdev-chips">
          ${ws.github_connected ? '<span class="opdev-chip ok">GitHub connected</span>' : '<span class="opdev-chip">GitHub not connected</span>'}
          ${tasks.length ? `<span class="opdev-chip">${tasks.length} task${tasks.length > 1 ? 's' : ''}</span>` : ''}
        </div>
      </section>`);

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
        </section>`);
    }

    html.push(`
      <section class="opdev-card opdev-tasks" aria-label="My tasks">
        <h3>My tasks</h3>
        ${tasks.length === 0
          ? `<div class="opdev-empty">No tasks assigned.</div>`
          : `<div id="opdev-task-list">${tasks.map(legacyTaskCard).join('')}</div>`}
      </section>`);

    html.push(`
      <section class="opdev-card opdev-activity" aria-label="14-day development activity">
        <h3>14-day development activity</h3>
        <div id="opdev-activity-grid"></div>
        <p style="font-size:12px;color:#64748b;margin:10px 0 0">Commits · tasks · PRs · reviews · tests — evidence of building, not a score.</p>
      </section>`);

    root.innerHTML = `<div class="opdev">${html.join('')}</div>`;

    const gridEl = root.querySelector('#opdev-activity-grid');
    if (gridEl && window.OPDevActivity) {
      OPDevActivity.render(gridEl, ws.activity_14d || []);
    }

    root.querySelectorAll('[data-task-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api(`/api/tasks/${btn.dataset.taskId}/transition`, {
            method: 'POST',
            body: JSON.stringify({ action: btn.dataset.taskAction })
          });
          await init(rootSelector);
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function legacyTaskCard(t) {
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
            `<button class="opdev-btn ${cls}" data-task-action data-task-id="${esc(t.id)}" data-task-action="${esc(a)}">${esc(label)}</button>`
          ).join('')}
        </div>
      </div>`;
  }

  window.OPDevWorkspace = { init };
})();
