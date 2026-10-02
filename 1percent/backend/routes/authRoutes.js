/**
 * routes/authRoutes.js
 *
 * PURPOSE:
 *   Auth routes: signup, login, logout, session refresh, password reset. Behind authLimiter.
 *
 * ENDPOINTS:
 *   POST /signup
 *   POST /login
 *   POST /logout
 *   POST /refresh
 *   POST /reset-password
 *   POST /magic-link
 *   POST /resend-confirmation
 *   GET /callback
 *   GET /me
 *   PUT /profile
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { requireFields, validateEmail, sanitizeStrings } = require('../middlewares/validate');
const { authRateLimit } = require('../middlewares/rateLimit');
const { adminClient } = require('../config/database');

const router = Router();

// Public routes
router.post('/signup',
  authRateLimit,
  sanitizeStrings(200),
  requireFields('email', 'password'),
  validateEmail,
  (req, res, next) => authController.signup(req, res, next)
);

router.post('/login',
  authRateLimit,
  requireFields('email', 'password'),
  validateEmail,
  (req, res, next) => authController.login(req, res, next)
);

router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

// Refresh tokens are bearer credentials — brute-forcing them must be as
// expensive as brute-forcing passwords.
router.post('/refresh',
  authRateLimit,
  (req, res, next) => authController.refresh(req, res, next)
);

router.post('/reset-password',
  authRateLimit,
  sanitizeStrings(200),
  requireFields('email'),
  validateEmail,
  (req, res, next) => authController.resetPassword(req, res, next)
);

// Passwordless sign-in (magic link) + confirmation email resend
router.post('/magic-link',
  authRateLimit,
  sanitizeStrings(200),
  requireFields('email'),
  validateEmail,
  (req, res, next) => authController.sendMagicLink(req, res, next)
);

router.post('/resend-confirmation',
  authRateLimit,
  sanitizeStrings(200),
  requireFields('email'),
  validateEmail,
  (req, res, next) => authController.resendConfirmation(req, res, next)
);

// Email-link landing page (confirmation + magic link) — browser-only
router.get('/callback', (req, res, next) => authController.oauthCallback(req, res, next));

// Protected routes
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

router.put('/profile',
  authenticate,
  sanitizeStrings(200),
  (req, res, next) => authController.updateProfile(req, res, next)
);

/* ── GitHub identity link (project system) ─────────────────────
 * Links the student's PUBLIC GitHub username to their profile so webhook
 * deliveries (commits, PRs, reviews) are attributed to them. We verify the
 * username against GitHub's public API before storing; only the public
 * identity (login, name, avatar URL) is kept — no tokens, no scopes.
 */
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

async function fetchGithubUser(username) {
  const login = encodeURIComponent(username);
  try {
    const res = await fetch(`https://api.github.com/users/${login}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': '1percent-projects' }
    });
    if (res.status === 404) return null;
    if (res.ok) {
      const u = await res.json();
      return { login: u.login, name: u.name || '', avatar_url: u.avatar_url || '', html_url: u.html_url || '' };
    }
    // 403/429 = unauthenticated API rate limit (60/hr per server IP, shared
    // across ALL Render users of this endpoint). Fall through to the avatar
    // check instead of failing the link — it verifies the account exists
    // without touching the rate-limited API.
  } catch (_) { /* network hiccup — try the avatar fallback below */ }

  // Fallback: the avatar endpoint is CDN-backed and NOT API-rate-limited.
  // 200 = user exists, 404 = no such user.
  try {
    const avatar = await fetch(`https://github.com/${login}.png?size=200`, { method: 'HEAD' });
    if (avatar.status === 404) return null;
    if (avatar.ok) {
      return {
        login: username,
        name: '',
        avatar_url: `https://github.com/${login}.png`,
        html_url: `https://github.com/${login}`,
        verified_via: 'avatar'
      };
    }
  } catch (_) { /* fall through */ }
  throw new Error('GitHub is not reachable right now — please try again in a minute.');
}

router.get('/github-link', authenticate, async (req, res) => {
  try {
    const { data } = await adminClient
      .from('profiles').select('github_username').eq('id', req.user.id).maybeSingle();
    res.json({ success: true, github_username: data?.github_username || null });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'GITHUB_LINK_FAILED', message: 'Failed to read GitHub link.' } });
  }
});

router.post('/github-link',
  authenticate,
  sanitizeStrings(100),
  async (req, res) => {
    try {
      const raw = String(req.body?.username ?? '').trim().replace(/^@/, '');

      // Empty username = disconnect
      if (!raw) {
        await adminClient.from('profiles').update({ github_username: null }).eq('id', req.user.id);
        return res.json({ success: true, github_username: null });
      }

      if (!GITHUB_USERNAME_RE.test(raw)) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'That does not look like a GitHub username.' } });
      }

      const github = await fetchGithubUser(raw);
      if (!github) {
        return res.status(422).json({ success: false, error: { code: 'GITHUB_USER_NOT_FOUND', message: 'No GitHub user with that username.' } });
      }

      // Claim the username for this profile (unique index blocks collisions).
      const { error } = await adminClient
        .from('profiles').update({ github_username: github.login }).eq('id', req.user.id);
      if (error) {
        const taken = error.code === '23505' || /unique/i.test(error.message || '');
        return res.status(taken ? 409 : 500).json({
          success: false,
          error: { code: taken ? 'GITHUB_USERNAME_TAKEN' : 'GITHUB_LINK_FAILED', message: taken ? 'That GitHub account is already linked to another profile.' : 'Failed to link GitHub.' }
        });
      }

      res.json({ success: true, github_username: github.login, github });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'GITHUB_LINK_FAILED', message: err.message || 'Failed to link GitHub.' } });
    }
  }
);

module.exports = router;
