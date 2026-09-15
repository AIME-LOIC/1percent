-- ============================================================
-- Quiz integrity + attempts policy
--   1. quizzes.max_attempts / retry_cooldown_hours — attempt
--      policy per quiz (default 3 attempts, 24h cooldown).
--   2. quiz_questions.lesson_id — maps a question back to the
--      lesson that teaches it, so failed questions can reopen
--      the right lesson.
--   3. quiz_attempts.question_results — per-question
--      correct/wrong record powering "which question do I fail
--      most" analytics.
--   4. quiz_attempts.cheating_* — tab-switch / devtools / too-fast
--      detection reported by the client + server heuristics.
-- Idempotent — safe to run more than once.
-- ============================================================

-- 1. Attempt policy on quizzes
alter table public.quizzes
  add column if not exists max_attempts int not null default 3;
alter table public.quizzes
  add column if not exists retry_cooldown_hours int not null default 24;

-- 2. Question → lesson mapping (null = admin hasn't linked it)
alter table public.quiz_questions
  add column if not exists lesson_id uuid
    references public.lessons(id) on delete set null;
create index if not exists idx_quiz_questions_lesson
  on public.quiz_questions (lesson_id);

-- 3. Per-question results on attempts (drives weak-area analytics)
alter table public.quiz_attempts
  add column if not exists question_results jsonb not null default '[]';
--   shape: [{"question_id":"…","correct":true,"chosen":"opt_id"}, …]

-- 4. Cheating detection
alter table public.quiz_attempts
  add column if not exists cheating_flags jsonb not null default '[]';
--   shape: ["tab_switching","devtools","window_blur","answers_too_fast","time_exceeded"]
alter table public.quiz_attempts
  add column if not exists cheating_score int not null default 0;
alter table public.quiz_attempts
  add column if not exists flagged boolean not null default false;
alter table public.quiz_attempts
  add column if not exists time_spent_sec int;

-- Admins can review flagged attempts
create index if not exists idx_quiz_attempts_flagged
  on public.quiz_attempts (flagged) where flagged = true;
