/* ============================================================
   Shared Navigation Component
   ============================================================
   Renders a consistent header nav with links and avatar dropdown
   across all pages (dashboard, course, settings, terms, privacy).
   ============================================================ */

const Nav = {
  supabase: null,
  user: null,

  async init() {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseAnonKey && typeof supabase !== 'undefined') {
        this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session?.user) {
          this.user = session.user;
        }
      }
    } catch (e) {
      console.warn('[NAV] Init error:', e.message);
    }
    this.render();
  },

  _url(path) {
    const host = location.hostname;
    const isLearn = host === 'learn.1percent.rw' || host === 'www.learn.1percent.rw';
    if (isLearn) return path === '/' ? '/' : path.replace(/^\//, '/');
    return '/learn' + path;
  },

  render() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    const currentPath = location.pathname.replace(/^\/learn/, '') || '/';

    // Nav links
    const links = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/playground', label: 'Challenges' },
      { href: '/lab', label: 'Code Lab' },
    ];

    nav.innerHTML = links.map(l => {
      const active = currentPath === l.href || currentPath === l.href + '/';
      return `<a href="${this._url(l.href)}"${active ? ' class="active"' : ''}>${l.label}</a>`;
    }).join('');

    // User menu
    if (this.user) {
      this._renderUserMenu(nav);
    } else {
      // Show login button for logged-out users
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

  _renderUserMenu(nav) {
    const user = this.user;
    const name = user.user_metadata?.full_name || user.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const currentPath = location.pathname.replace(/^\/learn/, '') || '/';

    const menu = document.createElement('div');
    menu.id = 'user-menu';
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
        <a href="${this._url('/dashboard')}">Dashboard</a>
        <a href="${this._url('/settings')}">Settings</a>
        <button type="button" id="user-menu-logout">Log Out</button>
      </div>
    `;
    nav.appendChild(menu);

    const trigger = menu.querySelector('#user-menu-trigger');
    const dropdown = menu.querySelector('#user-menu-dropdown');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    menu.querySelector('#user-menu-logout').addEventListener('click', async () => {
      if (this.supabase) await this.supabase.auth.signOut();
      window.location.href = '/';
    });
  }
};

window.Nav = Nav;
