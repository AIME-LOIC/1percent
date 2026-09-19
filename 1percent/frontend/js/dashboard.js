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
      
      // Initialize notification popup system
      await NotificationPopup.init(this.supabase);
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
    greetEl.hidden = false;             // markup ships with the [hidden] attribute — inline display can't beat it
    greetEl.style.display = '';
    greetEl.textContent = `Welcome back, ${name}`;
    const subEl = document.getElementById('dash-subtitle-text');
    subEl.hidden = false;
    subEl.style.display = '';      // Apply the membership tier theme (free / pro / pro+) + badge
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
    this._initLeaderboard();
    
    // Initialize notification and rating handlers
    this._initNotificationHandlers();
    this._initRatingHandlers();
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
      const header = document.querySelector('.dash-header');
      if (header && !header.querySelector('.dash-tier-row')) {
        const row = document.createElement('div');
        row.className = 'dash-tier-row';
        // Paid tiers get a crown inside the badge — the single premium indicator
        const crown = theme.isPaid ? `<span class="crown-ic">${Icons.get('crown', 12)}</span>` : '';
        row.innerHTML = TierTheme.badgeHTML(theme.slug).replace('</span>', `${crown}</span>`);
        const subtitle = document.getElementById('dash-subtitle-text');
        if (subtitle) subtitle.after(row); else header.querySelector('div').appendChild(row);
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
          <a href="${_url('/certificate?number=' + escapeHTML(c.certificate_number))}" style="font-size:12px;color:var(--primary);font-weight:600;text-decoration:none;">View</a>
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
        advanced: 'linear-gradient(135deg,#fef3c7,#fde68a)'
      };
      const levelColor = {
        beginner: '#059669', intermediate: '#2563eb', advanced: '#b45309'
      };

      grid.innerHTML = json.courses.map(c => `
        <a href="${_url('/course/' + escapeHTML(c.slug))}" class="dash-course-card">
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
    const map = { video: '#dbeafe;color:#2563eb', lab: '#fef3c7;color:#d97706', project: '#fef3c7;color:#b45309', reading: '#e0e7ff;color:#4f46e5', quiz: '#fee2e2;color:#dc2626' };
    return map[type] || map.reading;
  },

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
      const header = document.querySelector('.dash-header');
      if (!header) return;
      /* Consolidated premium indicator: paid users get NO second button —
         their single gold crown badge already sits by the greeting
         (see _applyTierTheme). Free users get one gold upgrade CTA. */
      if (isPro) return;
      const upgradeBtn = document.createElement('a');
      upgradeBtn.href = _url('/payment');
      upgradeBtn.className = 'dash-upgrade-btn';
      upgradeBtn.innerHTML = `${Icons.get('zap', 14)} Upgrade to Pro`;
      upgradeBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;text-decoration:none;border:none;cursor:pointer;transition:all .15s;';
      header.appendChild(upgradeBtn);
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
          if (target) target.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Could not load</div>';
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
