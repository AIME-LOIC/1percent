/* ============================================================
   Dashboard Page Script
   ============================================================ */

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const Dashboard = {
  supabase: null,

  async init() {
    Modal.init();
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      if (!config.supabaseUrl || !config.supabaseAnonKey || typeof supabase === 'undefined') {
        this._showGuest(); return;
      }
      this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) { this._showGuest(); return; }
      this._renderHeaderMenu(session.user);
      await this._renderDashboard(session.user);
    } catch (err) {
      console.error('Dashboard init error:', err);
      this._showGuest();
    }
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
      <a href="/learn/dashboard">Dashboard</a>
      <a href="/learn/lab">Code Lab</a>
      <a href="/learn/playground">Challenges</a>
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
        <a href="/learn">Homepage</a>
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
      await this.supabase.auth.signOut();
      window.location.href = '/learn';
    });
  },

  async _renderDashboard(user) {
    const app = document.getElementById('dashboard-app');
    const tpl = document.getElementById('dashboard-main-template');
    app.className = '';
    app.innerHTML = '';
    app.appendChild(tpl.content.cloneNode(true));

    const name = user.user_metadata?.full_name?.split(' ')[0] || 'there';

    // Show real greeting, hide skeleton
    document.getElementById('skel-greeting').style.display = 'none';
    document.getElementById('skel-subtitle').style.display = 'none';
    const greetEl = document.getElementById('dash-greeting-text');
    greetEl.style.display = '';
    greetEl.textContent = `Welcome back, ${name}`;
    document.getElementById('dash-subtitle-text').style.display = '';

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

    document.getElementById('dash-stats').innerHTML = `
      <div class="dash-stat">
        <div class="dash-stat-icon courses">${Icons.get('book-open', 20)}</div>
        <div><b>${enrolled.length}</b><span>Enrolled</span></div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon progress">${Icons.get('target', 20)}</div>
        <div><b>${avgProgress}%</b><span>Avg Progress</span></div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon completed">${Icons.get('award', 20)}</div>
        <div><b>${completed}</b><span>Completed</span></div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon coins">${Icons.get('award', 20)}</div>
        <div><b>${coins}</b><span>Coins</span></div>
      </div>`;
    app.querySelector('.dash-enrolled-count').textContent = `${enrolled.length} enrolled`;

    this._renderEnrolled(enrolled);
    await this._loadStreak();
    await this._loadCertificates();
    await this._loadAllCourses();
    await this._loadChallenges();
    await this._loadRoadmap();
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
      if (streakEl && s.streak > 0) {
        streakEl.style.display = 'inline-flex';
        streakEl.querySelector('.dash-streak-count').textContent = s.streak;
      }
    } catch { /* streak is optional */ }
    // Show upgrade button
    this._renderUpgradeButton();
  },

  async _loadCertificates() {
    const grid = document.getElementById('dash-certificates');
    if (!grid) return;
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) { grid.innerHTML = '<div class="dash-empty">Log in to view certificates.</div>'; return; }
      const res = await fetch('/api/certificates/mine', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success || !json.certificates?.length) {
        grid.innerHTML = '<div class="dash-empty">Complete a course and pass the quiz to earn certificates.</div>';
        document.querySelector('.dash-certs-count').textContent = '0 earned';
        return;
      }
      document.querySelector('.dash-certs-count').textContent = `${json.certificates.length} earned`;
      grid.innerHTML = json.certificates.map(c => {
        const date = c.issued_at ? new Date(c.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        return `<div class="dash-cert-card" style="background:linear-gradient(135deg,#fef3c7,#fff7ed);border:1px solid #f59e0b;border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;gap:14px;">
          <div style="color:#f59e0b;">${Icons.get('award', 28)}</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">${escapeHTML(c.course_title || c.courses?.title || 'Course')}</div>
            <div style="font-size:11px;color:var(--text-muted);">${escapeHTML(c.certificate_number)} · ${date}</div>
          </div>
          <a href="/learn/certificate?number=${escapeHTML(c.certificate_number)}" style="font-size:12px;color:var(--primary);font-weight:600;text-decoration:none;">View</a>
        </div>`;
      }).join('');
    } catch {
      grid.innerHTML = '<div class="dash-empty">Could not load certificates.</div>';
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
      <a href="/learn/course/${escapeHTML(c.slug)}" class="dash-enrolled-card">
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
    if (!grid) return;

    try {
      const res = await fetch('/api/courses');
      const json = await res.json();
      if (!json.success || !json.courses?.length) {
        grid.innerHTML = '<div class="dash-empty">No courses available yet.</div>';
        return;
      }

      document.querySelector('.dash-courses-count').textContent = `${json.courses.length} courses`;

      const colorMap = {
        beginner: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
        intermediate: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        advanced: 'linear-gradient(135deg,#ede9fe,#ddd6fe)'
      };
      const levelColor = {
        beginner: '#059669', intermediate: '#2563eb', advanced: '#7c3aed'
      };

      grid.innerHTML = json.courses.map(c => `
        <a href="/learn/course/${escapeHTML(c.slug)}" class="dash-course-card">
          <div class="dash-course-thumb" style="background:${colorMap[c.level] || colorMap.beginner};">
            ${Icons.get(c.icon || 'book-open', 36)}
            <span class="level-tag" style="color:${levelColor[c.level] || levelColor.beginner};">${escapeHTML(c.level || '')}</span>
          </div>
          <div class="dash-course-body">
            <h4>${escapeHTML(c.title)}</h4>
            <p>${escapeHTML(c.description || '').slice(0, 90)}${(c.description||'').length > 90 ? '…' : ''}</p>
            <div class="dash-course-footer">
              <span>${Icons.get('clock', 11)} ${c.duration_weeks || 8} weeks</span>
              <span style="font-weight:600;color:var(--primary);font-size:12px;">View →</span>
            </div>
          </div>
        </a>`).join('');
    } catch {
      grid.innerHTML = '<div class="dash-empty">Could not load courses.</div>';
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
        grid.innerHTML = '<div class="dash-empty">No challenges available yet.</div>';
        return;
      }

      // Show first 12 on dashboard
      const display = allChallenges.slice(0, 12);

      // Render filters
      const diffs = [...new Set(allChallenges.map(c => c.difficulty))];
      filtersEl.innerHTML = `<span class="dash-challenge-chip active" data-diff="all">All (${allChallenges.length})</span>
        ${diffs.map(d => {
          const count = allChallenges.filter(c => c.difficulty === d).length;
          return `<span class="dash-challenge-chip" data-diff="${d}">${d} (${count})</span>`;
        }).join('')}`;

      // Render challenge cards
      grid.innerHTML = display.map(c => `
        <a href="/learn/playground?id=${c.id}" class="dash-challenge-card${passedSet.has(c.id) ? ' passed' : ''}">
          <div class="ch-top">
            <span class="ch-diff ${c.difficulty}">${c.difficulty}</span>
            <span class="ch-type">${c.challenge_type || 'javascript'}</span>
          </div>
          <h4>${escapeHTML(c.title)}</h4>
          <p>${escapeHTML(c.description || '')}</p>
          <div class="ch-bottom">
            <span class="ch-coins">+${c.coins_reward} coins</span>
            ${passedSet.has(c.id)
              ? '<span class="ch-status">✓ Done</span>'
              : `<span class="ch-start">Start →</span>`}
          </div>
          ${c.course_title ? `<div style="margin-top:6px;"><span class="ch-course">${escapeHTML(c.course_title)}</span></div>` : ''}
        </a>
      `).join('');

      // Filter click handlers
      filtersEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.dash-challenge-chip');
        if (!chip) return;
        filtersEl.querySelectorAll('.dash-challenge-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const val = chip.dataset.diff;
        const filtered = val === 'all' ? allChallenges : allChallenges.filter(c => c.difficulty === val);
        const show = filtered.slice(0, 12);
        grid.innerHTML = show.map(c => `
          <a href="/playground?id=${c.id}" class="dash-challenge-card${passedSet.has(c.id) ? ' passed' : ''}">
            <div class="ch-top">
              <span class="ch-diff ${c.difficulty}">${c.difficulty}</span>
              <span class="ch-type">${c.challenge_type || 'javascript'}</span>
            </div>
            <h4>${escapeHTML(c.title)}</h4>
            <p>${escapeHTML(c.description || '')}</p>
            <div class="ch-bottom">
              <span class="ch-coins">+${c.coins_reward} coins</span>
              ${passedSet.has(c.id)
                ? '<span class="ch-status">Done</span>'
                : `<span class="ch-start">Start &rarr;</span>`}
            </div>
            ${c.course_title ? `<div style="margin-top:6px;"><span class="ch-course">${escapeHTML(c.course_title)}</span></div>` : ''}
          </a>
        `).join('');
      });
    } catch {
      grid.innerHTML = '<div class="dash-empty">Could not load challenges.</div>';
    }
  },

  async _loadRoadmap() {
    const container = document.getElementById('roadmap-container');
    if (!container) return;

    try {
      const res = await fetch('/api/roadmap');
      const json = await res.json();
      if (!json.success || !json.roadmap?.phases) {
        container.innerHTML = '<div class="dash-empty">Roadmap not available.</div>';
        return;
      }

      const phaseIcons = { foundation: 'rocket', fullstack: 'zap', specialisation: 'target', certification: 'trophy' };

      container.innerHTML = json.roadmap.phases.map((phase, i) => {
        const icon = phaseIcons[phase.id] || 'book-open';
        const modules = phase.modules || [];
        const tracks = phase.tracks || [];
        const totalLessons = modules.reduce((s, m) => s + (m.lessons?.length || 0), 0)
          + tracks.reduce((s, t) => s + (t.modules || []).reduce((s2, m) => s2 + (m.lessons?.length || 0), 0), 0);

        return `
          <div class="roadmap-phase${i === 0 ? ' open' : ''}">
            <div class="roadmap-phase-header" onclick="this.parentElement.classList.toggle('open')">
              <div class="roadmap-phase-num" style="background:${phase.color || '#0d6e3f'}">${i + 1}</div>
              <div class="roadmap-phase-info">
                <h3>${Icons.get(icon, 18)} ${escapeHTML(phase.title)}</h3>
                <p>${escapeHTML(phase.subtitle || '')} — ${phase.duration_weeks || 0} weeks · ${totalLessons} lessons</p>
              </div>
              <span class="roadmap-phase-toggle">▼</span>
            </div>
            <div class="roadmap-phase-body">
              ${modules.map(m => this._renderModule(m)).join('')}
              ${tracks.map(t => `
                <div style="margin:8px 0;padding:10px 12px;background:var(--surface);border-radius:var(--radius-sm);">
                  <div style="font-weight:600;font-size:13px;margin-bottom:6px;">${escapeHTML(t.title)}${t.mentor ? ' — ' + escapeHTML(t.mentor) : ''}</div>
                  ${(t.modules || []).map(m => this._renderModule(m)).join('')}
                </div>`).join('')}
            </div>
          </div>`;
      }).join('');
    } catch {
      container.innerHTML = '<div class="dash-empty">Could not load roadmap.</div>';
    }
  },

  _renderModule(m) {
    const lessons = m.lessons || [];
    return `
      <div class="roadmap-module" onclick="this.classList.toggle('open')">
        <div class="roadmap-module-header">
          ${escapeHTML(m.title)}
          <span>${lessons.length} lessons</span>
        </div>
        <div class="roadmap-module-lessons">
          ${lessons.map(l => `
            <div class="roadmap-lesson">
              <span class="type" style="background:${this._typeColor(l.type)};">${l.type || 'video'}</span>
              <span style="flex:1;">${escapeHTML(l.title)}</span>
              <span class="dur">${l.duration_min || 0}m</span>
            </div>`).join('')}
        </div>
      </div>`;
  },

  _typeColor(type) {
    const map = { video: '#dbeafe;color:#2563eb', lab: '#fef3c7;color:#d97706', project: '#ede9fe;color:#7c3aed', reading: '#e0e7ff;color:#4f46e5', quiz: '#fee2e2;color:#dc2626' };
    return map[type] || map.reading;
  },

  async _renderUpgradeButton() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      // Check premium status
      const res = await fetch('/api/premium/status', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const isPro = json.tier && json.tier !== 'free';
      const header = document.querySelector('.dash-header');
      if (!header) return;
      const upgradeBtn = document.createElement('a');
      upgradeBtn.href = '/learn/payment';
      upgradeBtn.className = 'dash-upgrade-btn';
      upgradeBtn.innerHTML = isPro 
        ? `${Icons.get('crown', 14)} Pro Member`
        : `${Icons.get('zap', 14)} Upgrade to Pro`;
      upgradeBtn.style.cssText = isPro
        ? 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;border:none;cursor:pointer;'
        : 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;border:none;cursor:pointer;transition:all .15s;';
      if (!isPro) upgradeBtn.onmouseenter = () => upgradeBtn.style.opacity = '0.9';
      header.appendChild(upgradeBtn);
    } catch {}
  },

  async _fetchCourses() {
    try {
      const token = (await this.supabase.auth.getSession()).data.session?.access_token;
      if (!token) return [];

      const enrollRes = await fetch('/api/courses/enrollments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const enrollJson = await enrollRes.json();
      if (!enrollJson.success) return [];

      const enrollments = enrollJson.enrollments || [];
      const courses = [];

      for (const e of enrollments) {
        const course = e.courses || {};
        let progress = 0;
        try {
          const progRes = await fetch(`/api/courses/${e.course_id}/progress`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const progJson = await progRes.json();
          progress = progJson.progress?.percentage || 0;
        } catch { /* use 0 */ }

        courses.push({
          title: course.title || 'Course',
          slug: course.slug || '',
          icon: course.icon || 'book-open',
          color: course.level === 'advanced' ? '#ede9fe,#ddd6fe' : course.level === 'intermediate' ? '#dbeafe,#bfdbfe' : '#d1fae5,#a7f3d0',
          level: course.level || '',
          progress,
          enrolled: true
        });
      }
      return courses;
    } catch { return []; }
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
