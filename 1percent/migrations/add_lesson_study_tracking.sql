-- ============================================================
-- Lesson study-time tracking
-- Adds started_at / time_spent_seconds to lesson_progress so the
-- "minimum 10 minutes of study per lesson" rule can be enforced
-- server-side (elapsed wall-clock since first open).
--
-- Backfill: any lesson_progress row created before this migration
-- gets started_at = created_at-equivalent (completed_at or now()),
-- so existing in-progress learners are not unfairly blocked.
-- ============================================================

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS time_spent_seconds int NOT NULL DEFAULT 0;

-- Backfill started_at for rows that never recorded it
UPDATE public.lesson_progress
SET started_at = COALESCE(completed_at, NOW())
WHERE started_at IS NULL;

-- Partial index: fast lookup of the current row per (user, lesson)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson
  ON public.lesson_progress (user_id, lesson_id);
