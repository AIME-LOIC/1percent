/**
 * test_project_system.js
 *
 * OFFLINE unit tests for the project system (Phase 28). No network, no real
 * database: dummy SUPABASE_* env vars are set BEFORE any backend module loads,
 * so the real config/database.js constructs Supabase clients successfully
 * (createClient only validates that values are non-empty) without ever making
 * a request. Production modules stay unmodified — same spirit as the
 * dependency-free convention in Streakservice.test.js.
 *
 * Run: node --test test_project_system.js
 */

/* ── Dummy environment — MUST run before backend requires ─────── */
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://fake-project-test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'fake-anon-key-for-tests';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-service-role-key-for-tests';
// GitHub App values are obvious fakes — a test below asserts they never leak.
process.env.GITHUB_APP_ID = '999999';
process.env.GITHUB_INSTALLATION_ID = '888888';
process.env.GITHUB_PRIVATE_KEY = '-----BEGIN TEST KEY-----\\nFAKE-KEY-MATERIAL-DO-NOT-LEAK\\n-----END TEST KEY-----';
process.env.GITHUB_WEBHOOK_SECRET = 'webhook-secret-for-tests';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const readSource = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

/** Pull a literal (regex or object) straight out of a source file and evaluate it. */
function literalFromSource(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `could not find ${label} in source`);
  return eval(`(${match[1]})`); // test-only extraction; production modules are untouched
}

/* ── Modules under test (loaded after the env is faked) ───────── */
const github = require('./backend/services/github/index.js');
const githubApp = require('./backend/services/github/app.js');
const progress = require('./backend/services/projectService/progress.js');
const activity = require('./backend/services/projectService/activity.js');
const notifications = require('./backend/services/projectService/notifications.js');
const projectCore = require('./backend/mcp/projectCore.js');
const { githubWebhookRouter } = require('./backend/routes/githubWebhookRoutes.js');

const { verifyWebhookSignature } = github;
const { TASK_COMPLETION_CREDIT, computeProjectProgress } = progress;

/* ============================================================
   1. GitHub webhook signature verification (Phase 2)
   ============================================================ */
describe('GitHub webhook signature verification', () => {
  const SECRET = 'test-webhook-secret';
  const rawBody = Buffer.from(JSON.stringify({
    action: 'opened',
    repository: { id: 620482000, name: 'myschool', full_name: '1percent-Rwanda/myschool' },
    sender: { login: 'aimeloic' }
  }));
  const validSig = () => 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

  test('accepts a valid signature', () => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    assert.equal(verifyWebhookSignature(validSig(), rawBody), true);
  });

  test('rejects a signature over re-serialized JSON (raw body is mandatory)', () => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    const reSerialized = Buffer.from(JSON.stringify(JSON.parse(rawBody.toString('utf8')), null, 2));
    assert.notEqual(reSerialized.toString(), rawBody.toString(), 'serialization must actually differ');
    assert.equal(verifyWebhookSignature(validSig(), reSerialized), false);
  });

  test('rejects a signature computed with the wrong secret', () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'a-different-secret';
    assert.equal(verifyWebhookSignature(validSig(), rawBody), false);
  });

  test('rejects missing / malformed headers', () => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    assert.equal(verifyWebhookSignature('', rawBody), false);
    assert.equal(verifyWebhookSignature(undefined, rawBody), false);
    assert.equal(verifyWebhookSignature('sha256=deadbeef', rawBody), false);
    assert.equal(verifyWebhookSignature('not-a-signature', rawBody), false);
  });

  test('rejects everything when the webhook secret is not configured', () => {
    process.env.GITHUB_WEBHOOK_SECRET = '';
    assert.equal(verifyWebhookSignature(validSig(), rawBody), false);
  });
});

/* ============================================================
   2. Weighted progress engine (Phase 4)
   ============================================================ */
describe('Weighted progress engine', () => {
  test('TASK_COMPLETION_CREDIT matches the documented ladder', () => {
    assert.deepEqual(TASK_COMPLETION_CREDIT, {
      TODO: 0,
      BLOCKED: 0.15,
      IN_PROGRESS: 0.3,
      IN_REVIEW: 0.6,
      TESTING: 0.8,
      DONE: 1.0
    });
    for (const [status, credit] of Object.entries(TASK_COMPLETION_CREDIT)) {
      assert.ok(credit >= 0 && credit <= 1, `${status} credit out of range`);
    }
  });

  test('requirement-weighted math: 38 of 50 earned → 76%', () => {
    const requirements = [
      { id: 'r1', name: 'Auth', weight: 30 },
      { id: 'r2', name: 'Payments', weight: 20 }
    ];
    const tasks = [
      { requirement_id: 'r1', status: 'DONE' },
      { requirement_id: 'r1', status: 'DONE' },
      { requirement_id: 'r1', status: 'DONE' },   // r1 → 30/30
      { requirement_id: 'r2', status: 'TESTING' },
      { requirement_id: 'r2', status: 'TODO' }    // r2 → (0.8 + 0)/2 = 0.4 → 8/20
    ];

    const p = computeProjectProgress(requirements, tasks);
    assert.equal(p.overall_percent, 76);
    assert.equal(p.total_weight, 50);
    assert.equal(p.weights_sum_to_100, false);

    const byId = Object.fromEntries(p.requirement_progress.map(r => [r.requirement_id, r]));
    assert.equal(byId.r1.completion_percent, 100);
    assert.equal(byId.r2.completion_percent, 40);
    assert.equal(byId.r2.contribution_percent, 8);
  });

  test('weights summing to 100 are flagged, and mixing credits works', () => {
    const p = computeProjectProgress(
      [{ id: 'a', weight: 60 }, { id: 'b', weight: 40 }],
      [
        { requirement_id: 'a', status: 'DONE' },        // 60 × 1.0 = 60
        { requirement_id: 'b', status: 'IN_PROGRESS' }  // 40 × 0.3 = 12
      ]
    );
    assert.equal(p.weights_sum_to_100, true);
    assert.equal(p.overall_percent, 72);
  });

  test('commits alone never move progress (engine ignores GitHub activity)', () => {
    const p = computeProjectProgress(
      [{ id: 'r1', weight: 100 }],
      [{ requirement_id: 'r1', status: 'TODO' }]
    );
    assert.equal(p.overall_percent, 0);
    const progressSource = readSource('backend/services/projectService/progress.js');
    for (const activityType of ['COMMIT_PUSHED', 'PR_MERGED', 'REVIEW_SUBMITTED']) {
      assert.ok(!progressSource.includes(activityType), `progress engine must not consume ${activityType}`);
    }
  });

  test('empty / missing input yields 0, never NaN', () => {
    for (const p of [
      computeProjectProgress([], []),
      computeProjectProgress(null, null),
      computeProjectProgress(undefined, undefined)
    ]) {
      assert.equal(p.overall_percent, 0);
      assert.ok(Number.isFinite(p.overall_percent));
    }
  });

  test('a requirement with no tasks is 0 unless manually completed', () => {
    const pending = computeProjectProgress([{ id: 'r1', weight: 100 }], []);
    assert.equal(pending.overall_percent, 0);

    const manual = computeProjectProgress([{ id: 'r1', weight: 100, manually_completed: true }], []);
    assert.equal(manual.overall_percent, 100);

    const doneStatus = computeProjectProgress([{ id: 'r1', weight: 100, status: 'DONE' }], []);
    assert.equal(doneStatus.overall_percent, 100);
  });

  test('unknown task statuses contribute 0 rather than crashing', () => {
    const p = computeProjectProgress(
      [{ id: 'r1', weight: 100 }],
      [{ requirement_id: 'r1', status: 'SOMETHING_NEW' }]
    );
    assert.equal(p.overall_percent, 0);
  });
});

/* ============================================================
   3. Activity normalization surface (Phase 23)
   ============================================================ */
describe('Activity normalization', () => {
  test('exports the documented functions', () => {
    assert.equal(typeof activity.processWebhookEvent, 'function');
    assert.equal(typeof activity.getActivity14d, 'function');
    assert.equal(typeof activity.getProjectActivity, 'function');
  });

  test('emits the documented activity type vocabulary', () => {
    const source = readSource('backend/services/projectService/activity.js');
    for (const type of [
      'COMMIT_PUSHED', 'PR_OPENED', 'PR_MERGED', 'PR_CLOSED',
      'REVIEW_SUBMITTED', 'ISSUE_OPENED', 'ISSUE_CLOSED', 'ISSUE_COMMENT',
      'TEST_PASSED', 'TEST_FAILED', 'DEPLOYMENT_STARTED', 'DEPLOYMENT_COMPLETED',
      'BRANCH_CREATED', 'TASK_COMPLETED'
    ]) {
      assert.ok(source.includes(`'${type}'`), `missing activity type ${type}`);
    }
  });
});

/* ============================================================
   4. GitHub App secret hygiene
   ============================================================ */
describe('GitHub App configuration', () => {
  test('configSummary reports booleans only — never key material', () => {
    const summary = githubApp.configSummary();
    assert.equal(summary.app_id_configured, true);
    assert.equal(summary.installation_id_configured, true);
    assert.equal(summary.private_key_configured, true);
    assert.equal(summary.webhook_secret_configured, true);

    const serialized = JSON.stringify(summary);
    for (const secret of ['FAKE-KEY-MATERIAL-DO-NOT-LEAK', 'webhook-secret-for-tests', '999999']) {
      assert.ok(!serialized.includes(secret), `configSummary leaked ${secret}`);
    }
  });

  test('isConfigured is true only when id + installation + key are present', () => {
    assert.equal(githubApp.isConfigured(), true);
  });
});

/* ============================================================
   5. Business signup validation (Phase 11)
   ============================================================ */
describe('Business signup validation', () => {
  const source = readSource('backend/routes/businessRoutes.js');

  const EMAIL_RE = literalFromSource(source, /const EMAIL_RE = (\/[^\n]+\/);/, 'EMAIL_RE');
  const PHONE_RE = literalFromSource(source, /!(\/[^\n]+?\/)\.test\(phone\)/, 'phone regex');
  const WEBSITE_RE = literalFromSource(source, /!(\/[^\n]+?\/)\.test\(website\)/, 'website regex');

  test('email validation accepts real emails and rejects junk', () => {
    assert.ok(EMAIL_RE.test('info@acme.rw'));
    assert.ok(!EMAIL_RE.test('not-an-email'));
    assert.ok(!EMAIL_RE.test('spaces in@acme.rw'));
  });

  test('phone validation accepts Rwandan-style numbers, rejects text', () => {
    assert.ok(PHONE_RE.test('+250 788 123 456'));
    assert.ok(PHONE_RE.test('0788123456'));
    assert.ok(!PHONE_RE.test('call me maybe'));
  });

  test('website validation requires a protocol', () => {
    assert.ok(WEBSITE_RE.test('https://acme.rw'));
    assert.ok(!WEBSITE_RE.test('acme.rw'));
  });

  test('signup enforces password rules and the company-size whitelist', () => {
    assert.ok(source.includes('Password must be at least 8 characters'));
    assert.ok(source.includes('Passwords do not match'));
    for (const size of ['1-2', '3-10', '10-50', '50-200', '200+']) {
      assert.ok(source.includes(`'${size}'`), `missing company size ${size}`);
    }
  });
});

/* ============================================================
   6. Student task-transition matrix (Phase 7 / 35)
   ============================================================ */
describe('Student task transitions', () => {
  const source = readSource('backend/services/projectService/index.js');
  const STUDENT_TRANSITIONS = literalFromSource(
    source,
    /const STUDENT_TRANSITIONS = (\{[\s\S]*?\n\});/,
    'STUDENT_TRANSITIONS'
  );

  test('students can never move a task straight to DONE', () => {
    for (const [action, t] of Object.entries(STUDENT_TRANSITIONS)) {
      assert.notEqual(t.to, 'DONE', `${action} must not produce DONE`);
    }
    assert.equal(STUDENT_TRANSITIONS.approve, undefined, 'approval must be mentor-only');
  });

  test('the student lifecycle is start → review → testing, pause goes back to TODO', () => {
    assert.deepEqual(STUDENT_TRANSITIONS.start, { from: ['TODO', 'BLOCKED'], to: 'IN_PROGRESS' });
    assert.deepEqual(STUDENT_TRANSITIONS.submit, { from: ['IN_PROGRESS'], to: 'IN_REVIEW' });
    assert.deepEqual(STUDENT_TRANSITIONS.test, { from: ['IN_REVIEW'], to: 'TESTING' });
    assert.deepEqual(STUDENT_TRANSITIONS.pause, { from: ['IN_PROGRESS'], to: 'TODO' });
  });

  test('DONE is only reachable through the mentor/admin approve action', () => {
    assert.ok(source.includes("if (action === 'approve')"), 'missing mentor approve branch');
    assert.ok(source.includes('Only IN_REVIEW/TESTING tasks can be approved'));
    assert.ok(source.includes('Students cannot perform action'), 'unknown student actions must throw');
  });
});

/* ============================================================
   7. Data model migration shape
   ============================================================ */
describe('Project-system migration', () => {
  const sql = readSource('migrations/add_project_system.sql');
  const tables = [
    'companies', 'projects', 'project_requests', 'teams', 'team_members',
    'project_milestones', 'project_requirements', 'project_tasks',
    'repositories', 'project_repositories', 'project_activities',
    'pull_requests', 'reviews', 'deployments', 'project_documents',
    'project_feedback', 'project_assignments', 'github_webhook_events'
  ];

  test('creates every table idempotently', () => {
    for (const t of tables) {
      const re = new RegExp(`create table if not exists public\\.${t} \\(`, 'i');
      assert.ok(re.test(sql), `missing create table for ${t}`);
    }
  });

  test('enables RLS on every new table', () => {
    for (const t of tables) {
      const re = new RegExp(`alter table public\\.${t}\\s+enable row level security`, 'i');
      assert.ok(re.test(sql), `RLS not enabled for ${t}`);
    }
  });

  test('widens the profile role constraint to include business', () => {
    assert.match(sql, /check \(role in \('student', 'mentor', 'admin', 'business'\)\)/i);
  });

  test('records webhook deliveries uniquely for idempotency', () => {
    assert.match(sql, /delivery_id/i);
    assert.match(sql, /unique/i);
  });
});

/* ============================================================
   8. Module-loading smoke tests
   ============================================================ */
describe('Module loading smoke tests', () => {
  test('services/github/app', () => {
    for (const fn of ['getAppJwt', 'getInstallationToken', 'isConfigured', 'configSummary']) {
      assert.equal(typeof githubApp[fn], 'function', `missing ${fn}`);
    }
    assert.equal(typeof githubApp.APP_ID, 'string');
    assert.equal(typeof githubApp.INSTALLATION_ID, 'string');
  });

  test('services/github facade', () => {
    assert.equal(typeof verifyWebhookSignature, 'function');
    for (const part of ['app', 'repositories', 'issues', 'pullRequests', 'activity']) {
      assert.ok(github[part], `missing github.${part}`);
    }
  });

  test('projectService/progress + notifications', () => {
    assert.equal(typeof progress.recalculateProjectProgress, 'function');
    assert.equal(typeof notifications.notifyUserSafe, 'function');
    assert.equal(typeof notifications.notifyProjectStatus, 'function');
  });

  test('mcp/projectCore exposes 4 owner-scoped read-only tools', () => {
    assert.equal(typeof projectCore.handleProjectRpcMessage, 'function');
    assert.ok(Array.isArray(projectCore.TOOLS));
    const names = projectCore.TOOLS.map(t => t.name);
    for (const name of ['my_project_context', 'my_project_tasks', 'my_project_requirements', 'my_project_activity']) {
      assert.ok(names.includes(name), `missing MCP tool ${name}`);
    }
  });

  test('routes/githubWebhookRoutes exports an express router', () => {
    assert.ok(githubWebhookRouter, 'missing router export');
    assert.equal(typeof githubWebhookRouter.handle, 'function');
  });
});
