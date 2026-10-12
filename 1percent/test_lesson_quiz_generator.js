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
  extractFacts,
  buildCoursePool,
  isEligibleLesson,
  MIN_QUESTIONS,
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
    lesson_type: 'reading',
    content_md: `# Git Branching and Merging

**Branch** is a movable pointer to a commit that lets you work in isolation.
**Merge** means combining the work of two branches back into one history.
**Conflict** is what Git reports when two branches change the same line.
**Fast-forward** is a merge that only moves the pointer because no new commits exist.
**Rebase** is replaying your commits on top of another branch to keep history linear.
**Stash** is a shelf where Git keeps unfinished changes while you switch tasks.

Run \`git checkout\` to move between branches without losing committed work.
Use \`git branch\` to list every local branch in the repository right now.

## Try It Yourself
1. Create a branch called \`feature/about-page\` and add a file.

## 🎓 The Expert Layer
**Reflog** is the log of every position HEAD has ever pointed to in your repository.
`
  };
  const pool = { bold: ['Remote', 'Origin', 'Tag', 'Commit hash', 'Staging area', 'Clone'], code: ['git init', 'git push', 'git status'] };
  const facts = extractFacts(lesson.content_md);

  /* ── 1. Determinism ────────────────────────────────────── */
  const a = generateLessonQuiz(lesson, pool);
  const b = generateLessonQuiz(lesson, pool);
  check('same lesson → identical questions (deterministic)', JSON.stringify(a) === JSON.stringify(b));
  const c = generateLessonQuiz({ ...lesson, id: '22222222-2222-2222-2222-222222222222' }, pool);
  check('different lesson id → different order/options', JSON.stringify(a) !== JSON.stringify(c));

  /* ── 2. Shape ──────────────────────────────────────────── */
  check(`${MIN_QUESTIONS} questions generated`, a.length === MIN_QUESTIONS, `got ${a.length}`);
  check('sort_order 1..N', a.map(q => q.sort_order).join(',') === '1,2,3,4,5');
  check('every question has 4 options', a.every(q => (q.options || []).length === 4));
  check('option ids are a,b,c,d in order', a.every(q => q.options.map(o => o.id).join('') === 'abcd'));
  check('correct_answer is one of the option ids', a.every(q => q.options.some(o => o.id === q.correct_answer)));
  check('option texts unique per question', a.every(q => new Set(q.options.map(o => o.text.toLowerCase())).size === 4));

  /* ── 3. ANSWER KEY IS REALLY CORRECT (the old generator got this wrong) ── */
  const keyOk = [lesson, { ...lesson, id: '44444444-4444-4444-4444-444444444444' }, { ...lesson, id: '55555555-5555-5555-5555-555555555555' }]
    .every(l => generateLessonQuiz(l, pool).every(q => {
      const keyText = q.options.find(o => o.id === q.correct_answer).text;
      const stem = q.question;
      const fact = facts.find(f => (f.type === 'def' && stem.includes('"' + f.text + '"')) ||
                                   (f.type === 'cloze' && stem.includes(f.text)));
      return !!fact && fact.term === keyText;
    }));
  check('marked-correct option is the fact the question was built from', keyOk);

  /* ── 4. Fairness / grounding ───────────────────────────── */
  const stems = a.map(q => q.question.toLowerCase());
  check('wrong options never leak into the question stem', a.every(q => q.options.every(o =>
    o.id === q.correct_answer || !new RegExp('(^|[^a-z0-9])' + o.text.toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).test(q.question.toLowerCase()))));
  check('no placeholder distractors (COBOL / decorative / unrelated)', !/cobol|decorative|unrelated|deprecated|hardware specification/i.test(JSON.stringify(a)));
  check('expert-layer boilerplate is not quizzed', !facts.some(f => /reflog/i.test(f.term)));
  check('"Try It Yourself" instructions are not quizzed', !facts.some(f => /about-page/.test(f.term)));
  let aCount = 0, total = 0;
  for (let i = 0; i < 200; i++) for (const q of generateLessonQuiz({ ...lesson, id: 'syn-' + i }, pool)) { total++; if (q.correct_answer === 'a') aCount++; }
  check('correct answer is spread across a/b/c/d (A ≤ 40%)', aCount / total <= 0.4, `A=${(100 * aCount / total).toFixed(0)}%`);

  /* ── 5. No quiz is better than a fake quiz ─────────────── */
  const thin = generateLessonQuiz({ id: '33333333-3333-3333-3333-333333333333', title: 'Team Rituals', lesson_type: 'reading', content_md: 'Come prepared.' }, pool);
  check('thin content → no quiz (not a guessable one)', Array.isArray(thin) && thin.length === 0);
  check('project lessons → no quiz', generateLessonQuiz({ ...lesson, lesson_type: 'project' }, pool).length === 0);
  check('lab lessons → no quiz', generateLessonQuiz({ ...lesson, lesson_type: 'lab' }, pool).length === 0);
  check('isEligibleLesson false for project/lab/quiz', !isEligibleLesson({ lesson_type: 'project' }) && !isEligibleLesson({ lesson_type: 'lab' }) && !isEligibleLesson({ lesson_type: 'quiz' }) && isEligibleLesson({ lesson_type: 'reading' }));
  const pools = buildCoursePool([lesson]);
  check('course pool collects real terms', pools.bold.includes('Branch') && pools.code.includes('git checkout'));

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
  check('script pages past the 1000-row Supabase limit', src.includes('fetchPaged'));
  check('script leaves no-material lessons without a quiz', src.includes('!qs.length'));
  check('script has a --review mode that writes no SQL', src.includes('--review') && src.includes('quick_quiz_review.md'));
  check('script emits lesson_id on inserts', src.includes('lesson_id: lesson.id') || src.includes(', ${q(lesson.id)})'));
  check('script guards course quiz with NOT EXISTS', src.includes('NOT EXISTS'));
  check('script emits verification query', src.includes('lessons_with_questions'));

  console.log(failures === 0 ? '\nALL GENERATOR TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
