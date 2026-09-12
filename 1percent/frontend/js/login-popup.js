/* ============================================================
   Login Popup (window.LoginPopup)
   ============================================================
   A reusable modal that asks visitors to log in (or sign up)
   before using gated pages — currently the Code Lab (/lab) and
   the Challenges Playground (/playground).

   Usage:
     1. Include <script src="/js/login-popup.js"></script> on the page.
     2. Call LoginPopup.show() — e.g. when the visitor is not
        logged in.
     3. LoginPopup.isLoggedIn() reflects the latest known state.

   The popup is a HARD GATE: there is no close button, and clicking
   the overlay or pressing Escape does NOT dismiss it. Visitors must
   log in, sign up, or leave via "Back to homepage".

   On successful login the session is stored in localStorage
   (same keys the rest of the app uses) and location.reload()
   is called so the page re-initializes as a logged-in user.
   ============================================================ */

(function () {
  'use strict';

  let supabaseClient = null;
  let loggedIn = null; // null = unknown, true/false = resolved

  const el = (id) => document.getElementById(id);

  /* ── Build the DOM once ─────────────────────────────── */
  function ensureDom() {
    if (el('login-popup-overlay')) return;

    const style = document.createElement('style');
    style.textContent = `
      #login-popup-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(5,5,10,0.75);backdrop-filter:blur(4px);}
      #login-popup-overlay.show{display:flex;}
      .login-popup{background:#181825;border:1px solid #313244;border-radius:14px;width:min(400px,92vw);max-height:92vh;overflow-y:auto;padding:28px 26px;box-shadow:0 20px 60px rgba(0,0,0,0.55);color:#cdd6f4;font-family:Inter,sans-serif;position:relative;}
      .login-popup .lp-icon{width:56px;height:56px;border-radius:14px;background:rgba(166,227,161,0.12);border:1px solid rgba(166,227,161,0.25);display:flex;align-items:center;justify-content:center;color:#a6e3a1;margin:0 auto 14px;}
      .login-popup h3{font-size:19px;font-weight:800;text-align:center;margin-bottom:6px;color:#cdd6f4;}
      .login-popup .lp-sub{font-size:13px;color:#a6adc8;text-align:center;line-height:1.55;margin-bottom:18px;}
      .login-popup label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#a6adc8;margin:12px 0 5px;}
      .login-popup input{width:100%;padding:10px 12px;background:#11111b;border:1px solid #313244;border-radius:8px;color:#cdd6f4;font-size:13px;outline:none;}
      .login-popup input:focus{border-color:#a6e3a1;}
      .login-popup .lp-btn{width:100%;padding:11px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;background:#a6e3a1;color:#1e1e2e;margin-top:16px;transition:background .15s;}
      .login-popup .lp-btn:hover{background:#94e2a5;}
      .login-popup .lp-btn:disabled{opacity:.6;cursor:not-allowed;}
      .login-popup .lp-status{font-size:12px;margin-top:10px;min-height:16px;text-align:center;}
      .login-popup .lp-status.error{color:#f38ba8;}
      .login-popup .lp-status.success{color:#a6e3a1;}
      .login-popup .lp-swap{text-align:center;font-size:12px;color:#a6adc8;margin-top:14px;}
      .login-popup .lp-swap a{color:#a6e3a1;text-decoration:none;font-weight:600;cursor:pointer;}
      .login-popup .lp-swap a:hover{text-decoration:underline;}
      .login-popup .lp-home{text-align:center;margin-top:14px;}
      .login-popup .lp-home a{font-size:12px;color:#585b74;text-decoration:none;}
      .login-popup .lp-home a:hover{color:#a6adc8;}
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'login-popup-overlay';
    overlay.innerHTML = `
      <div class="login-popup" role="dialog" aria-modal="true" aria-label="Login required">
        <div class="lp-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 id="lp-title">Login to continue</h3>
        <p class="lp-sub" id="lp-subtitle">Create a free account or log in to use the Code Lab — run code, save your files and track your progress.</p>

        <!-- LOGIN FORM -->
        <form id="lp-login-form">
          <label for="lp-login-email">Email</label>
          <input type="email" id="lp-login-email" placeholder="you@example.com" autocomplete="email" required>
          <label for="lp-login-password">Password</label>
          <input type="password" id="lp-login-password" placeholder="Your password" autocomplete="current-password" required>
          <div class="checkbox-row" style="justify-content:space-between;display:flex;">
            <span><input type="checkbox" id="lp-remember" style="width:auto;"><label for="lp-remember" style="display:inline;text-transform:none;letter-spacing:0;">Remember me</label></span>
            <a href="#" id="lp-forgot" style="font-size:12px;color:#89b4fa;text-decoration:none;">Forgot password?</a>
          </div>
          <button type="submit" class="lp-btn" id="lp-login-btn">Log In</button>
          <div class="lp-status" id="lp-status"></div>
          <div class="lp-swap">New here? <a id="lp-to-signup">Create a free account</a></div>
        </form>

        <!-- SIGNUP FORM -->
        <form id="lp-signup-form" style="display:none;">
          <label for="lp-signup-name">Full Name</label>
          <input type="text" id="lp-signup-name" placeholder="Your name" autocomplete="name" required>
          <label for="lp-signup-email">Email</label>
          <input type="email" id="lp-signup-email" placeholder="you@example.com" autocomplete="email" required>
          <label for="lp-signup-password">Password</label>
          <input type="password" id="lp-signup-password" placeholder="Min 6 characters" autocomplete="new-password" minlength="6" required>
          <button type="submit" class="lp-btn" id="lp-signup-btn">Create Account</button>
          <div class="lp-status" id="lp-signup-status"></div>
          <div class="lp-swap">Already have an account? <a id="lp-to-login">Log in</a></div>
        </form>

        <!-- RESET FORM -->
        <form id="lp-reset-form" style="display:none;">
          <p style="font-size:13px;color:#a6adc8;line-height:1.55;">Enter your account email and we'll send you a password reset link.</p>
          <label for="lp-reset-email">Email</label>
          <input type="email" id="lp-reset-email" placeholder="you@example.com" autocomplete="email" required>
          <button type="submit" class="lp-btn" id="lp-reset-btn">Send Reset Link</button>
          <div class="lp-status" id="lp-reset-status"></div>
          <div class="lp-swap"><a id="lp-back-login">Back to login</a></div>
        </form>

        <div class="lp-home"><a href="/">← Back to homepage</a></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Hard gate — intentionally NO close button, NO overlay-click dismiss,
    // and NO Escape dismiss. The only exits are logging in (which reloads
    // the page) or the "Back to homepage" link.

    // Tab switching
    el('lp-to-signup').addEventListener('click', () => switchForm('signup'));
    el('lp-to-login').addEventListener('click', () => switchForm('login'));
    el('lp-back-login').addEventListener('click', () => switchForm('login'));
    el('lp-forgot').addEventListener('click', (e) => { e.preventDefault(); switchForm('reset'); });

    // Login submit
    el('lp-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = el('lp-login-btn');
      const status = el('lp-status');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      status.className = 'lp-status';
      status.textContent = '';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: el('lp-login-email').value.trim(),
            password: el('lp-login-password').value
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Login failed');
        await persistSession(json.session);
        loggedIn = true;
        status.className = 'lp-status success';
        status.textContent = '✓ Logged in! Reloading...';
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        status.className = 'lp-status error';
        status.textContent = err.message || 'Login failed. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Log In';
      }
    });

    // Signup submit — creates the account then logs straight in
    el('lp-signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = el('lp-signup-btn');
      const status = el('lp-signup-status');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      status.className = 'lp-status';
      status.textContent = '';
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: el('lp-signup-name').value.trim(),
            email: el('lp-signup-email').value.trim(),
            password: el('lp-signup-password').value
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Signup failed');

        // Auto-login after successful signup
        status.className = 'lp-status success';
        status.textContent = '✓ Account created! Logging you in...';
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: el('lp-signup-email').value.trim(), password: el('lp-signup-password').value })
        });
        const loginJson = await loginRes.json();
        if (!loginRes.ok || !loginJson.success) throw new Error('Account created — please log in.');
        await persistSession(loginJson.session);
        loggedIn = true;
        status.textContent = '✓ Welcome! Reloading...';
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        status.className = 'lp-status error';
        status.textContent = err.message || 'Signup failed. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });

    // Reset submit
    el('lp-reset-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = el('lp-reset-btn');
      const status = el('lp-reset-status');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      status.className = 'lp-status';
      status.textContent = '';
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: el('lp-reset-email').value.trim() })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to send reset email.');
        status.className = 'lp-status success';
        status.textContent = "✓ If that email exists, a reset link is on its way.";
      } catch (err) {
        status.className = 'lp-status error';
        status.textContent = err.message || 'Failed to send reset email.';
      }
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    });
  }

  function switchForm(which) {
    el('lp-login-form').style.display = which === 'login' ? '' : 'none';
    el('lp-signup-form').style.display = which === 'signup' ? '' : 'none';
    el('lp-reset-form').style.display = which === 'reset' ? '' : 'none';
    const status = el('lp-status');
    status.className = 'lp-status';
    status.textContent = '';
    const first = which === 'login' ? el('lp-login-email')
      : which === 'signup' ? el('lp-signup-name')
      : el('lp-reset-email');
    if (first) first.focus();
  }

  /** Store tokens the same way Auth.login does (supabase-js + legacy keys). */
  async function persistSession(session) {
    if (!session) return;
    if (!supabaseClient) {
      try {
        const cfgRes = await fetch('/api/config');
        const cfg = await cfgRes.json();
        if (cfg.supabaseUrl && cfg.supabaseAnonKey && typeof supabase !== 'undefined') {
          supabaseClient = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
          });
        }
      } catch {}
    }
    if (supabaseClient) {
      try {
        await supabaseClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
      } catch {}
    }
    // Legacy keys read by other parts of the app
    try {
      sessionStorage.setItem('sb-access-token', session.access_token);
      sessionStorage.setItem('sb-refresh-token', session.refresh_token);
      localStorage.setItem('sb-access-token', session.access_token);
      localStorage.setItem('sb-refresh-token', session.refresh_token);
    } catch {}
  }

  /* ── Public API ─────────────────────────────────────── */

  /** Show the popup. `context` = 'lab' | 'playground' customizes the copy. */
  function show(context) {
    ensureDom();
    const title = el('lp-title');
    const sub = el('lp-subtitle');
    if (context === 'playground') {
      title.textContent = 'Login to solve challenges';
      sub.textContent = 'Create a free account or log in to solve coding challenges, earn coins and climb the leaderboard.';
    } else if (context === 'lab') {
      title.textContent = 'Login to use the Lab';
      sub.textContent = 'Create a free account or log in to use the Code Lab — run code, save your files and track your progress.';
    } else {
      title.textContent = 'Login to continue';
      sub.textContent = 'Create a free account or log in to use this feature.';
    }
    switchForm('login');
    el('login-popup-overlay').classList.add('show');
    setTimeout(() => el('lp-login-email').focus(), 50);
  }

  function hide() {
    const o = el('login-popup-overlay');
    if (o) o.classList.remove('show');
  }

  /** True once the page's own auth init has resolved the session state. */
  function isLoggedIn() { return loggedIn === true; }
  /** Mark the popup's knowledge of the session (called by pages after their own auth init). */
  function setLoggedIn(v) { loggedIn = !!v; }
  /** True until the page's auth init has resolved. */
  function isResolved() { return loggedIn !== null; }

  window.LoginPopup = { show, hide, isLoggedIn, isResolved, setLoggedIn };
})();
