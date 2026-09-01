/* ============================================================
   Auth Module
   ============================================================
   Handles Supabase client initialization, login, signup,
   tab switching, and session management.
   ============================================================ */

const Auth = {
  supabase: null,
  currentUser: null,

  /**
   * Initialize Supabase client from server-injected config
   */
  async init() {
    try {
      // Fetch config from server (reads .env securely)
      const res = await fetch('/api/config');
      const config = await res.json();

      if (config.supabaseUrl && config.supabaseAnonKey && typeof supabase !== 'undefined') {
        this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log('✅ Supabase connected');

        // Check existing session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session?.user) {
          this.currentUser = session.user;
          this._onLoggedIn(session.user);
        }

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            this.currentUser = session.user;
            this._onLoggedIn(session.user);
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this._onLoggedOut();
          }
        });
      } else {
        console.warn('⚠ Supabase not configured — auth features limited');
      }
    } catch (err) {
      console.error('Auth init error:', err.message);
    }

    this._bindEvents();
  },

  /**
   * Get current session token (for API calls)
   */
  async getToken() {
    if (!this.supabase) return null;
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  },

  /**
   * Login with email/password
   */
  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Login failed');
    // Store session in Supabase client so getToken() works
    if (this.supabase && json.session) {
      await this.supabase.auth.setSession({
        access_token: json.session.access_token,
        refresh_token: json.session.refresh_token
      });
    }
    return { user: json.user, session: json.session };
  },

  /**
   * Signup with email/password — uses backend API (service role key bypasses rate limits)
   */
  async signup(email, password, fullName) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Signup failed');
    return data;
  },

  /**
   * Logout
   */
  async logout() {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this.currentUser = null;
    window.location.href = '/learn';
  },

  /**
   * Send a password reset email
   */
  async resetPassword(email) {
    if (!this.supabase) throw new Error('Auth not configured');
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw error;
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.currentUser !== null;
  },

  /**
   * Bind form and button events
   */
  _bindEvents() {
    // Login button in header
    const openAuthBtn = document.getElementById('open-auth');
    if (openAuthBtn) {
      openAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Modal.open('auth-modal');
      });
    }

    // Auth tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._switchTab(tab.dataset.tab);
      });
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this._handleLogin(e));
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this._handleSignup(e));
    }

    // Forgot password link
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleForgotPassword();
      });
    }
  },

  /**
   * Handle "forgot password" click — prompts for email and sends reset link
   */
  async _handleForgotPassword() {
    const status = document.getElementById('login-status');
    const emailInput = document.getElementById('login-email');
    const email = emailInput?.value.trim();

    if (!email) {
      status.className = 'form-status error';
      status.textContent = 'Enter your email above first, then click "Forgot password?"';
      emailInput?.focus();
      return;
    }

    try {
      await this.resetPassword(email);
      status.className = 'form-status success';
      status.textContent = 'Password reset link sent — check your email.';
    } catch (err) {
      status.className = 'form-status error';
      status.textContent = 'Could not send reset link. Please try again.';
    }
  },

  /**
   * Switch between login/signup tabs
   */
  _switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const title = document.getElementById('auth-modal-title');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      title.textContent = 'Student Login';
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      title.textContent = 'Create Account';
    }
  },

  /**
   * Handle login form submit
   */
  async _handleLogin(e) {
    e.preventDefault();
    const status = document.getElementById('login-status');
    status.className = 'form-status';
    status.textContent = '';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      await this.login(email, password);
      status.className = 'form-status success';
      status.textContent = 'Welcome back! Redirecting...';
      setTimeout(() => {
        Modal.close('auth-modal');
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err) {
      status.className = 'form-status error';
      status.textContent = err.message?.includes('Invalid') ? 'Invalid email or password.' : 'Login failed. Please try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  },

  /**
   * Handle signup form submit
   */
  async _handleSignup(e) {
    e.preventDefault();
    const status = document.getElementById('signup-status');
    status.className = 'form-status';
    status.textContent = '';

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const data = await this.signup(email, password, name);

      // Log terms acceptance via API
      try {
        const token = await this.getToken();
        if (token) {
          await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        }
      } catch { /* non-critical */ }

      status.className = 'form-status success';
      status.textContent = 'Account created! Check your email to verify, then log in.';
    } catch (err) {
      status.className = 'form-status error';
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        status.textContent = 'An account with this email already exists. Try logging in instead.';
      } else if (msg.includes('password')) {
        status.textContent = 'Password must be at least 6 characters.';
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        status.textContent = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (msg.includes('valid email')) {
        status.textContent = 'Please enter a valid email address.';
      } else {
        status.textContent = 'Failed to create account. Please try again.';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  },

  /**
   * Called when user logs in
   */
  _onLoggedIn(user) {
    console.log('👤 Logged in as:', user.email);
    const authBtn = document.getElementById('open-auth');
    if (authBtn) authBtn.style.display = 'none';
    this._renderUserMenu(user);
  },

  /**
   * Called when user logs out
   */
  _onLoggedOut() {
    console.log('👋 Logged out');
    const authBtn = document.getElementById('open-auth');
    if (authBtn) authBtn.style.display = '';
    document.getElementById('user-menu')?.remove();
  },

  /**
   * Render the logged-in user menu in the header (avatar + dropdown)
   */
  _renderUserMenu(user) {
    document.getElementById('user-menu')?.remove();

    const name = user.user_metadata?.full_name || user.email || 'Student';
    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

    const nav = document.getElementById('main-nav');
    if (!nav) return;

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
        <a href="/dashboard.html">Dashboard</a>
        <button type="button" id="user-menu-logout">Log Out</button>
      </div>
    `;
    nav.appendChild(menu);

    const trigger = menu.querySelector('#user-menu-trigger');
    const dropdown = menu.querySelector('#user-menu-dropdown');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    menu.querySelector('#user-menu-logout').addEventListener('click', () => this.logout());
  }
};

// Make globally accessible
window.Auth = Auth;
