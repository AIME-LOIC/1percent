/* ============================================================
   Tests for the Lesson Quick Quiz fast-track completion
   ============================================================
   Run: node test_lesson_quick_quiz.js

   Covers the pure scoring/normalization layer plus static checks
   that the routes, service waiver, and migration are wired.
   ============================================================ */

require('dotenv').config();
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

const fs = require('fs');
const path = require('path');
const svc = require('./backend/services/quizService');

let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
  if (!cond) failures++;
};

(async () => {
  const Q = svc.QUICK;

  /* ── 1. Tunables sanity ────────────────────────────────── */
  check('MIN_QUESTIONS ≥ 1', Q.MIN_QUESTIONS >= 1);
  check('MAX_QUESTIONS ≥ MIN_QUESTIONS', Q.MAX_QUESTIONS >= Q.MIN_QUESTIONS);
  check('fast-track bar ≥ course bar (80%)', Q.MIN_PASS_PERCENT >= 80);
  check('pass validity is positive', Q.PASS_VALID_HOURS > 0);

  /* ── 2. scoreQuickAttempt (pure) ───────────────────────── */
  const questions = [
    { id: 'q1', correct_answer: 'a', points: 1 },
    { id: 'q2', correct_answer: 'b', points: 1 },
    { id: 'q3', correct_answer: 'c', points: 1 },
    { id: 'q4', correct_answer: 'd', points: 1 }
  ];
  check('all correct → 100%', svc.scoreQuickAttempt(questions, { q1: 'a', q2: 'b', q3: 'c', q4: 'd' }) === 100);
  check('all wrong → 0%', svc.scoreQuickAttempt(questions, { q1: 'b', q2: 'a', q3: 'd', q4: 'c' }) === 0);
  check('half right → 50%', svc.scoreQuickAttempt(questions, { q1: 'a', q2: 'b', q3: 'x', q4: 'y' }) === 50);
  check('extra/tampered answers ignored', svc.scoreQuickAttempt(questions, { q1: 'a', q2: 'b', q3: 'c', q4: 'd', q9: 'a' }) === 100);
  check('null answers → 0%', svc.scoreQuickAttempt(questions, null) === 0);
  check('empty answers → 0%', svc.scoreQuickAttempt(questions, {}) === 0);
  check('points weighted', svc.scoreQuickAttempt(
    [{ id: 'p1', correct_answer: 'a', points: 3 }, { id: 'p2', correct_answer: 'b', points: 1 }],
    { p1: 'a', p2: 'b' }) === 100);

  /* ── 3. sanitizeQuickOptions strips everything but id/text ── */
  const opts = svc.sanitizeQuickOptions([
    { id: 'o1', text: 'One', correct: true, correct_answer: 'x', explanation: 'leak' },
    { id: 'o2', text: 'Two', correct: false }
  ]);
  check('options reduced to id+text', JSON.stringify(opts) === JSON.stringify([{ id: 'o1', text: 'One' }, { id: 'o2', text: 'Two' }]), JSON.stringify(opts));
  check('sanitize handles null options', JSON.stringify(svc.sanitizeQuickOptions(null)) === '[]');

  /* ── 4. Wiring: routes ─────────────────────────────────── */
  const routesSrc = fs.readFileSync(path.join(__dirname, 'backend/routes/courseRoutes.js'), 'utf8');
  check('GET quick-quiz route registered', routesSrc.includes("router.get('/courses/progress/:lessonId/quick-quiz'"));
  check('POST quick-quiz route registered', routesSrc.includes("router.post('/courses/progress/:lessonId/quick-quiz'"));
  check('POST route is authenticated + sanitized', /router\.post\('\/courses\/progress\/:lessonId\/quick-quiz', authenticate, rateLimit, sanitizeStrings/.test(routesSrc));

  /* ── 5. Wiring: controller + service ───────────────────── */
  const ctrlSrc = fs.readFileSync(path.join(__dirname, 'backend/controllers/courseController.js'), 'utf8');
  check('controller exposes getQuickQuiz', ctrlSrc.includes('async getQuickQuiz('));
  check('controller exposes submitQuickQuiz', ctrlSrc.includes('async submitQuickQuiz('));

  const svcSrc = fs.readFileSync(path.join(__dirname, 'backend/services/courseService.js'), 'utf8');
  check('study gate consults hasRecentLessonPass', svcSrc.includes('quizService.hasRecentLessonPass'));
  check('waiver only bypasses when studied < minSeconds', /studied < minSeconds\s*\?\s*await quizService\.hasRecentLessonPass/.test(svcSrc));
  check('gate still throws without pass', svcSrc.includes("STUDY_TIME_REQUIRED"));

  const quizSrc = fs.readFileSync(path.join(__dirname, 'backend/services/quizService.js'), 'utf8');
  check('answers never selected for serving', quizSrc.includes('sanitizeQuickOptions(q.options)'));
  check('submit grades only presented questions', quizSrc.includes('scoreQuickAttempt(presented, answers)'));
  check('pass recorded via upsert', quizSrc.includes("from('lesson_quiz_passes')"));

  /* ── 6. Migration ──────────────────────────────────────── */
  const mig = fs.readFileSync(path.join(__dirname, 'migrations/add_lesson_quiz_passes.sql'), 'utf8');
  check('migration creates lesson_quiz_passes', mig.includes('create table if not exists public.lesson_quiz_passes'));
  check('unique (user_id, lesson_id) for idempotent upsert', mig.includes('unique (user_id, lesson_id)'));
  check('RLS enabled', mig.includes('enable row level security'));

  /* ── 7. Frontend wiring ────────────────────────────────── */
  const courseHtml = fs.readFileSync(path.join(__dirname, 'frontend/course.html'), 'utf8');
  check('lesson footer has Quick Quiz button', courseHtml.includes("openQuickQuiz('${lessonId}')"));
  check('modal auto-completes on pass', courseHtml.includes('progress/${lessonId}/complete'));
  check('inline script parses', (() => {
    const s = [...courseHtml.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)][0][1];
    try { new Function(s); return true; } catch { return false; }
  })());

  console.log(failures === 0 ? '\nALL QUICK-QUIZ TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
