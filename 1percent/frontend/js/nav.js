/* ============================================================
   Shared Navigation Component
   ============================================================
   One nav for every page that loads this file:
   - Desktop links into #main-nav
   - Notification bell -> panel listing ALL notifications
   - Shared mobile bottom nav (Dashboard / Challenges / Lab /
     Leaderboard / Profile) with page-specific actions injected
     via Nav.addMobileAction(...)
   Self-contained: injects its own styles so it looks identical
   across pages without page-level CSS changes.
   ============================================================ */

const Nav = {
  supabase: null,
  user: null,
  _notifications: [],
  _unreadCount: 0,
  _panelOpen: false,
  _mobileActions: [],

  async init() {
    // Idempotent: pages and the auto-init below may both call this.
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      this._injectStyles();
      try {
        // Prefer the shared persistent session (localStorage-backed, auto-refreshing)
        if (typeof OPSession !== 'undefined') {
          this.supabase = await OPSession.getClient();
          this.user = await OPSession.getUser();
        } else {
          const res = await fetch('/api/config');
          const config = await res.json();
          if (config.supabaseUrl && config.supabaseAnonKey && typeof supabase !== 'undefined') {
            this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session?.user) this.user = session.user;
          }
        }
      } catch (e) {
        console.warn('[NAV] Init error:', e.message);
      }
      this.render();
      this._renderMobileNav();
    })();
    return this._initPromise;
  },

  /* Subdomain-aware link rewriting (learn.1percent.rw serves pages at /) */
  _url(path) {
    const host = location.hostname;
    const isLearn = host === 'learn.1percent.rw' || host === 'www.learn.1percent.rw';
    if (isLearn) return path === '/' ? '/' : path;
    return '/learn' + path;
  },

  _currentPath() {
    return location.pathname.replace(/^\/learn/, '') || '/';
  },

  /* ==========================================================
     STYLES (injected once, shared by all pages)
     ========================================================== */
  _injectStyles() {
    if (document.getElementById('nav-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'nav-shared-styles';
    style.textContent = `
      .nav-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:1px solid var(--border,#e5e7eb);background:var(--bg-card,#fff);color:var(--text-secondary,#6b7280);cursor:pointer;transition:all .15s;}
      .nav-bell:hover{border-color:var(--primary,#0d6e3f);color:var(--primary,#0d6e3f);}
      .nav-bell-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:100px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;}
      .nav-notif-panel{position:fixed;top:64px;right:16px;width:360px;max-width:calc(100vw - 24px);max-height:70vh;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.16);z-index:9999;display:none;flex-direction:column;overflow:hidden;}
      .nav-notif-panel.open{display:flex;}
      .nav-notif-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #f0f0f0;}
      .nav-notif-head h3{font-size:14px;font-weight:700;margin:0;color:#111827;}
      .nav-notif-head button{background:none;border:none;color:#0d6e3f;font-size:12px;font-weight:600;cursor:pointer;padding:4px 6px;border-radius:6px;}
      .nav-notif-head button:hover{background:#f0fdf4;}
      .nav-notif-list{overflow-y:auto;padding:6px 0;}
      .nav-notif-item{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid #f5f5f5;cursor:default;}
      .nav-notif-item:last-child{border-bottom:none;}
      .nav-notif-item.unread{background:#f0fdf4;}
      .nav-notif-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#0d6e3f;}
      .nav-notif-item.read .nav-notif-dot{background:#d1d5db;}
      .nav-notif-body{flex:1;min-width:0;}
      .nav-notif-title{font-size:13px;font-weight:600;color:#111827;margin:0 0 2px;}
      .nav-notif-msg{font-size:12px;color:#6b7280;margin:0;line-height:1.45;word-wrap:break-word;}
      .nav-notif-time{font-size:11px;color:#9ca3af;margin-top:4px;display:block;}
      .nav-notif-empty{padding:32px 16px;text-align:center;color:#9ca3af;font-size:13px;}
      .nav-mobile-bottom{display:none;position:fixed;bottom:0;left:0;right:0;z-index:1000;background:#fff;border-top:1px solid #e5e7eb;padding:6px 8px calc(6px + env(safe-area-inset-bottom));justify-content:space-around;align-items:center;gap:2px;}
      .nav-mobile-bottom a,.nav-mobile-bottom button{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-decoration:none;font-size:10px;font-weight:600;color:#6b7280;padding:5px 2px;border-radius:8px;border:none;background:none;cursor:pointer;font-family:inherit;}
      .nav-mobile-bottom a.active,.nav-mobile-bottom a:hover,.nav-mobile-bottom button:hover{color:#0d6e3f;}
      .nav-mobile-bottom svg{width:20px;height:20px;}
      .nav-mobile-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0d6e3f,#0a5c34);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;}
      @media(max-width:900px){
        .nav-mobile-bottom{display:flex;}
        body{padding-bottom:0;}
      }
    `;
    document.head.appendChild(style);
  },

  /* ==========================================================
     DESKTOP NAV
     ========================================================== */
  render() {
    const nav = document.getElementById('main-nav');
    if (!nav) {
      // No header nav on this page — still render the mobile nav.
      this._renderMobileNav();
      return;
    }

    const currentPath = this._currentPath();
    const links = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/playground', label: 'Challenges' },
      { href: '/lab', label: 'Code Lab' }
    ];

    nav.innerHTML = links.map(l => {
      const active = currentPath === l.href || currentPath === l.href + '/';
      return `<a href="${this._url(l.href)}"${active ? ' class="active"' : ''}>${l.label}</a>`;
    }).join('');

    if (this.user) {
      this._buildBell(nav);
      this._renderUserMenu(nav);
    } else {
      const loginBtn = document.createElement('a');
      loginBtn.href = '#';
      loginBtn.id = 'open-auth';
      loginBtn.className = 'btn btn-primary btn-sm nav-cta';
      loginBtn.textContent = 'Student Login';
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof Modal !== 'undefined') Modal.open('auth-modal');
        else window.location.href = '/';
      });
      nav.appendChild(loginBtn);
    }
  },

  /* ==========================================================
     NOTIFICATION BELL + PANEL
     ========================================================== */
  _buildBell(nav) {
    // Reuse an existing bell button if the page already has one.
    let bell = document.getElementById('header-notify-btn');
    if (!bell) {
      bell = document.createElement('button');
      bell.id = 'header-notify-btn';
      bell.type = 'button';
      bell.className = 'nav-bell';
      bell.setAttribute('aria-label', 'Open notifications');
      bell.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
      nav.parentElement.insertBefore(bell, nav);
    }
    bell.classList.add('nav-bell');

    if (!bell.querySelector('.nav-bell-badge')) {
      const badge = document.createElement('span');
      badge.className = 'nav-bell-badge';
      badge.style.display = 'none';
      bell.appendChild(badge);
    }

    // Replace any previous handler by cloning.
    const cleanBell = bell.cloneNode(true);
    bell.parentNode.replaceChild(cleanBell, bell);
    cleanBell.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleNotificationsPanel();
    });

    this._ensurePanel();
    this._refreshUnreadCount();
  },

  _ensurePanel() {
    if (document.getElementById('nav-notif-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'nav-notif-panel';
    panel.className = 'nav-notif-panel';
    panel.innerHTML = `
      <div class="nav-notif-head">
        <h3>Notifications</h3>
        <button type="button" id="nav-notif-mark-all">Mark all read</button>
      </div>
      <div class="nav-notif-list" id="nav-notif-list">
        <div class="nav-notif-empty">Loading…</div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#nav-notif-mark-all').addEventListener('click', () => this._markAllRead());

    // Close when clicking outside.
    document.addEventListener('click', (e) => {
      if (!this._panelOpen) return;
      const p = document.getElementById('nav-notif-panel');
      const b = document.getElementById('header-notify-btn');
      if (p && !p.contains(e.target) && b && !b.contains(e.target)) {
        this._closeNotificationsPanel();
      }
    });
  },

  async _toggleNotificationsPanel() {
    if (this._panelOpen) return this._closeNotificationsPanel();
    await this._loadNotifications();
    const panel = document.getElementById('nav-notif-panel');
    panel.classList.add('open');
    this._panelOpen = true;
  },

  _closeNotificationsPanel() {
    const panel = document.getElementById('nav-notif-panel');
    if (panel) panel.classList.remove('open');
    this._panelOpen = false;
  },

  async _getToken() {
    if (!this.supabase) return null;
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  },

  async _loadNotifications() {
    const list = document.getElementById('nav-notif-list');
    if (list) list.innerHTML = '<div class="nav-notif-empty">Loading…</div>';
    try {
      const token = await this._getToken();
      if (!token) {
        if (list) list.innerHTML = '<div class="nav-notif-empty">Log in to see notifications.</div>';
        return;
      }
      const res = await fetch('/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      this._notifications = json.notifications || [];
      this._unreadCount = json.unreadCount || 0;
      this._renderNotificationList();
      this._updateBadge();
    } catch (err) {
      console.error('[NAV] Failed to load notifications:', err.message);
      if (list) list.innerHTML = '<div class="nav-notif-empty">Could not load notifications.</div>';
    }
  },

  _renderNotificationList() {
    const list = document.getElementById('nav-notif-list');
    if (!list) return;
    list.replaceChildren();

    if (!this._notifications.length) {
      const empty = document.createElement('div');
      empty.className = 'nav-notif-empty';
      empty.textContent = 'You have no notifications yet.';
      list.appendChild(empty);
      return;
    }

    this._notifications.forEach((n) => {
      const item = document.createElement('div');
      item.className = 'nav-notif-item ' + (n.is_read ? 'read' : 'unread');

      const dot = document.createElement('span');
      dot.className = 'nav-notif-dot';

      const body = document.createElement('div');
      body.className = 'nav-notif-body';

      const title = document.createElement('p');
      title.className = 'nav-notif-title';
      title.textContent = n.title || 'Notification';

      const msg = document.createElement('p');
      msg.className = 'nav-notif-msg';
      msg.textContent = n.message || '';

      const time = document.createElement('span');
      time.className = 'nav-notif-time';
      time.textContent = this._timeAgo(n.created_at);

      body.appendChild(title);
      if (n.message) body.appendChild(msg);
      body.appendChild(time);

      item.appendChild(dot);
      item.appendChild(body);
      list.appendChild(item);
    });
  },

  async _markAllRead() {
    try {
      const token = await this._getToken();
      if (!token) return;
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      this._notifications = this._notifications.map(n => ({ ...n, is_read: true }));
      this._unreadCount = 0;
      this._renderNotificationList();
      this._updateBadge();
    } catch (err) {
      console.error('[NAV] markAllRead failed:', err.message);
    }
  },

  async _refreshUnreadCount() {
    if (!this.user) return;
    try {
      const token = await this._getToken();
      if (!token) return;
      const res = await fetch('/api/notifications?limit=1&unread_only=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      this._unreadCount = json.unreadCount || 0;
      this._updateBadge();
    } catch {
      /* ignore */
    }
  },

  _updateBadge() {
    const badge = document.querySelector('#header-notify-btn .nav-bell-badge');
    if (!badge) return;
    if (this._unreadCount > 0) {
      badge.textContent = this._unreadCount > 99 ? '99+' : String(this._unreadCount);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  /* Live badge update when a realtime notification arrives. */
  onNotification() {
    this._unreadCount += 1;
    this._updateBadge();
  },

  /* ==========================================================
     USER MENU (DOM-safe — no HTML string interpolation of user data)
     ========================================================== */
  _renderUserMenu(nav) {
    const user = this.user;
    const name = user.user_metadata?.full_name || user.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.className = 'user-menu';

    const trigger = document.createElement('button');
    trigger.className = 'user-menu-trigger';
    trigger.id = 'user-menu-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    const avatar = document.createElement('span');
    avatar.className = 'user-avatar';
    avatar.textContent = initials;
    trigger.appendChild(avatar);

    const dropdown = document.createElement('div');
    dropdown.className = 'user-menu-dropdown';
    dropdown.id = 'user-menu-dropdown';

    const info = document.createElement('div');
    info.className = 'user-menu-info';
    const nameEl = document.createElement('b');
    nameEl.textContent = name;
    const emailEl = document.createElement('span');
    emailEl.textContent = user.email || '';
    info.appendChild(nameEl);
    info.appendChild(emailEl);

    const dashLink = document.createElement('a');
    dashLink.href = this._url('/dashboard');
    dashLink.textContent = 'Dashboard';

    const settingsLink = document.createElement('a');
    settingsLink.href = this._url('/settings');
    settingsLink.textContent = 'Settings';

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.id = 'user-menu-logout';
    logoutBtn.textContent = 'Log Out';

    dropdown.appendChild(info);
    dropdown.appendChild(dashLink);
    dropdown.appendChild(settingsLink);
    dropdown.appendChild(logoutBtn);
    menu.appendChild(trigger);
    menu.appendChild(dropdown);
    nav.appendChild(menu);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    logoutBtn.addEventListener('click', async () => {
      if (typeof OPSession !== 'undefined') await OPSession.signOut();
      else if (this.supabase) await this.supabase.auth.signOut();
      window.location.href = '/';
    });
  },

  /* ==========================================================
     MOBILE BOTTOM NAV (shared across pages)
     ========================================================== */
  addMobileAction(action) {
    if (!action || !action.id) return;
    this._mobileActions = this._mobileActions.filter(a => a.id !== action.id);
    this._mobileActions.push(action);
    this._renderMobileNav();
  },

  _renderMobileNav() {
    let nav = document.getElementById('mobile-bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'mobile-bottom-nav';
      nav.className = 'nav-mobile-bottom';
      document.body.appendChild(nav);
    }
    nav.className = 'nav-mobile-bottom';
    nav.replaceChildren();

    const currentPath = this._currentPath();
    const primary = [
      { href: '/dashboard', label: 'Dashboard', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
      { href: '/playground', label: 'Challenges', icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
      { href: '/lab', label: 'Lab', icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22"/>' }
    ];

    primary.forEach(item => {
      const a = document.createElement('a');
      a.href = this._url(item.href);
      if (currentPath === item.href) a.className = 'active';
      a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg><span>${item.label}</span>`;
      nav.appendChild(a);
    });

    // Page-specific actions (e.g. "Lessons" on the course page).
    this._mobileActions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (action.active) btn.className = 'active';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${action.icon || ''}</svg><span>${action.label}</span>`;
      btn.addEventListener('click', (e) => { e.preventDefault(); action.onClick(); });
      nav.appendChild(btn);
    });

    // Leaderboard action (opens the page's leaderboard modal if present).
    const lbBtn = document.createElement('button');
    lbBtn.type = 'button';
    lbBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg><span>Ranks</span>';
    lbBtn.addEventListener('click', (e) => { e.preventDefault(); this.openLeaderboard(); });
    nav.appendChild(lbBtn);

    // Profile
    const profile = document.createElement('a');
    profile.href = this._url('/settings');
    const name = this.user?.user_metadata?.full_name || this.user?.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
    const avatarSpan = document.createElement('span');
    avatarSpan.className = 'nav-mobile-avatar';
    avatarSpan.textContent = initials;
    profile.appendChild(avatarSpan);
    const label = document.createElement('span');
    label.textContent = 'Profile';
    profile.appendChild(label);
    nav.appendChild(profile);
  },

  /* Open the page's leaderboard. Dashboard has a modal (#leaderboard-modal);
     other pages navigate to the dashboard's leaderboard. */
  openLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.dispatchEvent(new CustomEvent('nav:leaderboard'));
      return;
    }
    window.location.href = this._url('/dashboard') + '?leaderboard=1';
  },

  _timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    return date.toLocaleDateString();
  }
};

window.Nav = Nav;

/* ==========================================================
   AUTO-INIT
   ==========================================================
   nav.js is always loaded with `defer`, so the DOM is parsed by
   the time this file runs. Pages no longer need to call
   Nav.init() themselves (doing so is still supported). Once
   init completes, a `nav:ready` event is dispatched so pages
   can customise links / add mobile actions reliably.
   ========================================================== */
const _navReady = () => Nav.init().then(() => document.dispatchEvent(new CustomEvent('nav:ready')));
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _navReady);
} else {
  _navReady();
}
