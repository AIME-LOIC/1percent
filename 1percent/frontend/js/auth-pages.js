/* ============================================================
   Auth Pages logic — /signin and /signup
   ============================================================
   The form handlers here were MOVED AS-IS from the homepage's
   auth-modal (frontend/index.html). No auth logic, API calls,
   validation rules, field names, or session handling changed:
   - Same /api/auth/login, /api/auth/signup, /api/auth/magic-link,
     /api/auth/reset-password payloads.
   - Same token persistence (supabase-js setSession + legacy
     sb-access-token / sb-refresh-token keys).
   - Same redirect-after-login chain: role check from the login
     response -> admin > onboarding > dashboard, with learn/main
     host prefix handling. Plus ?next= return support (used by
     the gated lab/playground/robotics pages) and the MCP consent
     return (sessionStorage 'mcpConsentReturn').
   ============================================================ */

const AuthPages = {
  mode: 'login', // 'login' | 'signup' — set by the page

  async init(mode) {
    this.mode = mode;

    // Auth-aware redirect: if a live session already exists, send the
    // visitor straight to the dashboard (same check the homepage's
    // openAuthOrDashboard used).
    if (await this._hasLiveSession()) {
      window.location.href = await this.postLoginTarget(null);
      return;
    }

    // Homepage behaviour: drop orphaned sessions left by confirm-email
    // flows so signup/login start from a clean slate.
    if (typeof OPSession !== 'undefined') {
      try {
        const client = await OPSession.getClient();
        if (client) {
          const { data: { session } } = await client.auth.getSession();
          if (!session?.user) {
            ['sb-access-token', 'sb-refresh-token'].forEach(k => {
              localStorage.removeItem(k);
              sessionStorage.removeItem(k);
            });
          }
        }
      } catch { /* ignore */ }
    }

    // Prefill login email (signup "already registered" handoff)
    if (mode === 'login') {
      const email = new URLSearchParams(location.search).get('email');
      const input = document.getElementById('login-email');
      if (email && input && !input.value) input.value = email;
    }

    // Back link — on the main site, the homepage lives at /learn.
    // Cross-links need no rewriting: /signin and /signup are served on
    // both hosts (server route map).
    const back = document.querySelector('.auth-back');
    if (back && typeof AuthHelpers !== 'undefined') back.href = AuthHelpers.isLearn() ? '/' : '/learn';

    this._bindEvents(mode);
    AuthLayout.enhanceForm(document.querySelector('#auth-form-slot form'));
  },

  /* ── Session helpers (same checks as the homepage) ── */

  async _hasLiveSession() {
    // Source of truth: Supabase client session.
    if (typeof OPSession !== 'undefined') {
      try {
        const user = await OPSession.getUser();
        if (user) { this._user = user; return true; }
      } catch { /* ignore */ }
    }
    // Raw fallback ONLY when Supabase itself is unavailable — stale
    // tokens must not count, so validate the JWT expiry claim.
    if (!this._supabaseConfigured()) {
      return this._peekStoredSession();
    }
    return false;
  },

  _supabaseConfigured() {
    // Session.js memoizes _clientPromise only on success; treat an
    // absent window client as "configured" when OPSession exists at all.
    return typeof OPSession !== 'undefined';
  },

  _tokenIsAlive(token) {
    try {
      const payload = JSON.parse(atob((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/')));
      return payload?.exp ? payload.exp * 1000 > Date.now() + 30000 : true;
    } catch { return true; }
  },

  _peekStoredSession() {
    try {
      // supabase-js v2 persists the session under "sb-<project-ref>-auth-token"
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!/^sb-.+-auth-token$/.test(key || '')) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        const tok = parsed?.access_token || parsed?.currentSession?.access_token;
        if (tok && this._tokenIsAlive(tok)) return true;
      }
      // Legacy keys written by some of the app's own login flows
      const legacy = localStorage.getItem('sb-access-token');
      if (legacy && this._tokenIsAlive(legacy)) return true;
    } catch { }
    return false;
  },

  /** Redirect-after-login chain (admin > onboarding > dashboard). */
  async postLoginTarget(loginUser) {
    const user = loginUser || this._user || await this._meUser();
    const role = user?.role;
    if (role === 'admin') return AuthHelpers.appPath('/admin');
    if (user && !(user.user_metadata && user.user_metadata.onboarding_completed === true)) {
      return AuthHelpers.appPath('/onboarding');
    }
    // ?next= return target or MCP consent return (gated lab/playground/robotics pages)
    const next = this._safeNext();
    if (next) return next;
    return AuthHelpers.appPath('/dashboard');
  },

  async _meUser() {
    try {
      const token = typeof OPSession !== 'undefined' ? await OPSession.getToken() : null;
      if (!token) return null;
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      return json.success ? json.user : null;
    } catch { return null; }
  },

  /**
   * Return target for redirect-back flows, in priority order:
   * 1. MCP consent return (sessionStorage 'mcpConsentReturn') — the
   *    consent page parks its URL here; resume the flow after login.
   * 2. ?next= query param — used by the gated lab/playground pages.
   * Only same-origin relative paths are accepted; anything else is
   * ignored. The stored value is always consumed once.
   */
  _safeNext() {
    let next = null;
    try {
      next = sessionStorage.getItem('mcpConsentReturn')
        || new URLSearchParams(location.search).get('next')
        || null;
      sessionStorage.removeItem('mcpConsentReturn');
    } catch { next = null; }
    if (!next) return null;
    if (typeof next !== 'string') next = String(next);
    const ok = next.startsWith('/') && !next.startsWith('//') && !next.includes('://');
    return ok ? next : null;
  },

  /* ── Event binding ── */

  _bindEvents(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (mode === 'login' && loginForm) loginForm.addEventListener('submit', (e) => this._handleLogin(e));
    if (mode === 'signup' && signupForm) signupForm.addEventListener('submit', (e) => this._handleSignup(e));

    if (mode === 'login') {
      // Forgot password
      document.getElementById('forgot-password-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await this._handleForgotPassword();
      });
      // Magic link view toggle
      const loginView = document.getElementById('login-view');
      const magicForm = document.getElementById('magic-form');
      document.getElementById('magic-link-open')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginView && magicForm) {
          loginView.style.display = 'none';
          magicForm.style.display = '';
          document.getElementById('magic-email')?.focus();
        }
      });
      document.getElementById('magic-back')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginView && magicForm) {
          magicForm.style.display = 'none';
          loginView.style.display = '';
        }
      });
      magicForm?.addEventListener('submit', (e) => this._handleMagicLink(e));
    }
  },

  /** Button loading state: spinner + disabled. */
  _setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.loading = loading ? 'true' : 'false';
    btn.setAttribute('aria-busy', loading ? 'true' : 'false');
  },

  /* ── MOVED AS-IS from the homepage auth modal ── */

  // Login
  async _handleLogin(e) {
    e.preventDefault();
    AuthLayout.hideAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    this._setLoading(btn, true);

    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const json = await res.json();
      if (json.success) {
        // Store session in Supabase client (persists to localStorage)
        if (typeof supabase !== 'undefined' && json.session && typeof OPSession !== 'undefined') {
          const client = await OPSession.getClient();
          if (client) {
            await client.auth.setSession({
              access_token: json.session.access_token,
              refresh_token: json.session.refresh_token
            });
            ['sb-access-token', 'sb-refresh-token'].forEach((key, index) => {
              const value = index === 0 ? json.session.access_token : json.session.refresh_token;
              if (value) {
                sessionStorage.setItem(key, value);
                localStorage.setItem(key, value);
              }
            });
          }
        }
        // Detect role from login response (fast, no extra API call)
        const isAdmin = json.user?.role === 'admin';
        const needsOnboarding = !isAdmin && !(json.user?.user_metadata && json.user.user_metadata.onboarding_completed === true);
        // Redirect order: consent/next return > admin > onboarding > dashboard
        const redirectTo = this._safeNext() || (await this.postLoginTarget(json.user));
        AuthLayout.showAlert('success', 'Login successful! Redirecting...');
        // Small delay to ensure localStorage write completes
        await new Promise(r => setTimeout(r, 300));
        window.location.href = redirectTo;
      } else {
        AuthLayout.showAlert('error', json.error || 'Login failed');
      }
    } catch {
      AuthLayout.showAlert('error', 'Network error. Please try again.');
    } finally {
      this._setLoading(btn, false);
    }
  },

  // Signup
  async _handleSignup(e) {
    e.preventDefault();
    AuthLayout.hideAlert();
    const form = e.target;
    if (form.dataset.submitting === '1') return; // double-click guard
    form.dataset.submitting = '1';
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn = form.querySelector('button[type="submit"]');

    this._setLoading(btn, true);

    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, full_name: name }) });
      if (res.status === 429) {
        AuthLayout.showAlert('warning', 'Too many attempts — please wait a minute and try again.');
        return;
      }
      if (res.status === 504) {
        AuthLayout.showAlert('error', 'The signup service is temporarily unreachable. Please try again in a moment.');
        return;
      }
      const json = await res.json();
      if (json.success) {
        // Confirmed-email disabled → session returned, log straight in.
        if (json.session && typeof OPSession !== 'undefined') {
          const client = await OPSession.getClient();
          if (client) {
            await client.auth.setSession({ access_token: json.session.access_token, refresh_token: json.session.refresh_token });
            AuthLayout.showAlert('success', 'Account created! Redirecting to dashboard...');
            const _isLearn2 = location.hostname === 'learn.1percent.rw';
            setTimeout(() => { window.location.href = _isLearn2 ? '/dashboard' : '/learn/dashboard'; }, 800);
            return;
          }
        }
        AuthLayout.showAlert('success', 'Account created! Check your inbox — confirm your email, then log in.');
        setTimeout(() => {
          window.location.href = '/signin?email=' + encodeURIComponent(email);
        }, 2500);
      } else if (json.code === 'email_exists') {
        AuthLayout.showAlert('error', json.error || 'An account with this email already exists.');
        setTimeout(() => {
          window.location.href = '/signin?email=' + encodeURIComponent(email);
        }, 1500);
      } else {
        AuthLayout.showAlert('error', json.error || 'Signup failed. If you already have an account, log in instead.');
      }
    } catch {
      AuthLayout.showAlert('error', 'Network error. Please try again.');
    } finally {
      form.dataset.submitting = '0';
      this._setLoading(btn, false);
    }
  },

  // Magic-link login
  async _handleMagicLink(e) {
    e.preventDefault();
    AuthLayout.hideAlert();
    const btn = e.target.querySelector('button[type="submit"]');
    this._setLoading(btn, true);
    try {
      const res = await fetch('/api/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('magic-email').value.trim() }) });
      const json = await res.json();
      if (json.success) {
        AuthLayout.showAlert('success', '✓ Magic link sent! Check your inbox and click the link to log in.');
      } else {
        AuthLayout.showAlert('error', json.error || 'Failed to send magic link');
      }
    } catch {
      AuthLayout.showAlert('error', 'Network error. Please try again.');
    } finally {
      this._setLoading(btn, false);
    }
  },

  // Forgot password
  async _handleForgotPassword() {
    const emailInput = document.getElementById('login-email');
    const email = emailInput?.value.trim();

    if (!email) {
      AuthLayout.showAlert('warning', 'Enter your email first, then click "Forgot password?".');
      emailInput?.focus();
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not send reset email.');
      AuthLayout.showAlert('success', 'Password reset email sent. Check your inbox.');
    } catch (err) {
      AuthLayout.showAlert('error', err.message || 'Could not send reset email.');
    }
  }
};

window.AuthPages = AuthPages;
