#!/usr/bin/env node
/* ============================================================
   generate_lesson_quizzes.js
   ============================================================
   Gives EVERY lesson a ⚡ Quick Quiz: fetches all published
   lessons (id, title, content_md), generates 3 deterministic
   questions from each lesson's own content, and emits re-runnable
   SQL that:
     1. ensures each course has a published course quiz,
     2. links every lesson to that quiz's questions via
        quiz_questions.lesson_id (the fast-track contract),
     3. inserts the questions.

   Modes:
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
  dollarQuote,
  optionsToJson
} = require('./backend/services/lessonQuizGenerator');

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

/* How many questions per lesson (matches QUICK.MIN_QUESTIONS in quizService) */
const QUESTIONS_PER_LESSON = 3;

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
  return courses.map(c => {
    const existing = quizzes.find(qz => qz.course_id === c.id);
    return existing || { id: deterministicQuizId(c.id), course_id: c.id, title: `${c.title} — End of Course Quiz`, synthesized: true };
  });
}

async function fetchAll() {
  const { adminClient } = require('./backend/config/database');
  const { data: lessons, error } = await adminClient
    .from('lessons')
    .select('id, title, course_id, content_md, is_published')
    .eq('is_published', true)
    .order('course_id')
    .order('sort_order');
  if (error) throw error;

  const { data: courses, error: cErr } = await adminClient
    .from('courses')
    .select('id, title, slug')
    .eq('is_published', true);
  if (cErr) throw cErr;

  const { data: existing, error: eErr } = await adminClient
    .from('quiz_questions')
    .select('lesson_id');
  if (eErr) throw eErr;
  const lessonHasQuestions = new Set((existing || []).map(r => r.lesson_id).filter(Boolean));

  const { data: quizzes, error: qErr } = await adminClient
    .from('quizzes')
    .select('id, course_id, title');
  if (qErr) throw qErr;

  return { lessons: lessons || [], courses: courses || [], lessonHasQuestions, quizzes: quizzes || [] };
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
  let created = 0, skipped = 0;

  for (const lesson of lessons) {
    if (lessonHasQuestions.has(lesson.id) && !FORCE) { skipped++; continue; }
    const quiz = resolved.find(qz => qz.course_id === lesson.course_id);
    if (!quiz) {
      console.error(`! no course quiz resolved for lesson ${lesson.id} (${lesson.title}) — skipping`);
      continue;
    }
    const qs = generateLessonQuiz(lesson);
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
-- Lessons: ${created} generated, ${skipped} skipped (already have questions)
--
-- Gives every published lesson 3 multiple-choice questions derived
-- from its own content, linked via quiz_questions.lesson_id so the
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

  return { sql, created, skipped };
}

/* ── direct-apply mode ───────────────────────────────────── */

async function applyDirect({ lessons, courses, lessonHasQuestions, quizzes }) {
  const { adminClient } = require('./backend/config/database');
  let done = 0;
  const resolved = resolveQuizPerCourse(courses, quizzes);

  // 1) Ensure course quizzes (explicit deterministic ids for missing ones)
  for (const r of resolved) {
    if (!r.synthesized) continue;
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
    const quiz = resolved.find(qz => qz.course_id === lesson.course_id);
    if (!quiz) continue;
    const qs = generateLessonQuiz(lesson);
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
    if (error) { console.error(`✗ ${lesson.title}: ${error.message}`); process.exit(1); }
    done++;
    if (done % 25 === 0) console.log(`  … ${done}/${lessons.length}`);
  }
  console.log(`\n✅ Applied quick-quiz questions to ${done} lessons.`);
}

/* ── main ────────────────────────────────────────────────── */

async function main() {
  const data = await fetchAll();
  console.log(`Fetched ${data.lessons.length} published lessons across ${data.courses.length} courses.`);
  console.log(`${data.lessonHasQuestions.size} lessons already have questions.\n`);

  if (DRY) {
    const sample = data.lessons.slice(0, 3);
    for (const l of sample) {
      console.log(`— ${l.title}`);
      for (const question of generateLessonQuiz(l)) {
        console.log(`   Q: ${question.question}`);
        for (const o of question.options) console.log(`      ${o.id}) ${o.text}${o.id === question.correct_answer ? '  ✓' : ''}`);
      }
      console.log('');
    }
    return;
  }

  if (APPLY) return applyDirect(data);

  const { sql, created, skipped } = emitSql(data);
  const outPath = path.join(__dirname, 'migrations', 'generate_lesson_quizzes.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath} (${(sql.length / 1024).toFixed(0)} KB) — ${created} lessons covered, ${skipped} skipped.`);
  console.log('Run it in the Supabase SQL Editor (or re-run with --apply).');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
