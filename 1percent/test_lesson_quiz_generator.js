/* ============================================================
   Tests for the lesson quiz generator (pure functions)
   ============================================================
   Run: node test_lesson_quiz_generator.js
   ============================================================ */

require('dotenv').config();
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

const fs = require('fs');
const path = require('path');
const {
  generateLessonQuiz,
  extractConcepts,
  tokenize,
  pickBySeed,
  dollarQuote,
  optionsToJson,
  shaLikeHash
} = require('./backend/services/lessonQuizGenerator');

let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
  if (!cond) failures++;
};

(async () => {
  const lesson = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Git Branching and Merging',
    content_md: `# Git Branching and Merging

Branches let you develop features in isolation. The main branch is the stable history.
Creating a branch is cheap — git stores a pointer, not a copy.

## Why branching matters
Every professional project needs branches: feature-login, bugfix-payments, release-1.2.
Merging combines finished branches back into main. Merge conflicts happen when two
branches change the same line; resolve them by keeping both intents.
`
  };

  /* ── 1. Determinism ────────────────────────────────────── */
  const a = generateLessonQuiz(lesson);
  const b = generateLessonQuiz(lesson);
  check('same lesson → identical questions (deterministic)', JSON.stringify(a) === JSON.stringify(b));

  const c = generateLessonQuiz({ ...lesson, id: '22222222-2222-2222-2222-222222222222' });
  check('different lesson id → different seed/questions', JSON.stringify(a) !== JSON.stringify(c));

  /* ── 2. Shape ──────────────────────────────────────────── */
  check('3 questions generated', a.length === 3, `got ${a.length}`);
  check('sort_order 1..3', a.map(q => q.sort_order).join(',') === '1,2,3');
  check('every question has 4 options', a.every(q => (q.options || []).length === 4));
  check('correct_answer always a/b/c/d', a.every(q => ['a', 'b', 'c', 'd'].includes(q.correct_answer)));
  check('correct option text matches its id', a.every(q =>
    q.options.some(o => o.id === q.correct_answer)));
  check('option ids unique per question', a.every(q =>
    new Set(q.options.map(o => o.id)).size === 4));

  /* ── 3. Content grounding ──────────────────────────────── */
  const concepts = extractConcepts(lesson);
  check('extracts concepts from content', concepts.length > 0, concepts.join(', '));
  check('concepts include lesson terms', concepts.some(k => /branch|main|merg/i.test(k)), concepts.join(', '));
  const allText = JSON.stringify(a);
  check('questions mention the lesson title', allText.includes('Git Branching and Merging'));
  check('no undefined/empty option text', !/text":"(undefined|)"/.test(allText));

  /* ── 4. Fallback for content-light lessons ─────────────── */
  const thin = generateLessonQuiz({ id: '33333333-3333-3333-3333-333333333333', title: 'Team Rituals', content_md: 'Come prepared.' });
  check('thin content still yields 3 questions', thin.length === 3 && thin.every(q => (q.options || []).length === 4));

  /* ── 5. Pure helpers ───────────────────────────────────── */
  check('tokenize strips punctuation', JSON.stringify(tokenize('Hello, world! It’s 2026.')) === JSON.stringify(['hello', 'world', 'it', 's', '2026']), JSON.stringify(tokenize('Hello, world! It’s 2026.')));
  check('pickBySeed is deterministic', pickBySeed(['x', 'y', 'z'], 5) === pickBySeed(['x', 'y', 'z'], 5));
  check('shaLikeHash stable', shaLikeHash('abc') === shaLikeHash('abc'));
  check('dollarQuote wraps with $tag$…$tag$', dollarQuote('simple', 't') === '$t$simple$t$');
  check('dollarQuote rejects tag collisions', (() => { try { dollarQuote('$t$bad', 't'); return false; } catch { return true; } })());
  check('optionsToJson emits id+text only', optionsToJson([{ id: 'a', text: 'One', secret: 'x' }]) === '[{\"id\":\"a\",\"text\":\"One\"}]');

  /* ── 6. Generator script wiring ────────────────────────── */
  const src = fs.readFileSync(path.join(__dirname, 'generate_lesson_quizzes.js'), 'utf8');
  check('script skips lessons that already have questions', src.includes('lessonHasQuestions'));
  check('script emits lesson_id on inserts', src.includes('lesson_id: lesson.id') || src.includes(', ${q(lesson.id)})'));
  check('script guards course quiz with NOT EXISTS', src.includes('NOT EXISTS'));
  check('script emits verification query', src.includes('lessons_with_questions'));

  console.log(failures === 0 ? '\nALL GENERATOR TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
