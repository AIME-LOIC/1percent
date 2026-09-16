/* ============================================================
   Auth Controller
   ============================================================
   Handles signup, login, logout, session refresh, and profile.
   ============================================================ */

const authService = require('../services/authService');

class AuthController {
  /**
   * POST /api/auth/signup
   * Creates the account and sends the confirmation email. The user MUST
   * click that link before logging in — no session is returned (unless
   * the project has "Confirm email" disabled, in which case Supabase
   * hands back a session and we pass it through).
   */
  async signup(req, res) {
    try {
      const { email, password, full_name } = req.body;

      // Server-side password policy — never rely on the client or the
      // Supabase default (6) alone. Short passwords fall to trivial
      // offline/credential-stuffing attacks.
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      }
      if (/^[\s]+$/.test(password) || /^(?:password|12345678|qwertyui|letmein123|1percent)/i.test(password)) {
        return res.status(400).json({ error: 'Please choose a stronger password.' });
      }

      const result = await authService.signup(email, password, {
        full_name,
        policy_version: '1.0'
      }, this._redirectBase(req));

      // Project has "Confirm email" disabled → Supabase returned a live
      // session. Log the user straight in instead of asking for a link.
      if (result.session) {
        return res.status(201).json({
          success: true,
          message: 'Account created! Logging you in...',
          user: result.user,
          session: result.session
        });
      }

      res.status(201).json({
        success: true,
        message: 'Account created! Check your inbox — confirm your email, then log in.',
        email_confirmation_required: true,
        email: result.user.email
      });
    } catch (err) {
      console.error('[AUTH] Signup error:', err.message);

      if (err.code === 'email_exists') {
        return res.status(409).json({
          error: 'An account with this email already exists. Please log in instead.',
          code: 'email_exists'
        });
      }
      if (err.message?.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      }
      if (err.message?.includes('password')) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      }

      res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful.',
        user: result.user,
        session: result.session
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err.message);

      if (err.code === 'email_not_confirmed') {
        return res.status(403).json({
          error: 'Please confirm your email first — check your inbox for the verification link.',
          code: 'email_not_confirmed',
          email: err.email
        });
      }
      if (err.message?.includes('Invalid login')) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }

  /**
   * POST /api/auth/magic-link
   * Passwordless sign-in: emails a one-tap login link. Creates the
   * account on first use (then the user still confirms their email).
   */
  async sendMagicLink(req, res) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      await authService.sendMagicLink(email, this._redirectBase(req));
      res.json({
        success: true,
        message: 'Magic link sent! Check your inbox and click the link to log in.'
      });
    } catch (err) {
      console.error('[AUTH] Magic link error:', err.message);
      if (err.message?.includes('rate')) {
        return res.status(429).json({ error: 'Too many emails requested. Please wait a minute and try again.' });
      }
      res.status(500).json({ error: 'Could not send the magic link. Please try again.' });
    }
  }

  /**
   * POST /api/auth/resend-confirmation
   * Re-send the signup verification email.
   */
  async resendConfirmation(req, res) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ error: 'Email required.' });
      await authService.resendConfirmationEmail(email, this._redirectBase(req));
      res.json({
        success: true,
        message: 'If that address needs confirming, a new verification email is on its way.'
      });
    } catch (err) {
      console.error('[AUTH] Resend confirmation error:', err.message);
      res.status(500).json({ error: 'Could not send the email. Please try again.' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      if (req.user?.id) {
        await authService.logout(req.user.id);
      }
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      console.error('[AUTH] Logout error:', err.message);
      // Still return success — client clears token regardless
      res.json({ success: true, message: 'Logged out.' });
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res) {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token required.' });
      }

      const result = await authService.refreshSession(refresh_token);
      res.json({ success: true, session: result.session });
    } catch (err) {
      console.error('[AUTH] Refresh error:', err.message);
      res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  }

  /**
   * GET /api/auth/callback
   * Landing page for Supabase auth emails (confirmation + magic link).
   * We request the IMPLICIT flow, so links carry tokens in the URL
   * fragment (#access_token=...&refresh_token=...). This page's inline
   * script consumes them client-side, persists the session exactly like
   * the app's own login flows, and continues to '?next=' (default
   * /dashboard). A ?code= query (PKCE-style link) is handled as a
   * graceful fallback message.
   */
  async oauthCallback(req, res) {
    try {
      const next = typeof req.query.next === 'string' && req.query.next.startsWith('/')
        ? req.query.next
        : '/dashboard';
      const isLearn = (req.headers.host || '').startsWith('learn.');
      const prefix = isLearn ? '' : '/learn';

      const safeNext = next.replace(/"/g, '');
      res.send(callbackPage(safeNext));
    } catch (err) {
      console.error('[AUTH] Callback error:', err.message);
      res.status(500).send(callbackPage('/'));
    }
  }

  /**
   * Auth host helpers
   */
  _redirectBase(req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'learn.1percent.rw';
    return `${proto}://${host}`;
  }

  /**
   * GET /api/auth/me
   * Session payload — includes tier/is_premium/subscription_status so the
   * client theme is driven by the backend session, never client-only flags.
   */
  async getMe(req, res) {
    try {
      // Fire-and-forget daily check-in: every authenticated /api/auth/me
      // call (dashboard, settings, nav…) counts the user as active today.
      // Idempotent per calendar day; never blocks or fails the request.
      try {
        require('../services/streakService').checkIn(req.user.id).catch(() => {});
      } catch { /* service unavailable — ignore */ }

      const profile = await authService.getProfile(req.user.id);
      res.json({ success: true, user: profile });
    } catch (err) {
      console.error('[AUTH] Get profile error:', err.message);
      res.status(500).json({ error: 'Failed to load profile.' });
    }
  }

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const { full_name, avatar_url, country } = req.body;
      const updates = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (country !== undefined) updates.country = country;
      // Note: role is NOT updatable here — only via admin endpoints

      const profile = await authService.updateProfile(req.user.id, updates);
      res.json({ success: true, user: profile });
    } catch (err) {
      console.error('[AUTH] Update profile error:', err.message);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
}

module.exports = new AuthController();

/* ============================================================
   Callback page template (confirmation + magic-link landings)
   Consumes the IMPLICIT-flow URL fragment (#access_token=...),
   persists the session via supabase-js + legacy keys, then
   redirects to `next`. Error state (#error=...) shows a friendly
   message with a link back to login.
   ============================================================ */
function callbackPage(next) {
  const safeNext = String(next || '/dashboard').replace(/"/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Signing you in — 1percent Rwanda</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f8f7;font-family:'Inter',sans-serif;color:#111827;padding:20px;}
  .card{max-width:420px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:36px 32px;text-align:center;box-shadow:0 8px 30px rgba(13,110,63,.08);}
  .logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0d6e3f,#0a5c34);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;margin:0 auto 16px;}
  h1{font-size:20px;font-weight:800;margin:0 0 8px;}
  p{font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 18px;}
  .btn{display:inline-block;padding:11px 28px;border-radius:10px;background:#0d6e3f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;}
  .spinner{width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#0d6e3f;border-radius:50%;animation:spin .8s linear infinite;margin:6px auto 0;}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
  <div class="card">
    <div class="logo">1%</div>
    <div id="cb-content"><h1>One moment…</h1><p>Signing you in.</p><div class="spinner"></div></div>
  </div>
<script>
(function () {
  var content = document.getElementById('cb-content');
  function fail(title, msg) {
    content.innerHTML = '<h1>' + title + '</h1><p>' + msg + '</p>' +
      '<a class="btn" href="/">Go to login</a>';
  }
  try {
    var hash = window.location.hash || '';
    var params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    if (params.get('error')) {
      fail('Link expired or already used', 'This email link is invalid or has already been used. Request a new one from the login page.');
      return;
    }
    var accessToken = params.get('access_token');
    var refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      fail('Link expired or already used', 'This email link is invalid or has already been used. Request a new one from the login page.');
      return;
    }
    var redirectTarget = ${JSON.stringify(safeNext)};
    (async function () {
      try {
        // 1. Persist via supabase-js (writes sb-<ref>-auth-token in the exact
        //    format every supabase-js page reads) ...
        var cfg = await fetch('/api/config').then(function (r) { return r.json(); });
        if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
          var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
          });
          await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
        // 2. ... plus the legacy keys some pages still read directly.
        localStorage.setItem('sb-access-token', accessToken);
        localStorage.setItem('sb-refresh-token', refreshToken);
        // Clean the fragment so tokens don't linger in history.
        history.replaceState(null, '', window.location.pathname + window.location.search);
        setTimeout(function () { window.location.href = redirectTarget; }, 400);
      } catch (e) {
        fail('Something went wrong', 'Please try the link again or log in normally.');
      }
    })();
  } catch (e) {
    fail('Something went wrong', 'Please try the link again or log in normally.');
  }
})();
</script>
</body>
</html>`;
}
