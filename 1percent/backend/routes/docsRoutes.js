/* ============================================================
   Docs Routes — API Documentation & Project README
   ============================================================
   GET  /api/docs/readme      — Project overview & API docs
   GET  /api/docs/endpoints   — List all API endpoints
   ============================================================ */

const { Router } = require('express');

const router = Router();

/**
 * GET /api/docs/readme
 * Project overview, testing info, and API documentation
 */
router.get('/readme', (req, res) => {
  res.json({
    project: {
      name: '1% Digital Solutions',
      tagline: "Building Rwanda's Next Tech Experts",
      description: 'A full-stack learning platform with courses, labs, challenges, and certifications. Built with Node.js, Express, and Supabase.',
      version: '1.0.0',
      license: 'UNLICENSED',
      author: '1% Digital Solutions',
      website: 'https://1percentrwanda.com',
      learn_platform: 'https://learn-1percent-rwanda.onrender.com',
      repository: 'https://github.com/1percent-digital/1percent'
    },
    stack: {
      backend: 'Node.js + Express',
      database: 'PostgreSQL (Supabase)',
      auth: 'Supabase Auth (JWT)',
      storage: 'AWS S3 + Supabase Storage',
      frontend: 'Vanilla JS + HTML/CSS',
      deployment: 'Render.com'
    },
    features: [
      'User authentication (signup, login, password reset)',
      '15 structured courses with lessons',
      'Interactive coding lab with multi-language support',
      'Coding challenges with automated grading',
      'Quiz system with attempts tracking',
      'Certificate generation (PDF)',
      'Premium subscription tiers',
      'Coin rewards system',
      'File storage (lab files)',
      'CLI tool for terminal-based learning',
      'VS Code extension for in-editor challenges'
    ],
    testing: {
      description: 'The project includes several test scripts for validating different components:',
      scripts: [
        {
          name: 'test_vm_grading.js',
          purpose: 'Tests the VM-based code grading system for challenges',
          usage: 'node test_vm_grading.js'
        },
        {
          name: 'test_vm_quick.js',
          purpose: 'Quick test of VM execution environment',
          usage: 'node test_vm_quick.js'
        },
        {
          name: 'test_vm_standalone.js',
          purpose: 'Standalone VM test without server dependencies',
          usage: 'node test_vm_standalone.js'
        },
        {
          name: 'test_vm_worker.js',
          purpose: 'Tests the worker process for code evaluation',
          usage: 'node test_vm_worker.js'
        }
      ],
      how_to_test: [
        'Ensure .env file is configured with Supabase credentials',
        'Run npm install to install dependencies',
        'Execute test scripts individually: node test_vm_grading.js',
        'Check server health: curl http://localhost:3000/api/health'
      ]
    },
    database: {
      description: 'PostgreSQL database managed via Supabase',
      schema_file: 'supabase_schema.sql',
      tables: [
        'profiles — User profiles extending Supabase auth',
        'courses — 15+ structured courses',
        'lessons — Ordered content within courses',
        'enrollments — User course enrollments',
        'lesson_progress — Track lesson completion',
        'quizzes — Quiz definitions',
        'quiz_questions — Quiz question bank',
        'quiz_attempts — User quiz attempts',
        'certificates — Issued certificates',
        'challenges — Coding challenges',
        'challenge_submissions — User challenge attempts',
        'coin_transactions — Coin reward history',
        'services — Company services',
        'service_requests — Client service inquiries',
        'lab_files — User lab file storage',
        'user_subscriptions — Premium subscriptions',
        'premium_tiers — Subscription tier definitions',
        'download_logs — Download history'
      ],
      security: 'Row Level Security (RLS) enabled on all user tables'
    },
    api_endpoints: {
      authentication: [
        'POST /api/auth/signup — Create new account',
        'POST /api/auth/login — Login with email/password',
        'POST /api/auth/logout — Logout',
        'POST /api/auth/reset-password — Request password reset'
      ],
      courses: [
        'GET /api/courses — List all courses',
        'GET /api/courses/:slug — Get course by slug',
        'POST /api/courses/:courseId/enroll — Enroll in course',
        'GET /api/courses/enrollments — Get my enrollments',
        'GET /api/courses/:courseId/progress — Get course progress',
        'POST /api/courses/progress/:lessonId/complete — Mark lesson complete'
      ],
      lab: [
        'POST /api/lab/run — Run code in sandboxed environment'
      ],
      files: [
        'GET /api/files — List my files',
        'GET /api/files/usage — Get storage usage',
        'GET /api/files/:id — Get file content',
        'POST /api/files — Upload new file',
        'PUT /api/files/:id — Update file content',
        'DELETE /api/files/:id — Delete file'
      ],
      premium: [
        'GET /api/premium/tiers — List subscription tiers',
        'GET /api/premium/status — Get my subscription status',
        'POST /api/premium/subscribe — Subscribe to a tier',
        'POST /api/premium/free-trial — Activate free trial'
      ],
      quizzes: [
        'GET /api/quizzes/:courseId — Get quiz for course',
        'POST /api/quizzes/:quizId/submit — Submit quiz answers'
      ],
      certificates: [
        'POST /api/certificates/:courseId/issue — Issue certificate',
        'GET /api/certificates/:certNumber/verify — Verify certificate'
      ],
      coins: [
        'GET /api/coins/balance — Get coin balance',
        'GET /api/coins/history — Get transaction history'
      ],
      misc: [
        'GET /api/health — Server health check',
        'GET /api/config — Public configuration',
        'POST /api/contact — Submit contact form'
      ]
    },
    tools: {
      cli: {
        name: '1% Learn CLI',
        install: 'npm install -g @1percent/learn-cli',
        commands: ['login', 'upload', 'pull', 'ls', 'rm', 'premium', 'download', 'project'],
        docs: '/docs'
      },
      vscode: {
        name: '1% Learn VS Code Extension',
        install: 'code --install-extension 1percent-learn-1.0.0.vsix',
        commands: ['login', 'challenges', 'submit', 'sync', 'logout'],
        docs: '/docs'
      }
    },
    environment_variables: [
      { name: 'PORT', description: 'Server port (default: 3000)', required: false },
      { name: 'NODE_ENV', description: 'Environment (development/production)', required: false },
      { name: 'SUPABASE_URL', description: 'Supabase project URL', required: true },
      { name: 'SUPABASE_ANON_KEY', description: 'Supabase anonymous key', required: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key', required: true },
      { name: 'AWS_ACCESS_KEY_ID', description: 'AWS access key for S3', required: false },
      { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret key for S3', required: false },
      { name: 'S3_BUCKET_NAME', description: 'S3 bucket name', required: false },
      { name: 'CONTACT_EMAIL', description: 'Contact form email', required: false },
      { name: 'ALLOWED_ORIGINS', description: 'CORS allowed origins', required: false }
    ]
  });
});

/**
 * GET /api/docs/endpoints
 * Simple endpoint listing
 */
router.get('/endpoints', (req, res) => {
  res.json({
    endpoints: {
      auth: {
        'POST /api/auth/signup': 'Create account',
        'POST /api/auth/login': 'Login',
        'POST /api/auth/logout': 'Logout',
        'POST /api/auth/reset-password': 'Reset password'
      },
      courses: {
        'GET /api/courses': 'List courses',
        'GET /api/courses/:slug': 'Get course',
        'POST /api/courses/:courseId/enroll': 'Enroll',
        'GET /api/courses/enrollments': 'My enrollments',
        'GET /api/courses/:courseId/progress': 'Course progress',
        'POST /api/courses/progress/:lessonId/complete': 'Complete lesson'
      },
      lab: {
        'POST /api/lab/run': 'Run code'
      },
      files: {
        'GET /api/files': 'List files',
        'GET /api/files/usage': 'Storage usage',
        'POST /api/files': 'Upload file',
        'PUT /api/files/:id': 'Update file',
        'DELETE /api/files/:id': 'Delete file'
      },
      premium: {
        'GET /api/premium/tiers': 'List tiers',
        'GET /api/premium/status': 'My status',
        'POST /api/premium/subscribe': 'Subscribe',
        'POST /api/premium/free-trial': 'Free trial'
      },
      misc: {
        'GET /api/health': 'Health check',
        'GET /api/config': 'Config',
        'GET /api/docs/readme': 'Project docs',
        'GET /api/docs/endpoints': 'This endpoint'
      }
    }
  });
});

module.exports = router;
