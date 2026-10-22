#!/usr/bin/env node
/* ============================================================
   generate_lesson_quizzes.js
   ============================================================
   Gives EVERY lesson a ⚡ Quick Quiz: fetches all published
   lessons (id, title, content_md), generates 5 deterministic
   questions from each lesson's own sentences and definitions, and emits re-runnable
   SQL that:
     1. ensures each course has a published course quiz,
     2. links every lesson to that quiz's questions via
        quiz_questions.lesson_id (the fast-track contract),
     3. inserts the questions.
   Lessons without enough material (and project/lab lessons) get NO quiz —
   the Quick Quiz button should be hidden for them, never a free skip.

   Modes:
     node generate_lesson_quizzes.js --review   → writes migrations/quick_quiz_review.md (read it BEFORE applying)
     node generate_lesson_quizzes.js            → writes migrations/generate_lesson_quizzes.sql
     node generate_lesson_quizzes.js --apply    → writes directly to Supabase
     node generate_lesson_quizzes.js --dry-run  → prints a preview, no writes
     node generate_lesson_quizzes.js --force    → also regenerate lessons that already have questions

   Safe by design:
   - Default mode skips lessons that already have quiz questions
     (hand-authored ones are preserved) unless --force.
   - Deterministic output: same lessons → same SQL.
   ============================================================ */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  generateLessonQuiz,
  buildCoursePool,
  isEligibleLesson,
  MIN_QUESTIONS,
  dollarQuote,
  optionsToJson
} = require('./backend/services/lessonQuizGenerator');

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const REVIEW = process.argv.includes('--review');

/* Questions per lesson = MIN_QUESTIONS (5): quick quiz needs 80%, so 4/5 passes. */

/* ── helpers ─────────────────────────────────────────────── */

/** SQL string literal (single-quote escaped) — for ids/titles. */
function q(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/**
 * Deterministic quiz id for a course (uuid-shaped, stable across runs
 * and identical between SQL and --apply modes). Courses that already
 * have a quiz keep their real id — this only fills the gaps.
 */
function deterministicQuizId(courseId) {
  const h = crypto.createHash('sha256').update('lesson-quiz:' + courseId).digest('hex').slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Resolve a quiz for every course: existing one or a deterministic new id. */
function resolveQuizPerCourse(courses, quizzes) {
  // Only courses with published lessons can ever need a quiz.
  return courses.map(c => {
    const existing = quizzes.find(qz => qz.course_id === c.id);
    return existing || { id: deterministicQuizId(c.id), course_id: c.id, title: `${c.title} — End of Course Quiz`, synthesized: true };
  });
}

/** Supabase returns at most 1000 rows per request — page through everything. */
async function fetchPaged(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchAll() {
  const { adminClient } = require('./backend/config/database');

  const lessons = await fetchPaged(() => adminClient
    .from('lessons')
    .select('id, title, course_id, content_md, lesson_type, is_published, sort_order')
    .eq('is_published', true)
    .order('course_id')
    .order('sort_order')
    .order('id'));

  // ALL courses: lesson visibility is decided later per-lesson (published
  // lessons of an unpublished course are counted, not silently erroring).
  const { data: courses, error: cErr } = await adminClient
    .from('courses')
    .select('id, title, slug, is_published');
  if (cErr) throw cErr;

  // paged: the old single request silently stopped at 1000 rows and re-generated duplicates
  const existing = await fetchPaged(() => adminClient
    .from('quiz_questions')
    .select('id, lesson_id')
    .order('id'));
  const lessonHasQuestions = new Set(existing.map(r => r.lesson_id).filter(Boolean));

  const { data: quizzes, error: qErr } = await adminClient
    .from('quizzes')
    .select('id, course_id, title');
  if (qErr) throw qErr;

  return { lessons, courses: courses || [], lessonHasQuestions, quizzes: quizzes || [] };
}

/** Per-course term pools (real terms → plausible wrong options) + eligibility. */
function buildPools(lessons) {
  const byCourse = new Map();
  for (const l of lessons) {
    if (!byCourse.has(l.course_id)) byCourse.set(l.course_id, []);
    byCourse.get(l.course_id).push(l);
  }
  const pools = new Map();
  for (const [courseId, list] of byCourse) pools.set(courseId, buildCoursePool(list));
  return pools;
}

/* ── SQL emission ────────────────────────────────────────── */

function emitSql({ lessons, courses, lessonHasQuestions, quizzes }) {
  const now = new Date().toISOString();

  /* Per-course: ensure a published quiz exists (explicit deterministic id
     for missing ones, so the per-lesson INSERTs can reference it).
     NOT EXISTS guard keeps re-runs from duplicating anything. */
  const resolved = resolveQuizPerCourse(courses, quizzes);
  const courseQuizBlocks = resolved.map(r => `-- Course quiz: ${r.title}
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT ${q(r.id)}, id, ${q(r.title)}, 'Auto-created to power per-lesson Quick Quizzes.', 70, true
FROM public.courses c
WHERE c.id = ${q(r.course_id)}
  AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id AND q.is_published);`);

  /* Per-lesson question INSERTs, keyed to the course quiz. */
  const blocks = [];
  let created = 0, skipped = 0, noQuiz = 0, hiddenCourse = 0;
  const pools = buildPools(lessons);
  const courseById = new Map(courses.map(c => [c.id, c]));

  for (const lesson of lessons) {
    if (lessonHasQuestions.has(lesson.id) && !FORCE) { skipped++; continue; }
    const course = courseById.get(lesson.course_id);
    if (!course || !course.is_published) { hiddenCourse++; continue; }
    const quiz = resolved.find(qz => qz.course_id === lesson.course_id);
    if (!quiz) {
      console.error(`! no course quiz resolved for lesson ${lesson.id} (${lesson.title}) — skipping`);
      continue;
    }
    const qs = generateLessonQuiz(lesson, pools.get(lesson.course_id));
    if (!qs.length) { noQuiz++; continue; }   // not enough material / project / lab → no quiz
    const tag = 'q' + String(lesson.id).replace(/-/g, '');
    const values = qs.map((question, i) => {
      const vtag = `${tag}${i}`;
      return `  (uuid_generate_v4(), ${q(quiz.id)}, ${dollarQuote(question.question, vtag)}, ${q(optionsToJson(question.options))}::jsonb, ${q(question.correct_answer)}, ${question.sort_order}, 1, ${q(lesson.id)})`;
    }).join(',\n');

    blocks.push(`-- Lesson: ${String(lesson.title).replace(/--/g, '—')}
INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points, lesson_id)
VALUES
${values};`);
    created++;
  }

  const sql = `-- ============================================================
-- LESSON QUICK QUIZZES — auto-generated; do not edit by hand.
-- Generated by: node generate_lesson_quizzes.js
-- Generated at: ${now}
-- Lessons: ${created} generated, ${skipped} skipped (already have questions), ${noQuiz} left without a quiz (too little material or project/lab), ${hiddenCourse} hidden (unpublished course)
--
-- Gives each suitable published lesson ${MIN_QUESTIONS} multiple-choice questions built
-- from its own sentences and definitions, linked via quiz_questions.lesson_id so the
-- ⚡ Quick Quiz (fast-track completion) works course-wide.
-- PREREQUISITE: migrations/add_quiz_integrity.sql (adds the
-- quiz_questions.lesson_id column) and migrations/add_lesson_quiz_passes.sql
-- (pass table) must already be applied.
-- RE-RUNNABLE: course quiz creation is guarded by NOT EXISTS.
-- Run in the Supabase SQL Editor (or re-run with --apply).
-- ============================================================

${courseQuizBlocks.join('\n\n')}

${blocks.join('\n\n')}

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT
  (SELECT count(*) FROM public.quizzes WHERE is_published)                          AS published_quizzes,
  (SELECT count(DISTINCT lesson_id) FROM public.quiz_questions WHERE lesson_id IS NOT NULL) AS lessons_with_questions,
  (SELECT count(*) FROM public.lessons WHERE is_published)                          AS published_lessons;
`;

  return { sql, created, skipped, noQuiz };
}

/* ── direct-apply mode ───────────────────────────────────── */

async function applyDirect({ lessons, courses, lessonHasQuestions, quizzes }) {
  const { adminClient } = require('./backend/config/database');
  let done = 0, noQuiz = 0, hiddenCourse = 0;
  const pools = buildPools(lessons);
  const resolved = resolveQuizPerCourse(courses, quizzes);
  const courseById = new Map(courses.map(c => [c.id, c]));

  // 1) Ensure course quizzes (explicit deterministic ids for missing ones).
  // Idempotent: quizzes already in the DB are skipped, so interrupted runs
  // can simply be re-run.
  for (const r of resolved) {
    const c = courseById.get(r.course_id);
    if (!c || !c.is_published) continue;
    if (!r.synthesized) continue;
    const { data: existing } = await adminClient.from('quizzes').select('id').eq('id', r.id).maybeSingle();
    if (existing) continue;
    const { error } = await adminClient.from('quizzes').insert({
      id: r.id,
      course_id: r.course_id,
      title: r.title,
      description: 'Auto-created to power per-lesson Quick Quizzes.',
      passing_score: 70,
      is_published: true
    });
    if (error) { console.error(`✗ course quiz ${r.title}: ${error.message}`); process.exit(1); }
  }

  // 2) Insert lesson questions
  for (const lesson of lessons) {
    if (lessonHasQuestions.has(lesson.id) && !FORCE) continue;
    const course = courseById.get(lesson.course_id);
    if (!course || !course.is_published) { hiddenCourse++; continue; }
    const quiz = resolved.find(qz => qz.course_id === lesson.course_id);
    if (!quiz) continue;
    const qs = generateLessonQuiz(lesson, pools.get(lesson.course_id));
    if (!qs.length) { noQuiz++; continue; }
    const rows = qs.map(question => ({
      quiz_id: quiz.id,
      question: question.question,
      options: optionsToJson(question.options),
      correct_answer: question.correct_answer,
      sort_order: question.sort_order,
      points: 1,
      lesson_id: lesson.id
    }));
    const { error } = await adminClient.from('quiz_questions').insert(rows);
    if (error) {
      // already-questions crash a rerun; treat duplicates as done
      if (error.code === '23505') continue;
      console.error(`✗ ${lesson.title}: ${error.message}`); process.exit(1);
    }
    done++;
    if (done % 25 === 0) console.log(`  … ${done}/${lessons.length}`);
  }
  console.log(`\n✅ Applied quick-quiz questions to ${done} lessons; ${noQuiz} left without a quiz (too little material or project/lab), ${hiddenCourse} hidden (unpublished course).`);
}

/* ── main ────────────────────────────────────────────────── */

function coverage(data) {
  const pools = buildPools(data.lessons);
  const rows = data.lessons.map(l => ({ lesson: l, qs: generateLessonQuiz(l, pools.get(l.course_id)) }));
  return { rows, withQuiz: rows.filter(r => r.qs.length) };
}

function renderQuestions(qs) {
  return qs.map((question, i) => {
    const opts = question.options.map(o => `   - ${o.id}) ${o.text}${o.id === question.correct_answer ? '  ✅' : ''}`).join('\n');
    return `${i + 1}. ${question.question}\n${opts}`;
  }).join('\n');
}

async function main() {
  const data = await fetchAll();
  const { rows, withQuiz } = coverage(data);
  const eligible = data.lessons.filter(isEligibleLesson).length;
  const visible = data.lessons.filter(l => {
    const c = data.courses.find(cc => cc.id === l.course_id);
    return c && c.is_published;
  }).length;
  console.log(`Fetched ${data.lessons.length} published lessons across ${data.courses.length} courses (${visible} in published courses, ${eligible} eligible, not project/lab).`);
  console.log(`${data.lessonHasQuestions.size} lessons already have questions.`);
  console.log(`Generator can build a ${MIN_QUESTIONS}-question quiz for ${withQuiz.length} lessons; ${data.lessons.length - withQuiz.length} will have NO quiz (button should stay hidden).\n`);

  if (REVIEW) {
    const md = ['# Quick Quiz review', '', `Generated ${new Date().toISOString()} — ${withQuiz.length} lessons. ✅ marks the answer key.`,
      'Read these. Delete or fix weak lessons by hand BEFORE running --apply.', ''];
    for (const { lesson, qs } of withQuiz) md.push(`## ${lesson.title}`, `(lesson ${lesson.id})`, '', renderQuestions(qs), '');
    const outPath = path.join(__dirname, 'migrations', 'quick_quiz_review.md');
    fs.writeFileSync(outPath, md.join('\n'));
    console.log(`Wrote ${outPath}. Nothing was written to the database.`);
    return;
  }

  if (DRY) {
    for (const { lesson, qs } of withQuiz.slice(0, 3)) {
      console.log(`— ${lesson.title}\n${renderQuestions(qs)}\n`);
    }
    return;
  }

  if (APPLY) return applyDirect(data);

  const { sql, created, skipped, noQuiz } = emitSql(data);
  const outPath = path.join(__dirname, 'migrations', 'generate_lesson_quizzes.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath} (${(sql.length / 1024).toFixed(0)} KB) — ${created} lessons covered, ${skipped} skipped, ${noQuiz} without a quiz.`);
  console.log('Run it in the Supabase SQL Editor (or re-run with --apply).');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
