/* ============================================================
   Auth Routes
   ============================================================
   POST /api/auth/signup     — Register new account
   POST /api/auth/login      — Log in
   POST /api/auth/logout     — Log out
   POST /api/auth/refresh    — Refresh session
   GET  /api/auth/me         — Get current user profile (auth required)
   PUT  /api/auth/profile    — Update profile (auth required)
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

router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// Protected routes
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

router.put('/profile',
  authenticate,
  sanitizeStrings(200),
  (req, res, next) => authController.updateProfile(req, res, next)
);

module.exports = router;
