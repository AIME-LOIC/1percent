-- ============================================================
-- Lesson Quick Quiz — fast-track lesson completion
-- ============================================================
-- Fast learners can prove mastery and complete a lesson WITHOUT
-- waiting out the 10-minute study-time gate: the lesson page offers
-- a small quiz drawn from the course question bank (questions whose
-- quiz_questions.lesson_id maps to this lesson; when fewer than
-- MIN_QUICK_QUESTIONS exist, the gap is filled from the course's
-- other lessons, tagged as review).
--
--   GET  /api/courses/progress/:lessonId/quick-quiz   → questions (no answers)
--   POST /api/courses/progress/:lessonId/quick-quiz   → grade + record pass
--
-- Grading is server-side only: correct answers never leave the DB.
-- Passing marks lesson_quiz_passes.passed_at; courseService's
-- study-time gate accepts a pass younger than PASS_VALID_HOURS.
-- Idempotent — safe to run more than once.
-- ============================================================

create table if not exists public.lesson_quiz_passes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id)  on delete cascade,
  quiz_id    uuid not null references public.quizzes(id)  on delete cascade,
  percentage int  not null,
  passed_at  timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists idx_lesson_quiz_passes_lesson
  on public.lesson_quiz_passes(lesson_id);

alter table public.lesson_quiz_passes enable row level security;

-- Students read their own passes (the backend uses the service-role
-- client, which bypasses RLS). Writes happen only through the API.
create policy "Users can view own lesson quiz passes"
  on public.lesson_quiz_passes for select
  using (auth.uid() = user_id);
