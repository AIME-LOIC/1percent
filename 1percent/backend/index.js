/* ============================================================
   Express App Setup
   ============================================================
   Configures the Express application with all middleware
   and routes. Does NOT start the server — that's server.js.
   ============================================================ */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

// Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { quizRoutes, quizAdminRoutes } = require('./routes/quizRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const streakRoutes = require('./routes/streakRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const premiumRoutes = require('./routes/premiumRoutes');
const coinsRoutes = require('./routes/coinsRoutes');
const labRoutes = require('./routes/labRoutes');
const docsRoutes = require('./routes/docsRoutes');
const signatureRoutes = require('./routes/signatureRoutes');
const fileRoutes = require('./routes/fileRoutes');
const challengesRoutes = require('./routes/challengesRoutes');
const parentPaymentRoutes = require('./routes/parentPaymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { adminNotificationRoutes } = require('./routes/notificationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const { adminRatingRoutes } = require('./routes/ratingRoutes');
const logRoutes = require('./routes/logRoutes');
const { adminLogRoutes } = require('./routes/logRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');

// Middlewares
const { requestLogger } = require('./middlewares/requestLogger');
const logService = require('./services/logService');

const app = express();

/* ============================================================
   SECURITY MIDDLEWARE
   ============================================================ */

// Helmet — sets security headers
const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : '';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", supabaseHost].filter(Boolean),
      frameSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

// Compression
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

// Disable x-powered-by
app.disable('x-powered-by');

// Request logging — assigns a request id and captures 5xx responses
app.use(requestLogger);

/* ============================================================
   SUBDOMAIN DETECTION — learn.1percent.rw serves learn at /
   Must run BEFORE static files so we can intercept root requests.
   ============================================================ */
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host === 'learn.1percent.rw' || host === 'www.learn.1percent.rw') {
    req.isLearnSubdomain = true;
    // Rewrite /learn/* paths to /* for the learn subdomain
    if (req.path.startsWith('/learn/')) {
      req.url = req.url.replace('/learn/', '/');
    } else if (req.path === '/learn') {
      req.url = '/';
    }
  }
  next();
});

/* ============================================================
   SITEMAP — dynamic, served from the domain root
   (mounted before static files so it always wins)
   ============================================================ */
app.use('/', sitemapRoutes);

/* ============================================================
   STATIC FILES — Frontend
   ============================================================ */
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir, {
  etag: true,
  lastModified: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, filePath) => {
    // HTML must always be revalidated so deploys reach users immediately;
    // hashed/immutable assets can still be cached by their own headers.
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
  index: false  // We handle index.html manually for subdomain support
}));

/* Send HTML that's always revalidated — deploys reach users immediately */
function sendHtml(res, ...segments) {
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(path.join(frontendDir, ...segments));
}

/* Handle root path — learn subdomain gets learn/index.html, main site gets index.html */
app.get('/', (req, res) => {
  if (req.isLearnSubdomain) {
    return sendHtml(res, 'learn', 'index.html');
  }
  sendHtml(res, 'index.html');
});

/* ============================================================
   API ROUTES
   ============================================================ */

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Diagnostics — check which tables exist
const { adminClient: diagClient } = require('./config/database');
app.get('/api/admin/diagnostics', async (req, res) => {
  const tables = ['profiles', 'courses', 'lessons', 'enrollments', 'quizzes', 'challenges', 'notifications', 'ratings', 'parent_payments', 'premium_subscriptions', 'streaks', 'user_coins', 'error_logs', 'system_logs', 'admin_alerts'];
  const results = {};
  for (const t of tables) {
    try {
      const { count, error } = await diagClient.from(t).select('*', { count: 'exact', head: true });
      results[t] = error ? { exists: false, error: error.message } : { exists: true, count: count || 0 };
    } catch (e) {
      results[t] = { exists: false, error: e.message };
    }
  }
  res.json({ success: true, tables: results });
});

// Config — serve public env vars to the frontend (MUST be before /api/:slug)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    contactEmail: process.env.CONTACT_EMAIL || '1percentrwanda@gmail.com',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount route groups (config route above prevents /api/:slug from catching it)
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin/quizzes', quizAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/sign', signatureRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/parent-payments', parentPaymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin/ratings', adminRatingRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin/logs', adminLogRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api', courseRoutes);  // /api/roadmap, /api/courses (has /:slug)

/* ============================================================
   SPA ROUTES — serve specific HTML files for app pages
   ============================================================ */
const htmlRoutes = {
  '/learn': 'learn/index.html',
  '/learn/dashboard': 'dashboard.html',
  '/learn/playground': 'playground.html',
  '/learn/lab': 'lab.html',
  '/learn/admin': 'admin.html',
  '/learn/admin/': 'admin.html',
  '/learn/payment': 'payment.html',
  '/learn/payment-details': 'payment-details.html',
  '/learn/parent-payment': 'parent-payment.html',
  '/learn/sign': 'sign.html',
  '/learn/certificate': 'certificate-view.html',
  '/admin': 'admin.html',
  '/admin/': 'admin.html',
  '/docs': 'docs.html',
  '/install': 'install.html',
  '/settings': 'settings.html',
  '/terms': 'terms.html',
  '/privacy': 'privacy.html',
  '/contact': 'contact.html',
  '/onboarding': 'onboarding.html',
};

// Learn subdomain routes — same pages, no /learn prefix
const learnSubdomainRoutes = {
  '/': 'learn/index.html',
  '/dashboard': 'dashboard.html',
  '/playground': 'playground.html',
  '/lab': 'lab.html',
  '/admin': 'admin.html',
  '/admin/': 'admin.html',
  '/payment': 'payment.html',
  '/payment-details': 'payment-details.html',
  '/sign': 'sign.html',
  '/certificate': 'certificate-view.html',
  '/course': 'course.html',
  '/install': 'install.html',
  '/docs': 'docs.html',
  '/parent-payment': 'parent-payment.html',
  '/settings': 'settings.html',
  '/terms': 'terms.html',
  '/privacy': 'privacy.html',
  '/contact': 'contact.html',
  '/onboarding': 'onboarding.html',
};

app.get('*', (req, res) => {
  if (!req.accepts('html') || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  const routes = req.isLearnSubdomain ? learnSubdomainRoutes : htmlRoutes;

  // Check for exact route match
  if (routes[req.path]) {
    return sendHtml(res, routes[req.path]);
  }

  // Course detail page: /learn/course/:slug (or /course/:slug on subdomain)
  if (req.path.startsWith('/learn/course/') || (req.isLearnSubdomain && req.path.startsWith('/course/'))) {
    return sendHtml(res, 'course.html');
  }

  // Parent payment page: /parent-payment/:token (or /learn/parent-payment/:token)
  if (req.path.startsWith('/learn/parent-payment/') || (req.isLearnSubdomain && req.path.startsWith('/parent-payment/'))) {
    return sendHtml(res, 'parent-payment.html');
  }

  // Legacy redirects — old paths redirect to new /learn/* paths (main site only)
  if (!req.isLearnSubdomain) {
    if (req.path === '/dashboard') return res.redirect(301, '/learn/dashboard');
    if (req.path === '/playground') return res.redirect(301, '/learn/playground');
    if (req.path === '/lab') return res.redirect(301, '/learn/lab');
    if (req.path.startsWith('/course/')) return res.redirect(301, '/learn' + req.path);
    if (req.path === '/settings') return sendHtml(res, 'settings.html');
    if (req.path === '/terms') return sendHtml(res, 'terms.html');
    if (req.path === '/privacy') return sendHtml(res, 'privacy.html');
    if (req.path === '/onboarding') return sendHtml(res, 'onboarding.html');
  }

  // 401 for unauthorized API attempts
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource.' });
  }

  // 404 for everything else
  res.status(404).sendFile(path.join(frontendDir, '404.html'));
});

/* ============================================================
   HTTPS ENFORCEMENT (production only)
   ============================================================ */
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && !req.path.startsWith('/api/health')) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

/* ============================================================
   ERROR HANDLING — generic messages only, no stack traces
   ============================================================ */
app.use((err, req, res, _next) => {
  // Log full error server-side only
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // CORS / known business errors get a specific status, not a 500.
  const isCors = err.message === 'Not allowed by CORS';
  const isNotEnrolled = err.message === 'Not enrolled in this course';

  if (!isCors && !isNotEnrolled) {
    // Persist to error_logs + raise an admin alert (fire and forget).
    res.locals.errorLogged = true;
    logService.logRequestError(req, err, {
      level: 'error',
      statusCode: 500,
      path: req.path
    }).catch(() => {});
  }

  if (isCors) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (isNotEnrolled) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Never expose internals to the client
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
