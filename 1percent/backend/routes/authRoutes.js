/* ============================================================
   Auth Routes
   ============================================================
   POST /api/auth/signup              — Register (sends confirmation email)
   POST /api/auth/login               — Log in (rejects unconfirmed emails)
   POST /api/auth/magic-link          — Passwordless login link by email
   POST /api/auth/resend-confirmation — Re-send the verification email
   POST /api/auth/logout              — Log out
   POST /api/auth/refresh             — Refresh session
   GET  /api/auth/callback            — Email-link landing (confirm + magic)
   GET  /api/auth/me                  — Get current user profile (auth required)   PUT  /api/auth/profile    — Update profile (auth required)
   ============================================================ */

const { Router } = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { requireFields, validateEmail, sanitizeStrings } = require('../middlewares/validate');
const { authRateLimit } = require('../middlewares/rateLimit');

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

module.exports = router;
