/* ============================================================
   Express App Setup — THE REQUEST LIFECYCLE MAP
   ============================================================
   Configures the Express application with all middleware
   and routes. Does NOT start the server — that's server.js.

   Every incoming request flows through this file top-to-bottom,
   in exactly this order:

     1. helmet          → security headers (CSP, etc.)
     2. cors            → origin allow-list
     3. compression     → gzip for text responses
     4. json/urlencoded → body parsing (5 MB cap)
     5. requestLogger   → request id + 5xx capture
     6. /learn rewrite  → subdomain/legacy path normalization
     7. sitemapRoutes   → /sitemap.xml, /courses, /course/:slug
                          (dynamic SEO pages, MUST be before static)
     8. template block  → 404s raw *-page.html templates
     9. static files    → frontend/ assets (HTML = no-cache)
    10. '/'             → homepage (host-aware)
    11. /api/*          → JSON APIs (auth, courses, premium, coins,
                          challenges, ai-reviews, …)
    12. /mcp/*          → student MCP (Claude connector)
    13. htmlRoutes map  → every HTML app page (host-aware)
    14. catch-all       → legacy 301s, then 404
     15. error handler  → last; logs + safe 500 JSON

   Keeping this order intact matters: an earlier mount shadows a
   later one (e.g. sitemapRoutes must precede static files or
   Google could get the raw unfilled template).
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
const aiReviewRoutes = require('./routes/aiReviewRoutes');
const logRoutes = require('./routes/logRoutes');
const { adminLogRoutes } = require('./routes/logRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const mcpRoutes = require('./routes/mcpRoutes');
const { studentMcpTokenRoutes, studentMcpRpcRoutes } = require('./routes/studentMcpRoutes');
const mcpOAuthRoutes = require('./routes/mcpOAuthRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const { adminTestimonialRoutes } = require('./routes/testimonialRoutes');
const { mentorRoutes, adminMentorRoutes } = require('./routes/mentorRoutes');

// Middlewares
const { requestLogger } = require('./middlewares/requestLogger');
const logService = require('./services/logService');

const app = express();

// Trust the reverse proxy (nginx/Render/Heroku style) for X-Forwarded-*.
// Without this, req.ip is the PROXY's IP: rate limiting would bucket ALL
// users into one shared limit, and logs would record the proxy, not clients.
app.set('trust proxy', 1);

/* ============================================================
   0. HTTPS ENFORCEMENT — before anything else
   ------------------------------------------------------------
   Previously this lived at the END of the file, after every route:
   a proxied plaintext request executed fully (Bearer tokens in
   headers!) and was only told to redirect afterwards, leaving
   tokens and user details exposed on the wire to any proxy on
   the path.
   ============================================================ */
if (process.env.NODE_ENV === 'production') {
  /* Allowed redirect hosts — the Host header is attacker-controlled and
     was previously echoed into the Location header (open-redirect for
     phishing: https://evil.example.com/learn/dashboard). */
  const allowedHosts = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => { try { return new URL(o.trim()).host; } catch { return ''; } })
      .filter(Boolean)
  );
  app.use((req, res, next) => {
    // Behind a proxy the scheme arrives in X-Forwarded-Proto (trust proxy above).
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https' && !req.path.startsWith('/api/health')) {
      // Only redirect when the request host is one of ours; a foreign/attacker
      // Host gets no Location to a domain we don't control.
      const reqHost = (req.headers.host || '').split(':')[0];
      if (!allowedHosts.has(reqHost) && !allowedHosts.has(req.headers.host)) {
        return res.status(400).json({ error: 'Bad request' });
      }
      return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
  // HSTS is already sent by the helmet() middleware below (max-age=31536000,
  // includeSubDomains). Note: browsers ignore HSTS over plain HTTP, so it
  // only needs to appear on the HTTPS responses helmet handles.
}

/* ============================================================
   0b. SECURITY MONITOR — payload detection + IP blocking
   ------------------------------------------------------------
   Runs before every route: scans path/query/headers/body for attack
   payloads, enforces the IP blocklist, logs security_events, raises
   live admin alerts, and serves hack.html to blocked sources.
   Verified logged-in attackers get an in-app notification.
   ============================================================ */
const { securityMonitor, securityBodyScan } = require('./middlewares/securityMonitor');
app.use(securityMonitor);

/* ============================================================
   1–5. SECURITY + BODY + LOGGING MIDDLEWARE
   ============================================================ */

// Helmet — sets security headers. The CSP allows only what the app
// actually uses: jsDelivr (lucide icons), Google Fonts, the Supabase
// origin (auth+DB REST), GitHub API (import features) and Formspree
// (contact form). Everything else is default-deny.
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
      connectSrc: ["'self'", supabaseHost, "https://api.github.com", "https://formspree.io"].filter(Boolean),
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

// Payload scan for request BODIES — mounted here (not earlier) because
// req.body only exists after the parsers above. URL/query/header scans
// already ran in the early securityMonitor gate.
app.use(securityBodyScan);

// API responses must never be cached by any intermediary. Shared proxies
// caching an authenticated payload is exactly how "user details" leak to
// other people on the same network — no-store forbids storing at all.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Same for the MCP endpoints (tokens and student data flow there)
app.use('/mcp', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Disable x-powered-by
app.disable('x-powered-by');

// Sanitize x-request-id before it is stored/echoed: it is attacker-controlled
// (proxy or client can set it) and would otherwise flow into DB rows and
// response headers verbatim. Cap length, allowlist the characters.
app.use((req, res, next) => {
  const rid = req.headers['x-request-id'];
  if (rid && (typeof rid !== 'string' || rid.length > 64 || !/^[A-Za-z0-9_.:-]+$/.test(rid))) {
    delete req.headers['x-request-id']; // fall back to a server-generated UUID
  }
  next();
});

// Request logging — assigns a request id and captures 5xx responses
app.use(requestLogger);

/* ============================================================
   6. SUBDOMAIN + LEGACY PATH NORMALIZATION
   ------------------------------------------------------------
   learn.1percent.rw serves the app at '/' while the main site
   serves the marketing pages; a single codebase handles both.
   Any path starting with /learn/ is rewritten (stripped) so the
   SAME routes below serve both hosts. req.isLearnSubdomain is
   read later by the route maps and by sitemapRoutes (which
   serves the in-app course viewer on the subdomain but the SEO
   course page on the main host).
   ============================================================ */

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
   7. SITEMAP + SEO PAGES — dynamic, served from the domain root
   ------------------------------------------------------------
   Mounted BEFORE static files so it always wins: /sitemap.xml,
   /courses and /course/:slug are server-rendered from Supabase
   (5-min in-memory cache; admin mutations call
   invalidateCourseCache() to bust it instantly). If the static
   middleware came first it would 404 these paths — they don't
   exist as files.
   ============================================================ */
app.use('/', sitemapRoutes);

/* ============================================================
   8–9. STATIC FILES — Frontend
   ------------------------------------------------------------
   Serves frontend/ assets AFTER sitemapRoutes (so dynamic SEO
   pages win) and BEFORE the API/HTML maps (so a real file like
   /toast.js never falls through to the catch-all).
   ============================================================ */
const frontendDir = path.join(__dirname, '..', 'frontend');

// 8. Block direct access to server-side templates. They contain
// {{PLACEHOLDERS}} that are only filled when served through their real
// routes; letting a crawler hit the raw file would index placeholder text.
app.get(['/courses-page.html', '/course-page.html'], (req, res) => {
  res.status(404).sendFile(path.join(frontendDir, '404.html'));
});

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

/* 9b. sendHtml — always revalidate HTML (Cache-Control: no-cache).
   Static assets (JS/CSS/images) keep their normal caching, but any
   HTML file must re-check with the server so a deploy reaches every
   user on their very next page view. */
function sendHtml(res, ...segments) {
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(path.join(frontendDir, ...segments));
}

/* 10. Root path — host-aware homepage: the learn subdomain serves the
   in-app landing (learn/index.html) while the main domain serves the
   public marketing homepage (index.html). */
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

// Diagnostics — admin-only (previously UNAUTHENTICATED: anyone could
// enumerate DB tables and row counts).
const { adminClient: diagClient } = require('./config/database');
const { authenticate, requireRole } = require('./middlewares/auth');
app.get('/api/admin/diagnostics', authenticate, requireRole('admin'), async (req, res) => {
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
app.use('/api/ai-reviews', aiReviewRoutes); // admin AI-review queue + student own-review
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin/ratings', adminRatingRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/admin/testimonials', adminTestimonialRoutes);
app.use('/api/mentor', mentorRoutes);               // mentor: learner progress + weekly shares
app.use('/api/admin/mentor', adminMentorRoutes);   // admin: roles, assignments, weekly share
app.use('/api/logs', logRoutes);
app.use('/api/admin/logs', adminLogRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/mcp', studentMcpTokenRoutes);

app.get('/.well-known/oauth-protected-resource', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'learn.1percent.rw';
  const base = `${proto}://${host}`;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    resource: `${base}/mcp/student`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    scopes_supported: ['read', 'grade'],
    resource_documentation: `${base}/docs`
  });
});

app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'learn.1percent.rw';
  const base = `${proto}://${host}`;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/mcp/oauth/authorize`,
    token_endpoint: `${base}/mcp/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    scopes_supported: ['read', 'grade']
  });
});

// MCP over Streamable HTTP — remote server for claude.ai (token in URL path or Bearer).

// OAuth discovery documents for claude.ai custom connectors (RFC 9728 /
// OAuth authorization server metadata). Root-level so clients can find them
// without guessing the protected-resource path.

// MCP OAuth — account-based "Connect to Claude" (authorize + consent + token).
// Mounted BEFORE the student/admin MCP mounts so /mcp/oauth/* is never
// treated as a token path.
app.use('/mcp/oauth', mcpOAuthRoutes);

// Student MCP — "Connect to Claude" for students. Mount BEFORE the /mcp/:token?
// catch-all so the 'student' path segment is never treated as an admin token.
app.use('/mcp/student/:token?', (req, res, next) => {
  if (req.params.token) req.mcpPathToken = req.params.token;
  next();
}, studentMcpRpcRoutes);

// Admin MCP catch-all — any other /mcp/<token> goes to the admin server.
app.use('/mcp/:token?', (req, res, next) => {
  if (req.params.token) req.mcpPathToken = req.params.token;
  next();
}, mcpRoutes);
app.use('/api', courseRoutes);  // /api/roadmap, /api/courses (has /:slug)

/* ============================================================
   SPA ROUTES — serve specific HTML files for app pages
   ============================================================ */
const htmlRoutes = {
  '/hack': 'hack.html',
  '/hack.html': 'hack.html',
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
  '/payment': 'payment.html',
  '/payment-details': 'payment-details.html',
  '/sign': 'sign.html',
  '/certificate': 'certificate-view.html',
  '/course': 'course.html',
  '/admin': 'admin.html',
  '/admin/': 'admin.html',
  '/docs': 'docs.html',
  '/install': 'install.html',
  '/pricing': 'pricing.html',
  '/payments': 'payments.html',
  '/how-to-use': 'how-to-use.html',
  '/getting-started': 'getting-started.html',
  '/faq': 'faq.html',
  '/reset-password': 'reset-password.html',
  '/settings': 'settings.html',
  '/terms': 'terms.html',
  '/privacy': 'privacy.html',
  '/contact': 'contact.html',
  '/onboarding': 'onboarding.html',
  '/mentors': 'mentors.html',
};

// Learn subdomain routes — same pages, no /learn prefix
const learnSubdomainRoutes = {
  '/': 'learn/index.html',
  '/hack': 'hack.html',
  '/hack.html': 'hack.html',
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
  '/pricing': 'pricing.html',
  '/payments': 'payments.html',
  '/how-to-use': 'how-to-use.html',
  '/getting-started': 'getting-started.html',
  '/faq': 'faq.html',
  '/reset-password': 'reset-password.html',
  '/parent-payment': 'parent-payment.html',
  '/settings': 'settings.html',
  '/terms': 'terms.html',
  '/privacy': 'privacy.html',
  '/contact': 'contact.html',
  '/onboarding': 'onboarding.html',
  '/mentors': 'mentors.html',
};

/* ============================================================
   13–14. HTML ROUTE MAPS + CATCH-ALL
   ------------------------------------------------------------
   Two maps, one per host, same values mostly: htmlRoutes for the
   main site (with /learn/* app paths) and learnSubdomainRoutes
   for learn.1percent.rw (same pages without the prefix). The
   catch-all runs LAST — exact matches first, then the special
   parameterized views, then legacy 301 redirects, then 404.
   ============================================================ */
app.get('*', (req, res) => {
  // Non-HTML clients (API tools) and API paths get JSON, never the 404 page
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
   15. ERROR HANDLING — generic messages only, no stack traces
   ------------------------------------------------------------
   Express error middleware has FOUR args (err, req, res, next) —
   that signature is how Express identifies it. Runs last, after
   every route, catching anything a route threw (via next(err)).
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
