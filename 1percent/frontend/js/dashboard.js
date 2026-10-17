/* ============================================================
   Dashboard Page Script
   ============================================================ */

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Subdomain-aware URL helper
const _host = location.hostname;
const _isLearn = _host === 'learn.1percent.rw' || _host === 'www.learn.1percent.rw';
function _url(path) {
  // path should NOT include /learn prefix
  if (_isLearn) return 'https://learn.1percent.rw' + path;
  return '/learn' + path;
}

const Dashboard = {
  supabase: null,
  OPEN_DEV_COINS: 1000,

  async init() {
    Modal.init();
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      if ((!config.supabaseUrl || !config.supabaseAnonKey || typeof supabase === 'undefined') && typeof OPSession === 'undefined') {
        this._showGuest(); return;
      }
      // Shared persistent session (restores login from localStorage)
      if (typeof OPSession !== 'undefined') {
        this.supabase = await OPSession.getClient();
      } else {
        this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      }
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) { this._showGuest(); return; }
      // Redirect new users to onboarding
      if (!session.user.user_metadata?.onboarding_completed) {
        const host = location.hostname;
        const isLearn = host === 'learn.1percent.rw' || host === 'www.learn.1percent.rw';
        window.location.href = isLearn ? '/onboarding' : '/learn/onboarding';
        return;
      }
      // Use shared nav component
      Nav.supabase = this.supabase;
      Nav.user = session.user;
      Nav.init();
      await this._renderDashboard(session.user);

      // Developer Workspace (project system) — renders into the v2 card grid
      // (#dv2-*-root targets); falls back to #dev-workspace-root if present.
      if (window.OPDevWorkspace) {
        window.OPDevWorkspace.init();
      }

      // Initialize notification popup system
      await NotificationPopup.init(this.supabase);
    } catch (err) {
      console.error('Dashboard init error:', err);
      this._showGuest();
    }
  },

  /* Fetch the dev workspace once for mode gating (read-only, safe to fail). */
  async _fetchWorkspace() {
    try {
      const token = typeof OPSession !== 'undefined'
        ? await OPSession.getToken()
        : (await this.supabase?.auth.getSession())?.data?.session?.access_token;
      const res = await fetch('/api/student/dev/dev-workspace', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  /* Classic (backup) UI greeting + "open Dev dashboard" switch when the
     student is project-assigned. */
  _renderClassicGreeting(user, name) {
    const skel = document.getElementById('skel-greeting');
    if (skel) skel.style.display = 'none';
    const skelSub = document.getElementById('skel-subtitle');
    if (skelSub) skelSub.style.display = 'none';
    const greetEl = document.getElementById('dash-greeting-text');
    if (greetEl) {
      greetEl.hidden = false;
      greetEl.style.display = '';
      greetEl.textContent = `Welcome back, ${name}`;
    }
    const subEl = document.getElementById('dash-subtitle-text');
    if (subEl) {
      subEl.hidden = false;
      subEl.style.display = '';
    }
    // Free users only reach the Dev UI once their coins hit 1,000.
    // (this._ws is stored by _renderDashboard — referencing `ws` here was a
    // ReferenceError that threw init() into the guest template, wiping the
    // logged-in dashboard.)
    if (this._canDev(this._hasProject, this._ws?.coins)) {
      const header = document.querySelector('.dash-header');
      if (header && !header.querySelector('#classic-dev-switch')) {
        const btn = document.createElement('button');
        btn.id = 'classic-dev-switch';
        btn.type = 'button';
        btn.textContent = 'Open Dev dashboard →';
        btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#0d6e3f,#0a5c34);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;';
        btn.addEventListener('click', () => this._switchMode('dev'));
        header.appendChild(btn);
      }
    }
  },

  /* Dev UI is unlocked for project-assigned students or for anyone whose
     coin balance reaches OPEN_DEV_COINS. */
  _canDev(hasProject, coins) {
    return !!hasProject || (typeof coins === 'number' && coins >= Dashboard.OPEN_DEV_COINS);
  },

  /* Persist a dashboard-mode choice and reload to re-render. */
  _switchMode(val) {
    try { localStorage.setItem('op_dash_choice', val); } catch {}
    location.reload();
  },

  /* Threshold (coins) that frees the Dev dashboard for students who are
     not otherwise assigned to a project. */
  // OPEN_DEV_COINS defined at the top of this object literal.

  /* One-time "Learn or Dev" picker shown until a choice is stored.
     Dev is unlocked once a student is assigned to a project, or once
     their coin balance reaches OPEN_DEV_COINS. */
  async _offerModeChoice(hasProject, mode, coins = 0) {
    let seen = null;
    try { seen = localStorage.getItem('op_dash_choice'); } catch {}
    if (seen || document.getElementById('op-mode-choice')) return;

    const ov = document.createElement('div');
    ov.id = 'op-mode-choice';
    ov.className = 'mode-choice-backdrop';
    ov.innerHTML = `
      <div class="mode-choice" role="dialog" aria-modal="true" aria-label="Choose your dashboard">
        <h3>Welcome! Choose your dashboard</h3>
        <p>You can switch any time from the top menu.</p>
        <div class="mode-choice-grid">
          <button type="button" class="mode-choice-card" data-mode="learn">
            <span class="mc-ic">🎓</span>
            <b>Learn</b>
            <span>Courses, challenges and certificates.</span>
          </button>            <button type="button" class="mode-choice-card ${this._canDev(hasProject, coins) ? '' : 'locked'}" data-mode="dev" ${this._canDev(hasProject, coins) ? '' : 'disabled'}>
            <span class="mc-ic">💻</span>
            <b>Dev</b>
            <span>${this._canDev(hasProject, coins) ? 'Projects, tasks and code activity.' : 'Available once you are assigned to a project or reach 1,000 coins.'}</span>
          </button>
        </div>
        <button type="button" class="mode-choice-dismiss">Continue with ${escapeHTML(mode === 'dev' ? 'Dev' : 'Learn')} →</button>
      </div>`;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelectorAll('.mode-choice-card:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        try { localStorage.setItem('op_dash_choice', btn.dataset.mode); } catch {}
        close();
        if (btn.dataset.mode !== mode) location.reload();
      });
    });
    ov.querySelector('.mode-choice-dismiss')?.addEventListener('click', () => {
      // Remember the current default so the card never shows again
      try { localStorage.setItem('op_dash_choice', mode); } catch {}
      close();
    });
  },

  /* v2 topbar: user chip, menu, notifications, mobile sidebar. Called after
     the template is mounted. Also hides the legacy shared header (#header) —
     the sidebar owns navigation now. */
  _initTopbar(user) {
    const legacyHeader = document.getElementById('header');
    if (legacyHeader) legacyHeader.style.display = 'none';

    const name = user.user_metadata?.full_name || user.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

    const avatar = document.getElementById('dv2-avatar');
    if (avatar) {
      const pic = user.user_metadata?.avatar_url;
      if (pic) avatar.innerHTML = `<img src="${escapeHTML(pic)}" alt="">`;
      else avatar.textContent = initials;
    }
    const whoName = document.getElementById('dv2-who-name');
    if (whoName) whoName.textContent = name;
    const whoRole = document.getElementById('dv2-who-role');
    if (whoRole) whoRole.textContent = user.user_metadata?.role === 'mentor' ? 'Mentor' : 'Student';

    // User menu
    const chip = document.getElementById('dv2-userchip');
    const menu = document.getElementById('dv2-usermenu');
    chip?.addEventListener('click', (e) => {
      e.stopPropagation();
      menu?.classList.toggle('open');
      chip.setAttribute('aria-expanded', String(menu?.classList.contains('open') || false));
    });
    document.addEventListener('click', () => menu?.classList.remove('open'));
    document.getElementById('dv2-logout')?.addEventListener('click', async () => {
      if (typeof OPSession !== 'undefined') await OPSession.signOut();
      else await this.supabase.auth.signOut();
      window.location.href = _url('/');
    });
    document.getElementById('dv2-switch-learn')?.addEventListener('click', () => {
      menu?.classList.remove('open');
      this._switchMode('learn');
    });

    // Notifications: reuse NotificationPopup + unread badge
    document.getElementById('dv2-bell')?.addEventListener('click', async () => {
      if (window.NotificationPopup) {
        await NotificationPopup.checkNow();
        if (NotificationPopup._pendingNotifications?.length) NotificationPopup._showNext();
        else NotificationPopup.showPopup('Notifications', 'You are all caught up.', 'info');
      }
    });
    try {
      const badge = document.getElementById('dv2-bell-badge');
      if (badge && window.NotificationPopup) {
        NotificationPopup.checkNow().then(() => {
          const n = NotificationPopup._pendingNotifications?.length || 0;
          if (n > 0) { badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = 'flex'; }
        }).catch(() => {});
      }
    } catch (e) { /* cosmetic */ }

    // Search: jump to challenges page with the query for now
    document.getElementById('dv2-search')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = e.target.value.trim();
      if (q) window.location.href = _url('/playground') + '?q=' + encodeURIComponent(q);
    });

    this._initPaneNav();
    this._loadGithubCard();

    // Mobile sidebar drawer
    const sidebar = document.getElementById('dv2-sidebar');
    const backdrop = document.getElementById('dv2-backdrop');
    const burger = document.getElementById('dv2-burger');
    const close = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('show'); };
    burger?.addEventListener('click', () => {
      sidebar?.classList.add('open');
      backdrop?.classList.add('show');
    });
    backdrop?.addEventListener('click', close);
    sidebar?.querySelectorAll('.dv2-navlink').forEach(a => a.addEventListener('click', close));
  },

  /* SPA pane switching: sidebar links show/hide sections on the right
     instead of navigating. Hash-synced so refresh keeps the pane. */
  _initPaneNav() {
    const PANES = ['dashboard', 'project', 'tasks', 'activity', 'github', 'learning', 'resources'];
    const TITLES = {
      project: 'My Projects', tasks: 'Tasks', activity: 'Activity',
      github: 'GitHub', learning: 'Learning', resources: 'Resources'
    };
    const main = document.getElementById('dv2-main');
    const title = document.getElementById('dv2-pane-title');
    const links = document.querySelectorAll('.dv2-navlink[data-pane]');
    if (!main || !links.length) return;

    const setPane = (name) => {
      if (!PANES.includes(name)) name = 'dashboard';
      document.querySelectorAll('[data-panes]').forEach(el => {
        el.hidden = !el.dataset.panes.split(',').includes(name);
      });
      links.forEach(a => a.classList.toggle('active', a.dataset.pane === name));
      if (title) {
        title.hidden = name === 'dashboard';
        if (name !== 'dashboard') title.textContent = TITLES[name] || name;
      }
      main.dataset.pane = name;
      try { history.replaceState(null, '', '#' + name); } catch {}
    };

    links.forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      setPane(a.dataset.pane);
    }));

    setPane((location.hash || '').replace('#', ''));
    window.addEventListener('hashchange', () => setPane((location.hash || '').replace('#', '')));
  },

  /* GitHub connection status (its own pane + dashboard card). */
  async _loadGithubCard() {
    const root = document.getElementById('dv2-github-root');
    if (!root) return;
    const notConnected = `
      <div class="dv2-empty">
        No GitHub account connected yet.<br>
        <span style="font-size:12px">Connect it so your commits and pull requests count as your activity.</span><br>
        <a href="${escapeHTML(_url('/settings#github'))}" class="dv2-link" style="display:inline-block;margin-top:8px">Connect GitHub →</a>
      </div>`;
    try {
      const token = typeof OPSession !== 'undefined' ? await OPSession.getToken() : null;
      const res = await fetch('/api/auth/github-link', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      const u = json.github_username;
      if (!json.success || !u) { root.innerHTML = notConnected; return; }
      root.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <img src="https://github.com/${encodeURIComponent(u)}.png?size=104" alt="" width="52" height="52" style="border-radius:50%;border:1px solid rgba(148,163,184,0.4);">
          <div style="flex:1;min-width:160px;">
            <div style="font-weight:700;">@${escapeHTML(u)}</div>
            <a href="https://github.com/${encodeURIComponent(u)}" target="_blank" rel="noopener" class="dv2-link">View GitHub profile →</a>
          </div>
          <a href="${escapeHTML(_url('/settings#github'))}" class="dv2-mini-btn">Manage</a>
        </div>
        <p style="font-size:12px;color:var(--dv2-muted);margin-top:12px;">
          Pushes, pull requests and reviews on connected repositories are credited to your dashboard activity.</p>`;
    } catch { root.innerHTML = notConnected; }
  },

  _showGuest() {
    const app = document.getElementById('dashboard-app');
    const tpl = document.getElementById('dashboard-guest-template');
    app.className = '';
    app.innerHTML = '';
    app.appendChild(tpl.content.cloneNode(true));
  },

  _renderHeaderMenu(user) {
    const name = user.user_metadata?.full_name || user.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const nav = document.getElementById('main-nav');
    // Add nav links
    nav.innerHTML = `
      <a href="${_url('/dashboard')}">Dashboard</a>
      <a href="${_url('/lab')}">Code Lab</a>
      <a href="${_url('/playground')}">Challenges</a>
    `;
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
      <button class="user-menu-trigger" id="user-menu-trigger" aria-haspopup="true" aria-expanded="false">
        <span class="user-avatar">${escapeHTML(initials)}</span>
      </button>
      <div class="user-menu-dropdown" id="user-menu-dropdown">
        <div class="user-menu-info">
          <b>${escapeHTML(name)}</b>
          <span>${escapeHTML(user.email || '')}</span>
        </div>
        <a href="${_url('/')}">Homepage</a>
        <a href="${_url('/settings')}">Settings</a>
        <button type="button" id="user-menu-logout">Log Out</button>
      </div>`;
    nav.appendChild(menu);
    const trigger = menu.querySelector('#user-menu-trigger');
    const dropdown = menu.querySelector('#user-menu-dropdown');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    menu.querySelector('#user-menu-logout').addEventListener('click', async () => {
      if (typeof OPSession !== 'undefined') await OPSession.signOut();
      else await this.supabase.auth.signOut();
      window.location.href = _url('/');
    });
  },  async _renderDashboard(user) {
    const app = document.getElementById('dashboard-app');

    /* ── Mode gate ────────────────────────────────────────────────
       The v2 (Dev) UI is only for students assigned to a project.
       Everyone else — or anyone who chose "Learn" in the one-time
       picker — gets the classic backup UI. */
    const ws = await this._fetchWorkspace();
    this._ws = ws;
    const hasProject = !!ws?.states?.has_project;
    let choice = null;
    try { choice = localStorage.getItem('op_dash_choice'); } catch {}
    const canDev = this._canDev(hasProject, ws?.coins);
    const mode = (canDev && choice !== 'learn') ? 'dev' : 'classic';
    this._mode = mode;
    this._hasProject = hasProject;

    const tpl = document.getElementById(mode === 'dev'
      ? 'dashboard-main-template'
      : 'dashboard-classic-template');
    app.className = '';
    app.innerHTML = '';

    // Resolve ${_url('/path')} placeholders in the inert template BEFORE
    // insertion (template content is not live JS — literals stay literal).
    const frag = tpl.content.cloneNode(true);
    const tmp = document.createElement('div');
    tmp.appendChild(frag);
    tmp.innerHTML = tmp.innerHTML.replace(/\$\{_url\('([^']+)'\)\}/g, (_, p) => _url(p));
    while (tmp.firstChild) app.appendChild(tmp.firstChild);

    const name = user.user_metadata?.full_name?.split(' ')[0] || 'there';

    if (mode === 'dev') {
      // Time-based greeting (mockup: "Good morning, Aime Loic 👋")
      const hour = new Date().getHours();
      const dayPart = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      const greetWrap = document.getElementById('dv2-greeting');
      if (greetWrap) {
        greetWrap.innerHTML = `<h1>Good ${dayPart}, ${escapeHTML(name)} 👋</h1><p>Keep building. You're making progress!</p>`;
      }
      this._initTopbar(user);
    } else {
      this._renderClassicGreeting(user, name);
      const header = document.getElementById('header');
      if (header) header.style.display = '';
    }
      // Apply the membership tier theme (free / pro / pro+) + badge
    this._applyTierTheme();

    // Fetch enrolled courses (shows enrolled skeletons while loading)
    const courses = await this._fetchCourses();
    const enrolled = courses.filter(c => c.enrolled);
    const avgProgress = enrolled.length
      ? Math.round(enrolled.reduce((sum, c) => sum + c.progress, 0) / enrolled.length)
      : 0;
    const completed = enrolled.filter(c => c.progress >= 100).length;

    // Replace stats container with real stats (include coins)
    let coins = 0;
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        const cRes = await fetch('/api/coins/balance', { headers: { Authorization: `Bearer ${token}` } });
        const cJson = await cRes.json();
        if (cJson.success) coins = cJson.coins || 0;
      }
    } catch {}

    // Learning Progress card (dev UI) + stats strip (classic UI) — real data
    if (mode === 'dev') {
      this._renderLearningCard({ enrolled, avgProgress, completed, coins });
    } else {
      // Redesigned student dashboard (dr-* layout in css/dashboard-redesign.css)
      this._renderRdStats({ enrolled, avgProgress, completed, coins });
    }
    app.querySelector('.dash-enrolled-count').textContent = `${enrolled.length} enrolled`;

    this._renderEnrolled(enrolled);
    await this._loadStreak();
    await this._loadCertificates();
    await this._loadAllCourses();
    await this._loadChallenges();
    this._initLeaderboard();

    // Initialize notification and rating handlers
    this._initNotificationHandlers();
    this._initRatingHandlers();

    // One-time Learn/Dev picker (shown until a choice is stored)
    this._offerModeChoice(hasProject, mode, coins);

    if (mode === 'classic') {
      // Hero, cards, tabs, right rail and the certificates popup for the
      // redesigned learn dashboard. Challenges are fetched lazily by the
      // hero/card renderers (_getChallengeData).
      await this._initRdDashboard(user, { enrolled, avgProgress, completed, coins });
    }
  },

  /* ════════════════════════════════════════════════════════════
     REDESIGNED STUDENT DASHBOARD (classic layout, dr-* CSS)
     Hero → stats → My Courses → Challenges → tabs, plus the sticky
     right rail (leaderboard / this week / certificates / activity)
     and the accessible certificates popup dialog.
     All data comes from the SAME endpoints the old dashboard used —
     no auth, route or business-logic changes.
     ════════════════════════════════════════════════════════════ */

  async _initRdDashboard(user, data) {
    const { enrolled, avgProgress, completed, coins } = data;
    this._rdUser = user;

    const ch = await this._getChallengeData();
    this._renderRdHero(enrolled, ch);
    this._renderRdMyCourses(enrolled);
    this._renderRdChallenges(ch);
    this._initRdTabs();
    this._initRdViewAllLinks();
    this._renderRdCertRail();
    this._initRdCertPopup();

    const act = await this._fetchRdActivity(user.id);
    this._renderRdActivityChart(act);
    this._renderRdWeekCard(act);
  },

  /* Challenges: one cached fetch shared by the hero + the card row. */
  async _getChallengeData() {
    if (this._rdChallenges) return this._rdChallenges;
    const set = { all: [], passed: new Set() };
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        const res = await fetch('/api/coins/challenges/all', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          set.all = json.challenges || [];
          set.passed = new Set(json.passed || []);
        }
      }
    } catch { /* challenges are optional */ }
    this._rdChallenges = set;
    return set;
  },

  /* Hero card: continue learning | next challenge.
     Next-challenge rule (per product decision): the FIRST UNFINISHED
     challenge in the hero's course. "All challenges done" when none. */
  _renderRdHero(enrolled, ch) {
    const learn = document.getElementById('dr-hero-learn');
    const nextBox = document.getElementById('dr-hero-next');
    const resumeLink = document.getElementById('dr-hero-resume-link');
    const startLink = document.getElementById('dr-hero-start-link');
    if (!learn || !nextBox) return;

    const courseBox = document.createElement('div');
    courseBox.className = 'dr-course-pick';

    // In-progress course: the one closest to completion; otherwise the
    // first enrolled course. Completed courses fall back to the first one.
    const unfinished = enrolled.filter(c => c.progress < 100).sort((a, b) => b.progress - a.progress);
    const course = unfinished[0] || enrolled[0] || null;

    if (!course) {
      courseBox.innerHTML = `<p class="dr-hero-meta">You haven't enrolled in a course yet — pick your first track from the courses below.</p>`;
      learn.appendChild(courseBox);
      if (resumeLink) {
        resumeLink.hidden = false;
        resumeLink.textContent = 'Explore Courses';
        resumeLink.href = '#';
        resumeLink.addEventListener('click', (e) => { e.preventDefault(); this._activateRdTab('courses'); });
      }
      nextBox.innerHTML = `<p class="dr-hero-meta">Enroll in a course to unlock its challenges.</p>`;
      if (startLink) startLink.hidden = true;
      return;
    }

    courseBox.innerHTML = `
      <div class="dr-hero-title" title="${escapeHTML(course.title)}">${escapeHTML(course.title)}</div>
      <p class="dr-hero-meta">${course.progress}% complete · ${escapeHTML(course.level || 'course')}</p>
      <div class="dr-bar"><div class="dr-bar-fill dr-bar-fill--green" style="width:${Math.min(100, Math.max(0, course.progress))}%"></div></div>`;
    learn.appendChild(courseBox);

    if (resumeLink) {
      resumeLink.hidden = false;
      resumeLink.textContent = 'Resume lesson';
      resumeLink.href = _url('/course/' + escapeHTML(course.slug));
    }

    // First unfinished challenge inside the hero's course
    const next = course
      ? ch.all.filter(c => c.course_id === course.id && !ch.passed.has(c.id))[0]
      : null;

    if (next) {
      nextBox.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <span class="dr-tag dr-tag--diff-${escapeHTML(next.difficulty)}">${escapeHTML(next.difficulty)}</span>
          <span class="dr-tag dr-tag--coins">+${next.coins_reward} coins</span>
        </div>
        <div class="dr-hero-title" title="${escapeHTML(next.title)}">${escapeHTML(next.title)}</div>
        <p class="dr-hero-meta">${escapeHTML((next.description || '').slice(0, 90))}${(next.description || '').length > 90 ? '…' : ''}</p>`;
      if (startLink) {
        startLink.hidden = false;
        startLink.textContent = 'Start challenge';
        startLink.href = _url('/playground?id=' + next.id);
      }
    } else {
      nextBox.innerHTML = `<p class="dr-hero-meta">All challenges done 🎉 — check the Explore tab for new content.</p>`;
      if (startLink) {
        startLink.hidden = false;
        startLink.textContent = 'All challenges done';
        startLink.setAttribute('aria-disabled', 'true');
        startLink.removeAttribute('href');
      }
    }
  },

  _renderRdStats({ enrolled, avgProgress, completed, coins }) {
    const el = document.getElementById('dr-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="dr-stat"><div class="dr-stat-icon courses">${Icons.get('book-open', 20)}</div><div class="dr-stat-body"><b>${enrolled.length}</b><span>Enrolled</span></div></div>
      <div class="dr-stat"><div class="dr-stat-icon progress">${Icons.get('target', 20)}</div><div class="dr-stat-body"><b>${avgProgress}%</b><span>Avg progress</span></div></div>
      <div class="dr-stat"><div class="dr-stat-icon completed">${Icons.get('award', 20)}</div><div class="dr-stat-body"><b>${completed}</b><span>Completed</span></div></div>
      <div class="dr-stat"><div class="dr-stat-icon coins">${Icons.get('coin', 20) || Icons.get('zap', 20)}</div><div class="dr-stat-body"><b>${coins}</b><span>Coins</span></div></div>`;
  },

  /* My Courses: in-progress first, then not-started, completed last. */
  _renderRdMyCourses(enrolled) {
    const grid = document.getElementById('dr-my-courses');
    if (!grid) return;
    if (!enrolled.length) {
      grid.innerHTML = '<div class="dr-empty-row">No courses yet — explore below to enroll.</div>';
      return;
    }
    const inProgress = enrolled.filter(c => c.progress > 0 && c.progress < 100).sort((a, b) => b.progress - a.progress);
    const notStarted = enrolled.filter(c => !c.progress);
    const done = enrolled.filter(c => c.progress >= 100);
    const rows = [...inProgress, ...notStarted, ...done].slice(0, 3);

    grid.innerHTML = rows.map(c => `
      <a href="${_url('/course/' + escapeHTML(c.slug))}" class="dr-course-card">
        <div class="dr-course-thumb" style="background:linear-gradient(135deg,${escapeHTML(c.color || '#d1fae5,#a7f3d0')});">
          ${Icons.get(c.icon || 'book-open', 34)}
        </div>
        <div class="dr-course-name" title="${escapeHTML(c.title)}">${escapeHTML(c.title)}</div>
        <div class="dr-course-progress">
          <div class="dr-bar" style="flex:1"><div class="dr-bar-fill dr-bar-fill--green" style="width:${Math.min(100, Math.max(0, c.progress))}%"></div></div>
          <span class="pct">${c.progress}%</span>
        </div>
      </a>`).join('');
  },

  /* Challenges row: filter chips + one row of 3 cards.
     Unfinished first; done cards keep a green border and a Done badge. */
  _renderRdChallenges(ch) {
    const row = document.getElementById('dr-challenges-row');
    const chipsEl = document.getElementById('dr-challenges-filter');
    if (!row) return;

    if (!ch.all.length) {
      row.innerHTML = '<div class="dr-empty-row">No challenges yet.</div>';
      if (chipsEl) chipsEl.innerHTML = '';
      return;
    }

    const counts = { all: ch.all.length };
    ch.all.forEach(c => { counts[c.difficulty] = (counts[c.difficulty] || 0) + 1; });
    const diffs = ['all', ...Object.keys(counts).filter(d => d !== 'all')];

    if (chipsEl) {
      chipsEl.innerHTML = diffs.map(d =>
        `<button type="button" class="dr-chip${d === 'all' ? ' active' : ''}" data-diff="${d}" aria-pressed="${d === 'all'}">${d === 'all' ? 'All' : escapeHTML(d)} (${counts[d]})</button>`
      ).join('');

      chipsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.dr-chip');
        if (!chip) return;
        chipsEl.querySelectorAll('.dr-chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        current = chip.dataset.diff;
        render();
      });
    }

    const card = (c) => {
      const done = ch.passed.has(c.id);
      return `<a href="${_url('/playground?id=' + c.id)}" class="dr-challenge-card${done ? ' done' : ''}" aria-label="${done ? 'Completed' : escapeHTML(c.difficulty)} challenge ${escapeHTML(c.title)}, reward ${c.coins_reward} coins">
        <div class="dr-ch-card-top">
          <span class="dr-ch-diff ${escapeHTML(c.difficulty)}">${escapeHTML(c.difficulty)}</span>
          <span class="dr-ch-coins">+${c.coins_reward}</span>
        </div>
        <h4 class="dr-ch-title" title="${escapeHTML(c.title)}">${escapeHTML(c.title)}</h4>
        <div class="dr-ch-card-bottom">
          <span class="dr-ch-coins">+${c.coins_reward} coins</span>
          ${done ? '<span class="dr-ch-cta">Done ✓</span>' : '<span class="dr-ch-cta">Start →</span>'}
        </div>
      </a>`;
    };

    let current = 'all';
    const render = () => {
      const list = (current === 'all' ? ch.all : ch.all.filter(c => c.difficulty === current));
      const un = list.filter(c => !ch.passed.has(c.id));
      const dn = list.filter(c => ch.passed.has(c.id));
      const show = [...un, ...dn].slice(0, 3);
      row.innerHTML = show.length ? show.map(card).join('') : `<div class="dr-empty-row">No challenges in this difficulty yet.</div>`;
    };
    render();
  },

  /* Tabs: Explore Courses / Certificates / Roadmap — ARIA tablist with
     roving tabindex and arrow-key navigation. */
  _initRdTabs() {
    const tabs = [...document.querySelectorAll('.dr-tab')];
    if (!tabs.length) return;
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));

    this._activateRdTab = (name, focus = false) => {
      const i = Math.max(0, tabs.findIndex(t => t.id === 'dr-tab-' + name));
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      if (tabs[i].id === 'dr-tab-roadmap') this._loadRdRoadmap();
      if (tabs[0]) this._rdTabCount = tabs.length; // parity guard for tests
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => this._activateRdTab(t.id.replace('dr-tab-', '')));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); this._activateRdTab(tabs[n].id.replace('dr-tab-', ''), true); }
      });
    });
  },

  _initRdViewAllLinks() {
    // "View all" on My Courses opens the Explore Courses tab
    document.getElementById('dr-courses-viewall')?.addEventListener('click', () => {
      this._activateRdTab('courses');
      document.querySelector('.dr-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // Challenges "View all" → the playground (all challenges live there)
    const chLink = document.getElementById('dr-challenges-viewall');
    if (chLink) chLink.href = _url('/playground');
  },

  /* Right rail: 3 most recent certificates + "N earned" pill */
  _renderRdCertRail() {
    const certs = this._certs || [];
    const pill = document.getElementById('dr-certs-pill');
    const rail = document.getElementById('dr-certs-recent');
    if (pill) pill.textContent = `${certs.length} earned`;
    if (!rail) return;
    if (!certs.length) {
      rail.innerHTML = '<div class="dr-empty-row" style="margin:0;">No certificates yet — finish a course to earn your first one.</div>';
      return;
    }
    const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    rail.innerHTML = certs.slice(0, 3).map(c => `
      <div class="dr-cert-mini">
        <span class="icon">${Icons.get('award', 18)}</span>
        <span class="ct"><b title="${escapeHTML(c.course_title || 'Course')}">${escapeHTML(c.course_title || 'Course')}</b><span>${fmt.format(new Date(c.issued_at || Date.now()))}</span></span>
      </div>`).join('');
  },

  /* Certificates popup — accessible native <dialog>:
     Esc closes, focus is trapped while open, and on close the focus
     returns to the "View certificates" trigger. */
  _initRdCertPopup() {
    const btn = document.getElementById('dr-view-certificates');
    const dialog = document.getElementById('dr-cert-dialog');
    if (!btn || !dialog) return;
    btn.addEventListener('click', () => this._openCertPopup());
    dialog.querySelector('#dr-cert-dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { try { btn.focus(); } catch { } });
  },

  _openCertPopup() {
    const dialog = document.getElementById('dr-cert-dialog');
    const body = document.getElementById('dr-cert-body');
    if (!dialog || !body) return;
    const certs = this._certs || [];

    if (!certs.length) {
      body.innerHTML = '<div class="dr-cert-empty">No certificates yet — complete a course and pass the quiz.</div>';
      dialog.showModal();
      return;
    }

    this._rdCertIndex = 0;
    body.innerHTML = `
      <div class="dr-cert-panes">
        <div class="dr-cert-list-pane" role="listbox" aria-label="All certificates" id="dr-cert-list">
          ${certs.map((c, i) => `
            <button type="button" role="option" class="dr-cert-item${i === 0 ? ' selected' : ''}" data-idx="${i}" aria-selected="${i === 0}">
              <b title="${escapeHTML(c.course_title || 'Course')}">${escapeHTML(c.course_title || 'Course')}</b>
              <span>${escapeHTML(c.certificate_number)} · ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(c.issued_at || Date.now()))}</span>
            </button>`).join('')}
        </div>
        <div class="dr-cert-preview-pane" id="dr-cert-preview" aria-live="polite"></div>
      </div>`;

    this._renderCertPreview(0);
    body.querySelector('#dr-cert-list').addEventListener('click', (e) => {
      const item = e.target.closest('.dr-cert-item');
      if (item) this._renderCertPreview(parseInt(item.dataset.idx, 10));
    });

    dialog.showModal();
  },

  _renderCertPreview(idx) {
    const certs = this._certs || [];
    const pane = document.getElementById('dr-cert-preview');
    const listEl = document.getElementById('dr-cert-list');
    if (!pane || !certs[idx]) return;
    this._rdCertIndex = idx;
    const c = certs[idx];
    if (listEl) {
      listEl.querySelectorAll('.dr-cert-item').forEach((el, i) => {
        el.classList.toggle('selected', i === idx);
        el.setAttribute('aria-selected', String(i === idx));
      });
      listEl.querySelector(`.dr-cert-item[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
    }

    const learner = c.learner_name
      || this._rdUser?.user_metadata?.full_name
      || 'Student';
    const dateTxt = c.issued_at ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(c.issued_at)) : '';

    pane.innerHTML = `
      <div class="dr-cert-sheet">
        <div class="ribbon">${Icons.get('award', 24)}</div>
        <h4>${escapeHTML(c.course_title || 'Course certificate')}</h4>
        <p class="cert-line">Certificate of completion</p>
        <p class="cert-line"><b>${escapeHTML(learner)}</b></p>
        <p class="cert-line">Course: ${escapeHTML(c.course_title || 'Course')} · Level: ${escapeHTML(c.course_level || '—')}</p>
        <p class="cert-id">ID: ${escapeHTML(c.certificate_number)} · Issued: ${escapeHTML(dateTxt)}</p>
      </div>
      <div class="dr-cert-actions">
        <a class="dr-link-btn" href="${_url('/certificate?number=' + escapeHTML(c.certificate_number))}">View full certificate</a>
        ${c.course_id ? '<button type="button" class="dr-link-btn dr-link-btn--ghost" id="dr-cert-download">Download</button>' : ''}
      </div>
      <p id="dr-cert-status" style="font-size:11.5px;color:var(--text-muted);margin:8px 0 0;min-height:14px;"></p>`;

    const dlBtn = pane.querySelector('#dr-cert-download');
    if (dlBtn) dlBtn.addEventListener('click', () => this._downloadCert(c));
  },

  /* Download reuses the EXISTING premium PDF endpoint
     (/api/pdf/certificate/:courseId) — same flow as certificate-view. */
  async _downloadCert(cert) {
    const status = document.getElementById('dr-cert-status');
    try {
      if (status) status.textContent = 'Generating PDF…';
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/pdf/certificate/${cert.course_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cert.certificate_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      if (status) status.textContent = '✓ Downloaded';
    } catch (e) {
      if (status) status.textContent = 'Could not generate the PDF right now.';
    }
  },

  /* ── Activity graph (GitHub contribution style) ──
     Grid: 7 rows (Mon–Sun) × 20 weekly columns, 10px cells, 3px gaps.
     Value per day = lessons completed + challenges PASSED that day.
     Data: two bulk queries over the student's own rows (RLS-scoped
     via the logged-in client) — one per source, never one per day.
     Day boundaries use the student's LOCAL timezone. */
  async _fetchRdActivity(userId) {
    const map = new Map(); // 'YYYY-MM-DD' (local) -> completions
    try {
      const WEEKS = 20;
      const today = new Date();
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dow = (todayLocal.getDay() + 6) % 7; // 0 = Monday
      const monday = new Date(todayLocal); monday.setDate(todayLocal.getDate() - dow);
      const start = new Date(monday); start.setDate(monday.getDate() - (WEEKS - 1) * 7);
      const startIso = start.toISOString();

      if (this.supabase) {
        const [lp, cs] = await Promise.all([
          this.supabase.from('lesson_progress').select('completed_at')
            .eq('user_id', userId).eq('completed', true).gte('completed_at', startIso).limit(2000),
          this.supabase.from('challenge_submissions').select('submitted_at')
            .eq('user_id', userId).eq('passed', true).gte('submitted_at', startIso).limit(2000)
        ]);
        const add = (ts) => {
          if (!ts) return;
          const d = new Date(ts);
          if (d < start) return;
          const key = this._rdLocalDate(d);
          map.set(key, (map.get(key) || 0) + 1);
        };
        (lp.data || []).forEach(r => add(r.completed_at));
        (cs.data || []).forEach(r => add(r.submitted_at));
      }
    } catch { /* activity graph is optional */ }
    return map;
  },

  _rdLocalDate(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  _renderRdActivityChart(act) {
    const grid = document.getElementById('dr-activity-grid');
    if (!grid) return;
    const WEEKS = 20;
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dow = (todayLocal.getDay() + 6) % 7;
    const monday = new Date(todayLocal); monday.setDate(todayLocal.getDate() - dow);
    const start = new Date(monday); start.setDate(monday.getDate() - (WEEKS - 1) * 7);

    const fmtShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
    const fmtFull = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const levelOf = (v) => !v ? '' : v === 1 ? 'l1' : v <= 3 ? 'l2' : v <= 5 ? 'l3' : 'l4';

    let cells = '';
    for (let w = 0; w < WEEKS; w++) {
      for (let r = 0; r < 7; r++) {
        const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
        if (d > todayLocal) {
          cells += '<span class="dr-activity-cell" style="visibility:hidden;" aria-hidden="true"></span>';
          continue;
        }
        const v = act.get(this._rdLocalDate(d)) || 0;
        const full = fmtFull.format(d);
        cells += `<span class="dr-activity-cell ${levelOf(v)}" role="img" aria-label="${v} ${v === 1 ? 'activity' : 'activities'} on ${full}" title="${v} activities — ${fmtShort.format(d)}" data-tip="${v} ${v === 1 ? 'activity' : 'activities'} · ${fmtShort.format(d)}"></span>`;
      }
    }
    grid.innerHTML = cells;
  },

  /* "This week": Mon–Sat chips, N/6 + progress bar, from the SAME
     activity dataset (student's local timezone). */
  _renderRdWeekCard(act) {
    const chipsEl = document.getElementById('dr-week-chips');
    const countEl = document.getElementById('dr-week-count');
    const fill = document.getElementById('dr-week-fill');
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dow = (todayLocal.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(todayLocal); monday.setDate(todayLocal.getDate() - dow);

    let doneCount = 0;
    const chips = labels.map((label, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const active = (act.get(this._rdLocalDate(d)) || 0) > 0;
      if (active) doneCount++;
      const isToday = dow === i;
      return `<span class="dr-week-chip${active ? ' done' : ''}${isToday && !active ? ' today' : ''}">${label}</span>`;
    }).join('');

    if (chipsEl) chipsEl.innerHTML = chips;
    if (countEl) countEl.textContent = `${doneCount}/6 study days`;
    if (fill) fill.style.width = `${(doneCount / 6) * 100}%`;
  },

  /* Roadmap tab — compact accordion over /api/roadmap. Rendered once,
     the first time the tab is opened. */
  async _loadRdRoadmap() {
    const el = document.getElementById('dr-roadmap');
    if (!el || this._rdRoadmapLoading) return;
    this._rdRoadmapLoading = true;
    try {
      const res = await fetch('/api/roadmap');
      const json = await res.json();
      const phases = json.roadmap?.phases || [];
      if (!phases.length) { el.innerHTML = '<div class="dr-empty-row">No roadmap available yet.</div>'; return; }

      el.innerHTML = phases.map((p, i) => {
        const modules = p.modules || [];
        const totalLessons = modules.reduce((s, m) => s + (m.lessons?.length || 0), 0);
        return `<div class="dr-roadmap-phase${i === 0 ? ' open' : ''}">
          <div class="dr-roadmap-phase-header" role="button" tabindex="0" aria-expanded="${i === 0}">
            <div class="dr-roadmap-num" style="background:${p.color || 'var(--primary)'}">${i + 1}</div>
            <div class="dr-roadmap-info">
              <h3>${escapeHTML(p.title)}</h3>
              <p>${escapeHTML(p.subtitle || '')} · ${p.duration_weeks || 0} weeks · ${totalLessons} lessons · ${modules.length} modules</p>
            </div>
            <span class="dr-roadmap-toggle">▼</span>
          </div>
          <div class="dr-roadmap-phase-body">
            ${modules.map(m => `<div class="dr-roadmap-module"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(m.title)}</span><span>${(m.lessons?.length || 0)} lessons</span></div>`).join('') || '<div class="dr-roadmap-module"><span style="flex:1;">No modules yet</span><span></span></div>'}
          </div>
        </div>`;
      }).join('');

      el.querySelectorAll('.dr-roadmap-phase-header').forEach((header) => {
        const toggle = () => {
          const phase = header.parentElement;
          const open = phase.classList.toggle('open');
          header.setAttribute('aria-expanded', String(open));
        };
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
    } catch {
      el.innerHTML = '<div class="dr-empty-row">Roadmap unavailable right now.</div>';
    }
  },

  /* Learning Progress card: donut = average course progress, rows = real
     counters. Challenge/certificate percentages update later via their
     loaders (ids dv2-lp-challenges / dv2-lp-certs). */
  _renderLearningCard({ enrolled, avgProgress, completed, coins }) {
    const root = document.getElementById('dv2-learning-root');
    if (!root) return;
    if (!enrolled.length && !completed && !coins) {
      root.innerHTML = '<div class="dv2-empty">No learning data yet — enroll in a course to start.</div>';
      return;
    }
    const rows = [
      { label: 'Courses', color: '#0d6e3f', pct: avgProgress, note: `${enrolled.length} enrolled` },
      { label: 'Completed', color: '#10b981', pct: enrolled.length ? Math.round((completed / enrolled.length) * 100) : 0, note: `${completed} done` },
      { label: 'Coins', color: '#f59e0b', pct: null, note: String(coins) },
      { label: 'Challenges', color: '#8b5cf6', pct: null, id: 'dv2-lp-challenges' },
      { label: 'Certificates', color: '#ec4899', pct: null, id: 'dv2-lp-certs' }
    ];
    root.innerHTML = `
      <div class="dv2-learning">
        <div class="dv2-donut" style="--pct:${Math.min(avgProgress, 100)}" role="img" aria-label="Learning progress ${avgProgress}%">
          <div class="center"><b>${avgProgress}%</b><span>Overall Learning Progress</span></div>
        </div>
        <div class="dv2-dims">
          ${rows.map(r => `
            <div class="dv2-dim">
              <span class="cdot" style="background:${r.color}"></span>
              <span class="track"><span style="width:${r.pct ?? 0}%;background:${r.color}"></span></span>
              <span class="pct" ${r.id ? `id="${r.id}"` : ''}>${r.pct != null ? r.pct + '%' : escapeHTML(r.note)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  },

  async _applyTierTheme() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (typeof TierTheme === 'undefined') return;
      /* Tier is resolved from the backend session payload (/api/auth/me →
         user.tier) — never from localStorage/URL params. This runs on every
         dashboard load, so the theme persists across visits and after a
         payment refreshes the subscription row. */
      const theme = await TierTheme.init(token);
      const isNewRd = !!document.getElementById('dr-app-main');
      const greet = document.getElementById('dv2-greeting') || document.querySelector('.dash-header');
      // The redesigned learn dashboard carries no plan badge — the tier
      // row/badge is skipped there (theming itself still applies).
      if (greet && !isNewRd && !greet.querySelector('.dash-tier-row')) {
        const row = document.createElement('div');
        row.className = 'dash-tier-row';
        // Paid tiers get a crown inside the badge — the single premium indicator
        const crown = theme.isPaid ? `<span class="crown-ic">${Icons.get('crown', 12)}</span>` : '';
        row.innerHTML = TierTheme.badgeHTML(theme.slug).replace('</span>', `${crown}</span>`);
        row.style.marginTop = '8px';
        greet.appendChild(row);
      }
      this._loadTestimonialBadge();
    } catch (e) { console.warn('[DASHBOARD] Tier theme failed:', e.message); }
  },
  async _loadTestimonialBadge() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/testimonials/mine', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await res.json();
      const t = json.testimonial;
      if (!t) return;
      const row = document.querySelector('.dash-tier-row');
      if (!row || row.querySelector('.dash-testimonial-badge')) return;
      const map = {
        pending: { label: 'Testimonial: in review', style: 'background:#fffbeb;color:#92400e;border:1px solid #fde68a;' },
        approved: { label: 'Testimonial: published', style: 'background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;' },
        rejected: { label: 'Testimonial: not published', style: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' }
      };
      const meta = map[t.status] || map.pending;
      const badge = document.createElement('a');
      badge.href = _url('/settings#testimonial');
      badge.className = 'dash-testimonial-badge';
      badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;text-decoration:none;cursor:pointer;' + meta.style;
      badge.textContent = meta.label;
      badge.title = 'Manage your testimonial in Settings';
      row.appendChild(badge);
    } catch (e) { console.warn('[DASHBOARD] Testimonial badge failed:', e.message); }
  },

  async _loadStreak() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/streak', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success) return;
      const s = json.streak;
      const streakEl = document.getElementById('dash-streak');
      if (streakEl) {
        const prev = Number(streakEl.dataset.prev || 0);
        const count = s.streak || 0;
        // Always show the streak badge — 0 with a nudge is more motivating
        // than hiding it (the old code hid the badge at 0).
        streakEl.hidden = false;      // markup ships with the [hidden] attribute
        streakEl.style.display = 'inline-flex';
        streakEl.querySelector('.dash-streak-count').textContent = count;
        if (count === 0) {
          streakEl.title = 'Complete a lesson or just visit tomorrow to start your streak!';
        } else if (count > prev && prev > 0 && sessionStorage.getItem('dash-streak-celebrated') !== String(count)) {
          // 🎉 Streak went up since the last visit on this device
          sessionStorage.setItem('dash-streak-celebrated', String(count));
          this._celebrate(`🔥 ${count}-day streak! Keep it alive!`);
        }
        streakEl.dataset.prev = String(count);
      }
    } catch { /* streak is optional */ }
    // Show upgrade button
    this._renderUpgradeButton();
    this._renderSidebarExtras();
    this._loadActivityChart();
    this._loadClubPromo();
    this._initBugReport();
  },

  /* 🎉 Confetti burst + toast — the fun bit */
  _celebrate(message) {
    try {
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
      for (let i = 0; i < 26; i++) {
        const c = document.createElement('span');
        const size = 6 + Math.random() * 6;
        c.style.cssText = `position:fixed;z-index:99999;top:-12px;left:${Math.random() * 100}vw;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};pointer-events:none;opacity:.95;transition:transform 1.8s cubic-bezier(.25,.6,.4,1),opacity 1.8s;`;
        document.body.appendChild(c);
        requestAnimationFrame(() => {
          c.style.transform = `translate(${(Math.random() - 0.5) * 220}px, ${window.innerHeight * 0.75 + Math.random() * 160}px) rotate(${(Math.random() - 0.5) * 540}deg)`;
          c.style.opacity = '0';
        });
        setTimeout(() => c.remove(), 2000);
      }
    } catch { /* confetti is cosmetic */ }
    if (window.NotificationPopup) {
      window.NotificationPopup.showPopup('🔥 Nice work!', message, 'success');
    }
  },

  /* Real activity sparkline — lesson completions per day, last 14 days */
  async _loadActivityChart() {
    const el = document.getElementById('dash-activity-chart');
    if (!el) return;
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) { el.innerHTML = '<div class="dash-empty" style="padding:8px;font-size:11px;">Log in to see your activity.</div>'; return; }
      const res = await fetch('/api/courses/progress/overall', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      // overall gives course totals only — daily buckets come from completions below.
      let daily = null;
      try {
        const dRes = await fetch('/api/streak/history?days=14', { headers: { Authorization: `Bearer ${token}` } });
        if (dRes.ok) { const dJson = await dRes.json(); if (dJson.success) daily = dJson.days; }
      } catch {}
      if (!daily) {
        el.innerHTML = '<div class="dash-empty" style="padding:8px;font-size:11px;">Your activity will appear here as you complete lessons.</div>';
        return;
      }
      const max = Math.max(1, ...daily.map(d => d.count));
      el.innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:3px;height:70px;">${daily.map(d => {
          const h = Math.max(6, Math.round((d.count / max) * 60));
          const hot = d.count > 0;
          return `<div title="${d.date}: ${d.count} lesson${d.count === 1 ? '' : 's'}" style="flex:1;height:${h}px;border-radius:4px 4px 2px 2px;background:${hot ? 'linear-gradient(180deg,#34d399,#0d6e3f)' : 'var(--surface)'};border:1px solid ${hot ? 'transparent' : 'var(--border)'};transition:height .4s ease;"></div>`;
        }).join('')}</div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:4px;"><span>14d ago</span><span>today</span></div>`;
    } catch {
      el.innerHTML = '<div class="dash-empty" style="padding:8px;font-size:11px;">Could not load activity.</div>';
    }
  },

  /* Robotics club promo — only when not already a member */
  async _loadClubPromo() {
    const promo = document.getElementById('dash-club-promo');
    if (!promo) return;
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/robotics-club/me', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.membership) {
        promo.style.display = 'none'; // already a member — keep it hidden
      } else {
        promo.hidden = false;         // clear the static [hidden] attribute
        promo.style.display = '';     // undo any previous display:none
      }
    } catch {
      promo.hidden = false;         // show promo by default when unknown
      promo.style.display = '';
    }
  },

  /* ── 🐞 Report a Bug — floating button + modal ── */
  _initBugReport() {
    if (document.getElementById('bug-report-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'bug-report-btn';
    btn.type = 'button';
    btn.innerHTML = '🐞<span> Report a Bug</span>';
    btn.style.cssText = 'position:fixed;bottom:76px;right:18px;z-index:900;display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:100px;border:1px solid #fecaca;background:#fff;color:#b91c1c;font-size:12px;font-weight:700;box-shadow:0 4px 16px rgba(220,38,38,.18);cursor:pointer;font-family:inherit;transition:all .15s;';
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 6px 20px rgba(220,38,38,.26)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; btn.style.boxShadow = '0 4px 16px rgba(220,38,38,.18)'; });
    btn.addEventListener('click', () => this._openBugModal());
    document.body.appendChild(btn);
  },

  _openBugModal() {
    if (document.getElementById('bug-modal-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'bug-modal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(17,24,39,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = `
      <div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <h3 style="font-size:17px;font-weight:800;">🐞 Report a Bug</h3>
          <button type="button" id="bug-modal-close" style="border:none;background:none;font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;">×</button>
        </div>
        <p style="font-size:12.5px;color:#6b7280;margin-bottom:14px;">Something broken? Tell us what happened — we read every report.</p>
        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">What happened? *</label>
        <textarea id="bug-desc" rows="3" maxlength="3000" placeholder="e.g. The quiz submit button does nothing when I click it…" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;resize:vertical;"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
          <div><label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">What did you expect?</label><input id="bug-expected" maxlength="500" style="width:100%;padding:9px 11px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;"></div>
          <div><label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">What actually happened?</label><input id="bug-actual" maxlength="500" style="width:100%;padding:9px 11px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;"></div>
        </div>
        <div id="bug-status" style="font-size:12px;margin-top:10px;min-height:16px;font-weight:600;"></div>
        <button type="button" id="bug-submit" style="width:100%;margin-top:6px;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#0d6e3f,#0a5c34);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">Send report</button>
      </div>`;
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.remove(); });
    ov.querySelector('#bug-modal-close').addEventListener('click', () => ov.remove());
    document.body.appendChild(ov);
    ov.querySelector('#bug-desc').focus();

    ov.querySelector('#bug-submit').addEventListener('click', async () => {
      const statusEl = ov.querySelector('#bug-status');
      const desc = ov.querySelector('#bug-desc').value.trim();
      if (desc.length < 5) {
        statusEl.style.color = '#dc2626'; statusEl.textContent = 'Please describe the bug (a few words at least).';
        return;
      }
      const submitBtn = ov.querySelector('#bug-submit');
      submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
      statusEl.textContent = '';
      try {
        const token = (await this.supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/logs/bug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            description: desc,
            expected: ov.querySelector('#bug-expected').value.trim() || null,
            actual: ov.querySelector('#bug-actual').value.trim() || null,
            page: location.pathname
          })
        });
        const json = await res.json();
        if (json.success) {
          ov.remove();
          this._celebrate('Bug squashed… well, reported! Our team will look into it. 🐞🛠️');
        } else {
          throw new Error(json.error || 'Failed to send.');
        }
      } catch (err) {
        statusEl.style.color = '#dc2626';
        statusEl.textContent = err.message || 'Network error — please try again.';
        submitBtn.disabled = false; submitBtn.textContent = 'Send report';
      }
    });
  },

  async _loadCertificates() {
    const grid = document.getElementById('dash-certificates');
    if (!grid) return;
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) { this._certs = []; grid.innerHTML = '<div class="dash-empty">Log in to view certificates.</div>'; return; }
      const res = await fetch('/api/certificates/mine', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success || !json.certificates?.length) {
        this._certs = [];
        grid.innerHTML = '<div class="dash-empty">No certificates yet — complete a course and pass the quiz.</div>';
        document.querySelector('.dash-certs-count').textContent = '0 earned';
        return;
      }
      this._certs = json.certificates;
      document.querySelector('.dash-certs-count').textContent = `${json.certificates.length} earned`;
      const certsCell = document.getElementById('dv2-lp-certs');
      if (certsCell) certsCell.textContent = String(json.certificates.length);
      grid.innerHTML = json.certificates.map(c => {
        const date = c.issued_at ? new Date(c.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        return `<div class="dash-cert-card" style="background:linear-gradient(135deg,#fef3c7,#fff7ed);border:1px solid #f59e0b;border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;gap:14px;">
          <div style="color:#f59e0b;">${Icons.get('award', 28)}</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">${escapeHTML(c.course_title || c.courses?.title || 'Course')}</div>
            <div style="font-size:11px;color:var(--text-muted);">${escapeHTML(c.certificate_number)} · ${date}</div>
          </div>
          <a href="${_url('/certificate?number=' + escapeHTML(c.certificate_number))}" style="font-size:12px;color:var(--primary);font-weight:600;text-decoration:none;">View</a>
        </div>`;
      }).join('');
    } catch {
      this._certs = this._certs || [];
      grid.innerHTML = '<div class="dash-empty">No certificates yet.</div>';
    }
  },

  _renderEnrolled(enrolled) {
    const grid = document.getElementById('dash-enrolled');
    if (!grid) return;

    if (!enrolled.length) {
      grid.innerHTML = '<div class="dash-empty">You\'re not enrolled in any courses yet. Browse below to get started.</div>';
      return;
    }

    grid.innerHTML = enrolled.map(c => `
      <a href="${_url('/course/' + escapeHTML(c.slug))}" class="dash-enrolled-card">
        <div class="dash-enrolled-icon" style="background:${escapeHTML(c.color || '#d1fae5,#a7f3d0')};">
          ${Icons.get(c.icon || 'rocket', 22)}
        </div>
        <div class="dash-enrolled-info">
          <h4>${escapeHTML(c.title)}</h4>
          <div class="dash-enrolled-meta">
            <span class="pct">${c.progress}%</span>
            <div class="bar"><div class="bar-fill" style="width:${Math.min(100, Math.max(0, c.progress))}%;"></div></div>
          </div>
        </div>
      </a>`).join('');
  },

  async _loadAllCourses() {
    const grid = document.getElementById('dash-all-courses');
    const searchInput = document.getElementById('dash-course-search');
    if (!grid) return;

    try {
      const res = await fetch('/api/courses');
      const json = await res.json();
      if (!json.success || !json.courses?.length) {
        grid.innerHTML = '<div class="dash-empty">No courses yet.</div>';
        return;
      }

      const courses = json.courses;
      const countEl = document.querySelector('.dash-courses-count');
      if (countEl) countEl.textContent = courses.length + ' courses';

      const colorMap = {
        beginner: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
        intermediate: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        advanced: 'linear-gradient(135deg,#fef3c7,#fde68a)'
      };
      const levelColor = {
        beginner: '#059669', intermediate: '#2563eb', advanced: '#b45309'
      };

      const render = (items) => {
        if (!items.length) {
          grid.innerHTML = '<div class="dash-empty">No courses match your search.</div>';
          return;
        }
        grid.innerHTML = items.map(c =>
          '<a href="' + _url('/course/' + escapeHTML(c.slug)) + '" class="dash-course-card">' +
            '<div class="dash-course-thumb" style="background:' + (colorMap[c.level] || colorMap.beginner) + ';">' +
              Icons.get(c.icon || 'book-open', 36) +
              '<span class="level-tag" style="color:' + (levelColor[c.level] || levelColor.beginner) + ';">' + escapeHTML(c.level || '') + '</span>' +
            '</div>' +
            '<div class="dash-course-body">' +
              '<h4>' + escapeHTML(c.title) + '</h4>' +
              '<p>' + escapeHTML(c.description || '').slice(0, 90) + ((c.description || '').length > 90 ? '…' : '') + '</p>' +
              '<div class="dash-course-footer">' +
                '<span>' + Icons.get('clock', 11) + ' ' + (c.duration_weeks || 8) + ' weeks</span>' +
                '<span style="font-weight:600;color:var(--primary);font-size:12px;">View →</span>' +
              '</div>' +
            '</div>' +
          '</a>'
        ).join('');
      };

      const updateResults = () => {
        const query = (searchInput?.value || '').trim().toLowerCase();
        const filtered = query
          ? courses.filter(c => (c.title || '').toLowerCase().includes(query) || (c.description || '').toLowerCase().includes(query) || (c.level || '').toLowerCase().includes(query))
          : courses;
        render(query ? filtered.slice(0, 6) : filtered.slice(0, 6));
      };

      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('input', updateResults);
      }

      updateResults();
    } catch {        grid.innerHTML = '<div class="dash-empty">No courses to show yet.</div>';
    }
  },
  async _loadChallenges() {
    const grid = document.getElementById('challenge-grid');
    const filtersEl = document.getElementById('challenge-filters');
    if (!grid) return;

    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      let allChallenges = [];
      let passedSet = new Set();

      if (token) {
        const res = await fetch('/api/coins/challenges/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          allChallenges = json.challenges || [];
          passedSet = new Set(json.passed || []);
        }
      }

      if (!allChallenges.length) {
        grid.innerHTML = '<div class="dash-empty">No challenges yet.</div>';
        return;
      }

      const PAGE = 6;
      let currentFilter = 'all';
      let page = 1;

      const renderCards = (list) => list.map(c => `
        <a href="${_url('/playground?id=' + c.id)}" class="dash-challenge-card${passedSet.has(c.id) ? ' passed' : ''}">
          <div class="ch-top">
            <span class="ch-diff ${c.difficulty}">${c.difficulty}</span>
            <span class="ch-type">${c.challenge_type || 'javascript'}</span>
          </div>
          <h4>${escapeHTML(c.title)}</h4>
          <p>${escapeHTML(c.description || '')}</p>
          <div class="ch-bottom">
            <span class="ch-coins">+${c.coins_reward} coins</span>
            ${passedSet.has(c.id) ? '<span class="ch-status">✓ Done</span>' : '<span class="ch-start">Start →</span>'}
          </div>
          ${c.course_title ? `<div style="margin-top:6px;"><span class="ch-course">${escapeHTML(c.course_title)}</span></div>` : ''}
        </a>`).join('');

      const renderGrid = () => {
        const filtered = currentFilter === 'all' ? allChallenges : allChallenges.filter(c => c.difficulty === currentFilter);
        const show = filtered.slice(0, page * PAGE);
        const hasMore = show.length < filtered.length;
        grid.innerHTML = renderCards(show) +
          (hasMore ? `<div style="grid-column:1/-1;text-align:center;padding:8px 0;"><button onclick="window._loadMoreChallenges()" style="padding:8px 20px;border-radius:6px;border:1px solid var(--border);background:#fff;font-size:13px;font-weight:600;cursor:pointer;">Load more</button></div>` : '');
      };

      window._loadMoreChallenges = () => { page++; renderGrid(); };

      const diffs = [...new Set(allChallenges.map(c => c.difficulty))];
      filtersEl.innerHTML = `<span class="dash-challenge-chip active" data-diff="all">All (${allChallenges.length})</span>
        ${diffs.map(d => {
          const count = allChallenges.filter(c => c.difficulty === d).length;
          return `<span class="dash-challenge-chip" data-diff="${d}">${d} (${count})</span>`;
        }).join('')}`;

      const chCell = document.getElementById('dv2-lp-challenges');
      if (chCell) chCell.textContent = `${passedSet.size}/${allChallenges.length}`;

      filtersEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.dash-challenge-chip');
        if (!chip) return;
        filtersEl.querySelectorAll('.dash-challenge-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.diff;
        page = 1;
        renderGrid();
      });

      renderGrid();
    } catch {
      grid.innerHTML = '<div class="dash-empty">No challenges to show yet.</div>';
    }
  },

  /* Learning Roadmap was removed from the dashboard at product owner's
     request — /api/roadmap data is still used by the course pages. */

  async _renderUpgradeButton() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      /* Source of truth: the session endpoint (which resolves the
         subscription from the DB). Falls back to the premium status
         endpoint, never to client-only flags. */
      let tierSlug = 'free';
      let isPro = false;
      let statusFetched = false;
      try {
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (meRes.ok) {
          const meJson = await meRes.json();
          tierSlug = String(meJson?.user?.tier || 'free').toLowerCase();
          isPro = ['pro', 'unlimited'].includes(tierSlug) && (meJson?.user?.is_premium === true || meJson?.user?.subscription_status === 'active');
          statusFetched = true;
        }
      } catch {}
      if (!statusFetched) {
        const res = await fetch('/api/premium/status', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        tierSlug = json.tier && json.tier.slug ? json.tier.slug : 'free';
        isPro = tierSlug === 'pro' || tierSlug === 'unlimited';
      }
      /* The redesigned learn dashboard places the Upgrade CTA in its
         header tools row; the dev UI keeps its own greeting target. */
      const greet = document.getElementById('dv2-greeting')
        || document.getElementById('dr-header-tools')
        || document.querySelector('.dash-header');
      if (!greet) return;
      /* Consolidated premium indicator: paid users get NO second button —
         their single gold crown badge already sits by the greeting
         (see _applyTierTheme). Free users get one gold upgrade CTA. */
      if (isPro) return;
      if (greet.querySelector('.dash-upgrade-btn')) return;
      const upgradeBtn = document.createElement('a');
      upgradeBtn.href = _url('/payment');
      upgradeBtn.className = 'dash-upgrade-btn';
      upgradeBtn.innerHTML = `${Icons.get('zap', 14)} Upgrade to Pro`;
      upgradeBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;text-decoration:none;border:none;cursor:pointer;margin-top:10px;transition:all .15s;';
      greet.appendChild(upgradeBtn);
    } catch {}
  },

  _renderSidebarExtras() {
    // Weekly goal: 6 study days (Mon–Sat) driven by REAL activity.
    // The old version marked every past weekday "done" just because the
    // date passed — now a day lights up only when the user was active,
    // and today's cell unlocks only after they've actually done something.
    const goalDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const goalWrap = document.getElementById('weekly-goal-days');
    const goalProgress = document.getElementById('weekly-goal-progress');
    const goalFill = document.getElementById('weekly-goal-fill');
    const cheerEl = document.getElementById('goal-encouragement');

    this._weeklyActivity().then(activeDays => {
      const activeSet = new Set(activeDays); // 'YYYY-MM-DD' Rwanda dates
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = fmt.format(new Date());
      const nowRw = new Date(todayStr + 'T12:00:00Z');
      const dow = nowRw.getUTCDay(); // 0=Sun
      // Monday of this week (Rwanda-local)
      const monday = new Date(nowRw.getTime() - ((dow === 0 ? 6 : dow - 1)) * 86400000);

      let completed = 0;
      const cells = goalDays.map((day, index) => {
        const cellDate = new Date(monday.getTime() + index * 86400000);
        const cellStr = cellDate.toISOString().split('T')[0];
        const isFuture = cellStr > todayStr;
        const isToday = cellStr === todayStr;
        const isDone = activeSet.has(cellStr);
        if (isDone) completed++;
        return `<div class="dash-weekday ${isDone ? 'done' : ''} ${isToday && !isDone ? 'today' : ''}" title="${cellStr}${isDone ? ' · active ✓' : ''}">${day}</div>`;
      }).join('');

      if (goalWrap) goalWrap.innerHTML = cells;
      if (goalProgress) goalProgress.textContent = `${completed}/${goalDays.length}`;
      if (goalFill) goalFill.style.width = `${(completed / goalDays.length) * 100}%`;

      if (cheerEl) {
        const msg = completed === 0
          ? 'Complete any lesson to light up your first day! 💪'
          : completed < 3
            ? `${completed} day${completed === 1 ? '' : 's'} this week — keep the momentum! ⚡`
            : completed < 6
              ? `${completed}/6 — you're on fire! Just ${6 - completed} more for a perfect week 🌟`
              : 'Perfect week! You did all 6 days 🏆🎉';
        cheerEl.textContent = msg;
      }
    });

    // Load real notifications from API
    this._loadNotifications();
    
    // Load rating widget
    this._loadRatingWidget();
  },

  /** Dates (YYYY-MM-DD, Rwanda-local) the user was active in the last 7 days.
   * Uses /api/streak/history (activity log); falls back to [] on failure. */
  async _weeklyActivity() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return [];
      const res = await fetch('/api/streak/history?days=7', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const json = await res.json();
      if (!json.success) return [];
      return (json.days || []).filter(d => d.count > 0).map(d => d.date);
    } catch { return []; }
  },

  _initLeaderboard() {
    const list = document.getElementById('dash-lb-list');
    const mobileList = document.getElementById('mobile-leaderboard-list');
    const footer = document.getElementById('dash-lb-footer');
    const tabs = document.querySelectorAll('.dash-lb-tab');
    if (!list && !mobileList) return;
    let lbType = 'coins';

    // Rank movement vs yesterday: +N = climbed (green ▲), -N = dropped (red ▼)
    const lbMovement = (change) => {
      if (typeof change !== 'number' || change === 0) {
        return { html: '<span class="dash-lb-move flat" title="No change since yesterday">—</span>', cls: 'flat' };
      }
      if (change > 0) {
        return { html: `<span class="dash-lb-move up" title="Up ${change} since yesterday">▲${change}</span>`, cls: 'up' };
      }
      return { html: `<span class="dash-lb-move down" title="Down ${Math.abs(change)} since yesterday">▼${Math.abs(change)}</span>`, cls: 'down' };
    };

    const renderList = (target, leaderboard, currentUserRank) => {
      if (!target) return;
      // Rail cards can cap the visible rows (data-max-rows attribute).
      const maxRows = parseInt(target.dataset?.maxRows || '0', 10);
      if (maxRows > 0) leaderboard = leaderboard.slice(0, maxRows);
      if (!leaderboard || !leaderboard.length) {
        target.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">No data yet</div>';
        return;
      }
      const rankClass = r => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
      const medalSvg = (color) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>`;
      const rankIcon = r => r === 1 ? medalSvg('#f59e0b') : r === 2 ? medalSvg('#9ca3af') : r === 3 ? medalSvg('#b45309') : `<span style="font-size:11px;font-weight:800;color:var(--text-muted);">${r}</span>`;
      // Crown for paid (Pro/Pro+) members — badge lives in the name row
      const crown = `<span class="lb-crown" title="Pro member">${Icons.get('crown', 12)}</span>`;
      target.innerHTML = leaderboard.map(u => {
        const initials = (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const score = lbType === 'coins' ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/></svg> ${u.coins} coins` : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> ${u.streak}d`;
        const move = lbMovement(u.rank_change);
        return `<div class="dash-lb-item${u.isCurrentUser ? ' me' : ''}${u.is_premium ? ' is-pro' : ''}">
          <div class="dash-lb-rank ${rankClass(u.rank)}">${rankIcon(u.rank)}</div>
          <div class="dash-lb-avatar">${u.avatar ? `<img src="${u.avatar}" alt="">` : initials}</div>
          <div class="dash-lb-info"><div class="dash-lb-name">${escapeHTML(u.name)}${u.is_premium ? crown : ''}</div><div class="dash-lb-score">${score}</div></div>
          ${move.html}
          ${u.isCurrentUser ? '<span class="dash-lb-you">YOU</span>' : ''}
        </div>`;
      }).join('');
      if (target === list && footer) footer.textContent = currentUserRank ? `Your rank: #${currentUserRank}` : '';
    };

    const load = async () => {
      try {
        const res = await fetch(`/api/streak/leaderboard?type=${lbType}&limit=15`);
        const json = await res.json();
        if (!json.success || !json.leaderboard.length) {
          [list, mobileList].forEach(target => renderList(target, [], ''));
          return;
        }
        [list, mobileList].forEach(target => renderList(target, json.leaderboard, json.currentUserRank));
      } catch {
        [list, mobileList].forEach(target => {
          if (target) target.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">No data yet</div>';
        });
      }
    };

    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      lbType = tab.dataset.type;
      load();
    }));

    load();
    setInterval(load, 60000);
  },

  async _fetchCourses() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return [];

      const [enrollRes, progRes] = await Promise.all([
        fetch('/api/courses/enrollments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses/progress/overall', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const enrollJson = await enrollRes.json();
      if (!enrollJson.success) return [];

      const progJson = await progRes.json();
      const progMap = {};
      (progJson.progress?.courses || []).forEach(c => { progMap[c.course_id] = c.percentage || 0; });

      return (enrollJson.enrollments || []).map(e => {
        const course = e.courses || {};
        return {
          id: e.course_id,
          title: course.title || 'Course',
          slug: course.slug || '',
          icon: course.icon || 'book-open',
          color: course.level === 'advanced' ? '#fef3c7,#fde68a' : course.level === 'intermediate' ? '#dbeafe,#bfdbfe' : '#d1fae5,#a7f3d0',
          level: course.level || '',
          progress: progMap[e.course_id] || 0,
          enrolled: true
        };
      });
    } catch { return []; }
  },

  // ============================================================
  // Notification Methods
  // ============================================================

  async _loadNotifications() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();

      if (!json.success) return;

      const { notifications, unreadCount } = json;
      const notifyList = document.getElementById('dash-notify-list');
      const badge = document.getElementById('dash-new-badge');
      const markAllBtn = document.getElementById('dash-mark-all-read');

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = String(unreadCount);
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (markAllBtn) {
        markAllBtn.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
      }

      if (notifyList) {
        if (!notifications || notifications.length === 0) {
          notifyList.innerHTML = '<div class="dash-empty" style="padding:12px;font-size:12px;">No notifications yet</div>';
          return;
        }

        notifyList.innerHTML = notifications.map(n => {
          const timeAgo = this._getTimeAgo(n.created_at);
          return `
            <div class="dash-notify-item ${n.type} ${n.is_read ? 'read' : ''}" data-id="${n.id}">
              <span class="dot"></span>
              <div class="dash-notify-copy">
                <strong>${escapeHTML(n.title)}</strong>
                <span>${escapeHTML(n.message || '')}</span>
                <span class="dash-notify-time">${timeAgo}</span>
              </div>
              <button class="dash-notify-dismiss" title="Dismiss" onclick="Dashboard._dismissNotification('${n.id}')">×</button>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  },

  _getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  },

  async _dismissNotification(id) {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove the notification from UI
      const item = document.querySelector(`.dash-notify-item[data-id="${id}"]`);
      if (item) {
        item.classList.add('dismissing');
        setTimeout(() => item.remove(), 300);
      }

      // Reload notifications to update badge
      this._loadNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  },

  _initNotificationHandlers() {
    const markAllBtn = document.getElementById('dash-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        try {
          const token = (await this.supabase.auth.getSession()).data.session?.access_token;
          if (!token) return;

          await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
          });

          // Reload notifications
          this._loadNotifications();
        } catch (err) {
          console.error('Failed to mark all as read:', err);
        }
      });
    }
  },

  // ============================================================
  // Rating Methods
  // ============================================================

  async _loadRatingWidget() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      // Load user's existing rating
      const res = await fetch('/api/ratings/mine/general', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();

      if (json.success && json.rating) {
        this._setRatingDisplay(json.rating.rating);
        const feedback = document.getElementById('dash-rating-feedback');
        if (feedback && json.rating.feedback) {
          feedback.value = json.rating.feedback;
        }
      }

      // Load average rating
      const statsRes = await fetch('/api/ratings/stats?category=general');
      const statsJson = await statsRes.json();

      if (statsJson.success && statsJson.stats) {
        const { average, count } = statsJson.stats;
        const avgEl = document.getElementById('dash-rating-avg');
        if (avgEl && count > 0) {
          avgEl.innerHTML = `<span class="avg-stars">${'★'.repeat(Math.round(average))}${'☆'.repeat(5 - Math.round(average))}</span> <span class="avg-text">${average}/5 (${count} rating${count !== 1 ? 's' : ''})</span>`;
        }
      }
    } catch (err) {
      console.error('Failed to load rating widget:', err);
    }
  },

  _setRatingDisplay(value) {
    const stars = document.querySelectorAll('#dash-rating-stars .dash-star');
    const text = document.getElementById('dash-rating-text');
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    stars.forEach((star, index) => {
      if (index < value) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });

    if (text) {
      text.textContent = value ? labels[value] : 'Select a rating';
    }

    this._selectedRating = value;
  },

  _initRatingHandlers() {
    const starsContainer = document.getElementById('dash-rating-stars');
    const submitBtn = document.getElementById('dash-rating-submit');

    if (starsContainer) {
      starsContainer.addEventListener('click', (e) => {
        const star = e.target.closest('.dash-star');
        if (!star) return;
        const value = parseInt(star.dataset.value);
        this._setRatingDisplay(value);
      });

      // Hover effect
      starsContainer.addEventListener('mouseover', (e) => {
        const star = e.target.closest('.dash-star');
        if (!star) return;
        const value = parseInt(star.dataset.value);
        const stars = starsContainer.querySelectorAll('.dash-star');
        stars.forEach((s, i) => {
          s.classList.toggle('hover', i < value);
        });
      });

      starsContainer.addEventListener('mouseout', () => {
        const stars = starsContainer.querySelectorAll('.dash-star');
        stars.forEach(s => s.classList.remove('hover'));
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!this._selectedRating) {
          Modal.show({ title: 'Rating', body: 'Please select a rating first.' });
          return;
        }

        try {
          const token = (await this.supabase.auth.getSession()).data.session?.access_token;
          if (!token) return;

          const feedback = document.getElementById('dash-rating-feedback')?.value || '';

          const res = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              rating: this._selectedRating,
              feedback,
              category: 'general'
            })
          });

          const json = await res.json();

          if (json.success) {
            Modal.show({ title: 'Thank You!', body: 'Your rating has been submitted.' });
            this._loadRatingWidget();
          } else {
            Modal.show({ title: 'Error', body: 'Failed to submit rating. Please try again.' });
          }
        } catch (err) {
          console.error('Failed to submit rating:', err);
          Modal.show({ title: 'Error', body: 'Failed to submit rating. Please try again.' });
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
