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
const signatureRoutes = require('./routes/signatureRoutes');
const fileRoutes = require('./routes/fileRoutes');

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
  .map(o => o.trim());

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

/* ============================================================
   STATIC FILES — Frontend
   ============================================================ */
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  etag: true,
  lastModified: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  index: ['index.html']
}));

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
app.use('/api', courseRoutes);  // /api/roadmap, /api/courses (has /:slug)

/* ============================================================
   SPA ROUTES — serve specific HTML files for app pages
   ============================================================ */
const frontendDir = path.join(__dirname, '..', 'frontend');
const htmlRoutes = {
  '/learn': 'learn/index.html',
  '/learn/dashboard': 'dashboard.html',
  '/learn/playground': 'playground.html',
  '/learn/lab': 'lab.html',
  '/learn/admin': 'admin.html',
  '/learn/admin/': 'admin.html',
  '/learn/payment': 'payment.html',
  '/learn/sign': 'sign.html',
  '/learn/certificate': 'certificate-view.html',
  '/admin': 'admin.html',
  '/admin/': 'admin.html',
};

app.get('*', (req, res) => {
  if (!req.accepts('html') || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Check for exact route match
  if (htmlRoutes[req.path]) {
    return res.sendFile(path.join(frontendDir, htmlRoutes[req.path]));
  }

  // Course detail page: /learn/course/:slug
  if (req.path.startsWith('/learn/course/')) {
    return res.sendFile(path.join(frontendDir, 'course.html'));
  }

  // Legacy redirects — old paths redirect to new /learn/* paths
  if (req.path === '/dashboard') return res.redirect(301, '/learn/dashboard');
  if (req.path === '/playground') return res.redirect(301, '/learn/playground');
  if (req.path === '/lab') return res.redirect(301, '/learn/lab');
  if (req.path.startsWith('/course/')) return res.redirect(301, '/learn' + req.path);

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

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (err.message === 'Not enrolled in this course') {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Never expose internals to the client
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
