-- ============================================================================
-- 1% LEARN — CONSOLIDATED DATABASE (schema + migrations + fixes + seeds)
-- ============================================================================
-- ONE FILE. Run top-to-bottom in the Supabase SQL Editor (or psql) to build
-- the complete database for this program from scratch. It is IDEMPOTENT:
-- running it again on an existing database is safe — nothing duplicates,
-- nothing breaks — so it also works as an upgrade script for an existing DB.
--
-- HOW TO USE
--   1. Create a Supabase project.
--   2. Open SQL Editor, paste this whole file, run it.
--   3. (Optional) Append the premium "Tech in Business" lesson prose from
--      courses/tech-in-business/seed-tech-in-business-full.sql — this file
--      seeds that course's structure; the full 5,600-line lesson content
--      lives in that file on purpose to keep this one manageable.
--
-- MERGED FROM (the original files, all superseded by this one):
--   supabase_schema.sql            base tables, RLS, triggers, 15-course seed
--   error.sql                      error_logs / system_logs / admin_alerts
--   fix_database.sql               certificates + profiles columns, lab_files,
--                                  lesson_locks, user_subscriptions
--   fix_certificates.sql           certificate snapshot columns
--   fix_lab_files.sql              lab_files RLS + index
--   quizzes_seed.sql               15 end-of-course quizzes + 75 questions
--   seed_todo_course.sql           pilot course + 2 DOM challenges
--   seed_python_course.sql         python-foundations course + 6 challenges
--   courses/tech-in-business/…     premium course structure
--   migrations/                    every feature migration, inline below
--   supabase/migrations/ (2)       modules table, premium courses
--
-- CONVENTIONS
--   • icon columns store icon NAMES matching keys in frontend/js/icons.js.
--   • thumbnail_url stores a Supabase Storage path, not an external URL.
--   • Every CREATE uses IF NOT EXISTS; every ALTER uses ADD COLUMN IF NOT
--     EXISTS; every policy/trigger is guarded or replaced. That is what
--     makes the whole file re-runnable.
--
-- SECURITY MODEL (one paragraph to rule them all)
--   Row Level Security is ON for every table. Tables a browser may touch
--   get explicit policies keyed to auth.uid() / is_admin(). Tables only
--   the backend touches (via the service-role key, which bypasses RLS)
--   get RLS enabled and NO policies = default deny. Never turn that off.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — EXTENSIONS & SHARED HELPERS
-- ============================================================================

create extension if not exists "uuid-ossp";    -- uuid_generate_v4()
create extension if not exists "pgcrypto";     -- gen_random_uuid(), gen_random_bytes()

-- Generic updated_at toucher (profiles, courses, lab_files, ...).
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Same job, distinct name because error.sql defined its own.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================================
-- SECTION 1 — PROFILES (extends Supabase auth.users)
-- One row per auth user, created by trigger. `role` drives everything:
-- 'student' | 'mentor' | 'admin'. Coins/streak/subscription state lives here.
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',      -- synced from auth.users (triggers below)
  avatar_url  text,
  role        text not null default 'student' check (role in ('student', 'mentor', 'admin')),
  country     text default 'Rwanda',
  -- balance + monetization (fix_database.sql)
  coins       int not null default 0,
  has_used_free_cert_view boolean not null default false,
  -- streaks (fix_database.sql)
  streak_count int not null default 0,
  last_active_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1-pre. Role helpers, used by every RLS policy in SECTION 14.
-- SECURITY DEFINER so policies can call them without recursing into the
-- profiles policies (the classic RLS trap: a policy that SELECTs the same
-- table it protects loops forever). Defined HERE, not in SECTION 0,
-- because their SQL bodies reference public.profiles — SQL-language
-- function bodies are validated at CREATE time, so the table must exist.
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

create or replace function public.is_mentor(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = uid and role = 'mentor');
$$;

-- 1a. Create a profile whenever an auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 1b. profiles.email — added by migrations/add_profiles_email.sql because
-- several backend queries select it directly. Backfilled + kept in sync.
alter table public.profiles add column if not exists email text not null default '';

update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.id = u.id
  and p.email = '';

create or replace function public.sync_profile_email_on_signup()
returns trigger as $$
begin
  update public.profiles
  set email = coalesce(new.email, '')
  where id = new.id and email = '';
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_email on auth.users;
create trigger on_auth_user_created_email
  after insert on auth.users
  for each row execute function public.sync_profile_email_on_signup();

create or replace function public.sync_profile_email_on_update()
returns trigger as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = coalesce(new.email, '')
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update on auth.users
  for each row execute function public.sync_profile_email_on_update();

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- 1c. updated_at trigger
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();


-- ============================================================================
-- SECTION 2 — COURSES, MODULES, LESSONS
-- ============================================================================

create table if not exists public.courses (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  title         text not null,
  description   text not null,
  thumbnail_url text,                      -- Supabase Storage path, e.g. 'course-thumbnails/git-github.jpg'
  icon          text not null default 'book-open',  -- must match a key in js/icons.js
  level         text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  duration_weeks int not null default 8,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  -- premium support (supabase/migrations/20260909_premium_courses.sql)
  is_premium    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists update_courses_updated_at on public.courses;
create trigger update_courses_updated_at before update on public.courses
  for each row execute function public.update_updated_at();

-- Modules group lessons inside a course (20260909_add_modules_table.sql).
create table if not exists public.modules (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text default '',
  sort_order  int not null default 0,
  is_published boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_modules_course on public.modules(course_id, sort_order);

create table if not exists public.lessons (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  module_id     uuid references public.modules(id) on delete set null,
  title         text not null,
  description   text default '',
  content_md    text not null default '',
  lesson_type   text not null default 'video' check (lesson_type in ('video', 'lab', 'project', 'quiz', 'reading')),
  duration_min  int not null default 30,
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  -- premium support: lesson 1 of a premium course is a free preview
  is_free_preview boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_lessons_course on public.lessons(course_id, sort_order);

-- Premium flags were UPDATEs in the original migration — applied as seeds
-- in SECTION 11 once courses exist.


-- ============================================================================
-- SECTION 3 — ENROLLMENTS, PROGRESS, STUDY-TIME GATE
-- ============================================================================

create table if not exists public.enrollments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- Study-time tracking (migrations/add_lesson_study_tracking.sql):
-- the backend enforces "≥10 minutes of study per lesson" using started_at.
create table if not exists public.lesson_progress (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  completed     boolean not null default false,
  started_at    timestamptz,
  time_spent_seconds int not null default 0,
  completed_at  timestamptz,
  unique (user_id, lesson_id)
);

-- Backfill: rows created before the study-tracking migration get a started_at
-- so existing learners are not unfairly blocked by the gate.
update public.lesson_progress
set started_at = coalesce(completed_at, now())
where started_at is null;

create index if not exists idx_lesson_progress_user_lesson
  on public.lesson_progress (user_id, lesson_id);


-- ============================================================================
-- SECTION 4 — QUIZZES (+ integrity, quick-quiz fast track)
-- ============================================================================

create table if not exists public.quizzes (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  description   text default '',
  passing_score int not null default 70,
  time_limit_min int default null,
  -- attempt policy (migrations/add_quiz_integrity.sql)
  max_attempts  int not null default 3,
  retry_cooldown_hours int not null default 24,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id            uuid primary key default uuid_generate_v4(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  lesson_id     uuid references public.lessons(id) on delete set null,  -- links a question back to the lesson that teaches it
  question      text not null,
  options       jsonb not null,
  correct_answer text not null,
  sort_order    int not null default 0,
  points        int not null default 1
);

create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id, sort_order);
create index if not exists idx_quiz_questions_lesson on public.quiz_questions (lesson_id);

create table if not exists public.quiz_attempts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  answers       jsonb not null default '{}',
  score         int not null default 0,
  max_score     int not null default 0,
  percentage    int not null default 0,
  passed        boolean not null default false,
  -- per-question results: [{"question_id":"…","correct":true,"chosen":"opt_id"}]
  question_results jsonb not null default '[]',
  -- cheating detection reported by client + server heuristics
  cheating_flags jsonb not null default '[]',
  --   e.g. ["tab_switching","devtools","window_blur","answers_too_fast","time_exceeded"]
  cheating_score int not null default 0,
  flagged       boolean not null default false,
  time_spent_sec int,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists idx_quiz_attempts_user on public.quiz_attempts(user_id, quiz_id);
create index if not exists idx_quiz_attempts_flagged
  on public.quiz_attempts (flagged) where flagged = true;

-- Lesson Quick Quiz (migrations/add_lesson_quiz_passes.sql): fast learners
-- prove mastery and bypass the 10-minute study gate. One pass per lesson.
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


-- ============================================================================
-- SECTION 5 — CERTIFICATES & SIGNATURES
-- ============================================================================

create table if not exists public.certificates (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  certificate_number text unique not null,
  -- snapshots taken at issuance (fix_certificates.sql)
  learner_name  text not null default '',
  course_title  text not null default '',
  course_level  text not null default 'beginner',
  duration_weeks int not null default 0,
  issued_at     timestamptz not null default now(),
  completed_at  timestamptz,
  unique (user_id, course_id)
);

-- Backfill (fix_certificates.sql): certificates issued before the column
-- existed get completed_at = issued_at.
update public.certificates
set completed_at = issued_at
where completed_at is null;

create table if not exists public.signatures (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  signature_url text not null,            -- base64 data URL or Supabase storage path
  full_name     text not null default '',
  created_at    timestamptz not null default now(),
  unique (user_id)
);


-- ============================================================================
-- SECTION 6 — SERVICES & SERVICE REQUESTS (marketing site)
-- ============================================================================

create table if not exists public.services (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  title       text not null,
  icon        text not null default 'rocket',
  description text not null,
  features    jsonb not null default '[]',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.service_requests (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  email         text not null,
  company       text,
  service_slug  text references public.services(slug),
  budget_range  text,
  message       text not null,
  status        text not null default 'pending' check (status in ('pending', 'reviewed', 'in_progress', 'completed', 'archived')),
  created_at    timestamptz not null default now()
);


-- ============================================================================
-- SECTION 7 — CHALLENGES, SUBMISSIONS, COINS, HINTS
-- ============================================================================

create table if not exists public.challenges (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid references public.courses(id) on delete set null,
  title         text not null,
  description   text not null default '',
  difficulty    text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  challenge_type text not null default 'javascript'
                 check (challenge_type in ('javascript', 'python', 'html', 'css', 'git', 'linux', 'sql', 'yaml', 'docker', 'markdown', 'nginx')),
  coins_reward  int not null default 10,
  sort_order    int not null default 0,
  expected_output text default '',
  starter_code  text default '',
  is_active     boolean not null default true,
  -- DOM-sandbox grading (migrations/add_test_cases_column.sql):
  -- when test_cases is non-empty the engine runs the submission in a
  -- sandboxed vm + JSDOM and checks each selector/property/expected.
  test_cases    jsonb not null default '[]'::jsonb,
  starter_html  text not null default '',
  -- ordered hint array; filled with challenge-specific hints by
  -- backend/services/hintGenerator.js after seeding
  hints         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_challenges_course on public.challenges(course_id, sort_order);

create table if not exists public.challenge_submissions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  code          text not null default '',
  passed        boolean not null default false,
  submitted_at  timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create table if not exists public.coin_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  amount        int not null,
  reason        text not null default '',
  reference_id  uuid,
  created_at    timestamptz not null default now()
);

-- Hints unlocked per user/challenge, and whether they cost coins or came
-- from the free monthly quota (migrations/add_challenge_hints.sql).
create table if not exists public.challenge_hints_unlocked (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  hint_index   int  not null,
  source       text not null default 'coins' check (source in ('free', 'coins')),
  created_at   timestamptz not null default now(),
  unique (user_id, challenge_id, hint_index)
);

create index if not exists idx_chu_user on public.challenge_hints_unlocked(user_id, challenge_id);

-- Rolling monthly ledger of free hints (5 per calendar month per user).
create table if not exists public.hint_allowance (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  period      text not null,           -- 'YYYY-MM'
  free_used   int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period)
);


-- ============================================================================
-- SECTION 8 — LESSON UNLOCKS, LAB FILES, SUBSCRIPTIONS, PARENT PAYMENTS
-- ============================================================================

-- Coin-locked lessons (fix_database.sql). One row per lockable lesson.
create table if not exists public.lesson_locks (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  coins_required int not null default 50,
  is_free boolean not null default false,
  unique (lesson_id)
);

-- Code Lab file storage (fix_lab_files.sql + quizzes_seed.sql).
create table if not exists public.lab_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size int not null default 0,
  mime_type text not null default 'text/plain',
  language text not null default 'javascript',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lab_files_user ON public.lab_files(user_id, updated_at DESC);

drop trigger if exists update_lab_files_updated_at on public.lab_files;
create trigger update_lab_files_updated_at BEFORE UPDATE ON public.lab_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tiers (fix_database.sql): free | starter | pro | unlimited.
create table if not exists public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_slug text not null default 'free',
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  -- cancel plan (migrations/add_subscription_cancel.sql): cancelling keeps
  -- access until the period ends; resuming clears the flag.
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_subscriptions_user_active
  ON public.user_subscriptions (user_id, is_active);

-- Parent payments (migrations/add_parent_payments.sql): a student shares a
-- reference link; the parent pays; the backend flips status on the webhook.
create table if not exists public.parent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL DEFAULT 'pro',
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  payment_method TEXT,
  reference_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parent_payments_token ON parent_payments(reference_token);
CREATE INDEX IF NOT EXISTS idx_parent_payments_student ON parent_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_status ON parent_payments(status);

CREATE OR REPLACE FUNCTION update_parent_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parent_payments_updated_at ON parent_payments;
CREATE TRIGGER parent_payments_updated_at
  BEFORE UPDATE ON parent_payments
  FOR EACH ROW EXECUTE FUNCTION update_parent_payments_updated_at();


-- ============================================================================
-- SECTION 9 — OBSERVABILITY: ERROR LOGS, SYSTEM LOGS, ADMIN ALERTS (error.sql)
-- ============================================================================
-- error_logs  : every application error. fingerprint groups repeats so the
--               admin UI can collapse "same bug hit 240 users" into one row.
-- system_logs : append-only activity/audit trail (signups, payments, crons).
-- admin_alerts: system-wide notifications for admins, read/unread.

create table if not exists public.error_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  user_email      text,
  contact_email   text,                  -- support contact for this report
  level           text not null default 'error'
                    check (level in ('debug', 'info', 'warning', 'error', 'fatal', 'critical')),
  source          text not null default 'backend'
                    check (source in ('backend', 'frontend', 'worker', 'database', 'cli', 'vscode')),
  error_code      text,
  status_code     int,
  message         text not null,
  stack           text,
  fingerprint     text,
  context         jsonb not null default '{}'::jsonb,
  method          text,
  path            text,
  url             text,
  user_agent      text,
  ip_address      inet,
  request_id      text,
  is_resolved     boolean not null default false,
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  occurrence_count int not null default 1,
  is_client_reported boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

create index if not exists idx_error_logs_created_at on public.error_logs (created_at desc);
create index if not exists idx_error_logs_level on public.error_logs (level, created_at desc);
create index if not exists idx_error_logs_unresolved
  on public.error_logs (is_resolved, created_at desc) where is_resolved = false;
create index if not exists idx_error_logs_user on public.error_logs (user_id, created_at desc);
create index if not exists idx_error_logs_fingerprint on public.error_logs (fingerprint, last_seen_at desc);
create index if not exists idx_error_logs_source on public.error_logs (source, created_at desc);

create table if not exists public.system_logs (
  id          uuid primary key default gen_random_uuid(),
  level       text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  event       text not null,               -- e.g. 'user.signup', 'payment.completed'
  message     text,
  source      text not null default 'backend',
  user_id     uuid references auth.users(id) on delete set null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_system_logs_created_at on public.system_logs (created_at desc);
create index if not exists idx_system_logs_event on public.system_logs (event, created_at desc);
create index if not exists idx_system_logs_level on public.system_logs (level, created_at desc);
create index if not exists idx_system_logs_user on public.system_logs (user_id, created_at desc);

create table if not exists public.admin_alerts (
  id           uuid primary key default gen_random_uuid(),
  type         text not null default 'error'
                 check (type in ('error', 'warning', 'info', 'security', 'payment', 'system')),
  severity     text not null default 'medium'
                 check (severity in ('low', 'medium', 'high', 'critical')),
  title        text not null,
  message      text not null default '',
  link         text,                       -- deep link into the admin UI
  source       text not null default 'backend',
  error_log_id uuid references public.error_logs(id) on delete set null,
  metadata     jsonb not null default '{}'::jsonb,
  is_read      boolean not null default false,
  read_by      uuid references auth.users(id) on delete set null,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_admin_alerts_created_at on public.admin_alerts (created_at desc);
create index if not exists idx_admin_alerts_unread
  on public.admin_alerts (is_read, created_at desc) where is_read = false;
create index if not exists idx_admin_alerts_severity on public.admin_alerts (severity, created_at desc);

drop trigger if exists error_logs_touch_updated_at on public.error_logs;
create trigger error_logs_touch_updated_at
  before update on public.error_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists admin_alerts_touch_updated_at on public.admin_alerts;
create trigger admin_alerts_touch_updated_at
  before update on public.admin_alerts
  for each row execute function public.touch_updated_at();

-- Dedupe helper: upsert an error by fingerprint. If the same fingerprint was
-- seen (unresolved) within the window, bump occurrence_count instead of
-- inserting a new row. Called by the backend via service role.
create or replace function public.record_error(
  p_fingerprint   text,
  p_level         text,
  p_source        text,
  p_message       text,
  p_stack         text default null,
  p_error_code    text default null,
  p_status_code   int  default null,
  p_method        text default null,
  p_path          text default null,
  p_url           text default null,
  p_user_agent    text default null,
  p_ip_address    inet default null,
  p_request_id    text default null,
  p_user_id       uuid default null,
  p_user_email    text default null,
  p_contact_email text default null,
  p_context       jsonb default '{}'::jsonb,
  p_is_client     boolean default false,
  p_window_minutes int default 60
)
returns public.error_logs
language plpgsql
security definer
as $$
declare
  existing public.error_logs;
  inserted public.error_logs;
begin
  if p_fingerprint is not null and not p_is_client then
    select * into existing
    from public.error_logs
    where fingerprint = p_fingerprint
      and is_resolved = false
      and last_seen_at > now() - make_interval(mins => greatest(p_window_minutes, 1))
    order by last_seen_at desc
    limit 1;

    if existing.id is not null then
      update public.error_logs
         set occurrence_count = occurrence_count + 1,
             last_seen_at      = now(),
             status_code       = coalesce(p_status_code, status_code),
             context           = coalesce(p_context, context)
       where id = existing.id
       returning * into existing;
      return existing;
    end if;
  end if;

  insert into public.error_logs (
    user_id, user_email, contact_email,
    level, source, error_code, status_code,
    message, stack, fingerprint, context,
    method, path, url, user_agent, ip_address, request_id,
    occurrence_count, is_client_reported
  ) values (
    p_user_id, p_user_email, p_contact_email,
    coalesce(p_level, 'error'), coalesce(p_source, 'backend'), p_error_code, p_status_code,
    p_message, p_stack, p_fingerprint, coalesce(p_context, '{}'::jsonb),
    p_method, p_path, p_url, p_user_agent, p_ip_address, p_request_id,
    1, coalesce(p_is_client, false)
  )
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.record_error(
  text, text, text, text, text, text, int, text, text, text, text, inet, text,
  uuid, text, text, jsonb, boolean, int
) to service_role;

-- Admin dashboard views
create or replace view public.unresolved_error_summary as
select
  fingerprint,
  max(message)              as sample_message,
  max(level)                as level,
  max(source)               as source,
  max(path)                 as path,
  sum(occurrence_count)     as total_occurrences,
  count(*)                  as distinct_reports,
  min(created_at)           as first_seen_at,
  max(last_seen_at)         as last_seen_at
from public.error_logs
where is_resolved = false
group by fingerprint
order by max(last_seen_at) desc;

create or replace view public.unread_admin_alerts as
select severity, type, count(*) as total
from public.admin_alerts
where is_read = false
group by severity, type
order by total desc;


-- ============================================================================
-- SECTION 10 — SECURITY MONITORING (migrations/add_security_events.sql)
-- ============================================================================
-- security_events: one row per detected attack/abuse. IP addresses are only
-- ever stored HMAC-hashed (ip_hash) + masked preview ('102.89.*.*') — never
-- raw. ip_blocklist: auto-block with escalating expiry; blocked_until makes
-- the table self-cleaning.

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,              -- payload_suspicious | xss_attempt | sqli_attempt | path_probe | rate_limit_abuse | host_spoof | auth_abuse
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_hash TEXT,                          -- HMAC-SHA256 (peppered), 32 hex chars — never raw IPs
  ip_preview TEXT,                       -- e.g. '102.89.*.*' — enough to eyeball, not enough to identify
  user_id UUID,                          -- set when the attacker IS a logged-in user
  user_email_masked TEXT,                -- 'a***@gmail.com'
  path TEXT,
  method TEXT,
  matched_pattern TEXT,                  -- which rule fired
  snippet TEXT,                          -- truncated evidence (sanitized, 200 chars)
  user_agent TEXT,
  request_id TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_hash);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

CREATE TABLE IF NOT EXISTS ip_blocklist (
  ip_hash TEXT PRIMARY KEY,
  ip_preview TEXT,
  reason TEXT NOT NULL,
  strikes INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 11 — AI REVIEW PIPELINE (migrations/add_ai_reviews.sql + superseded)
-- ============================================================================
-- ai_reviews       : every AI-generated marking is stored PENDING; nothing
--                    touches the student's record until an admin approves.
-- ai_model_versions: audit trail of offline training runs (inspectable +
--                    revertable "trained model").

create table if not exists public.ai_reviews (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  challenge_id   uuid references public.challenges(id) on delete cascade,
  submission_id  uuid,
  verdict        text not null default 'needs_review'
                 check (verdict in ('pass', 'fail', 'needs_review')),
  score          int not null default 0,
  quality        text not null default 'beginner'
                 check (quality in ('beginner', 'developing', 'proficient')),
  review         jsonb not null default '{}'::jsonb,
  shape_signature text not null default '',
  status         text not null default 'pending',
  reviewed_by    uuid references public.profiles(id),
  decided_at     timestamptz,
  admin_note     text not null default '',
  engine_version text not null default '1percent-local-engine-v1',
  model_trained_at timestamptz,
  created_at     timestamptz not null default now(),
  -- original CHECK allowed pending/approved/rejected/applied; the
  -- allow_superseded_ai_reviews migration added 'superseded' (older PENDING
  -- reviews are marked superseded when the student resubmits). Enforced as
  -- a standalone constraint so it can be replaced without a rewrite:
  CONSTRAINT ai_reviews_status_check
    CHECK (status in ('pending', 'approved', 'rejected', 'applied', 'superseded'))
);

create index if not exists idx_ai_reviews_status on public.ai_reviews(status, created_at);
create index if not exists idx_ai_reviews_user on public.ai_reviews(user_id);
create index if not exists idx_ai_reviews_challenge on public.ai_reviews(challenge_id);

create table if not exists public.ai_model_versions (
  id             uuid primary key default uuid_generate_v4(),
  version        int not null,
  trained_at     timestamptz not null default now(),
  trained_by     uuid references public.profiles(id),
  stats          jsonb not null default '{}'::jsonb,
  notes          text not null default ''
);


-- ============================================================================
-- SECTION 12 — COMMUNITY & ENGAGEMENT
-- notifications, ratings (add_notifications_and_ratings.sql)
-- student_testimonials (add_student_testimonials.sql)
-- leaderboard snapshots (add_leaderboard_movement.sql)
-- mentor program (add_mentor_program.sql)
-- robotics club (add_robotics_club.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'content', 'ui', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)              -- one rating per user per category
);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_category ON ratings(category);

CREATE OR REPLACE FUNCTION update_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_updated_at ON ratings;
CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_ratings_updated_at();

-- Student testimonials: submit → admin approves → public.
create table if not exists public.student_testimonials (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default '',
  role        text not null default '',            -- e.g. "Full-stack track, Kigali"
  quote       text not null check (char_length(quote) between 30 and 600),
  rating      int not null default 5 check (rating between 1 and 5),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  unique (user_id, status)
);

create index if not exists idx_student_testimonials_status
  on public.student_testimonials (status, created_at desc);

create or replace function public.set_testimonial_approved_at()
returns trigger as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.approved_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_testimonial_approved_at on public.student_testimonials;
create trigger trg_testimonial_approved_at
  before update on public.student_testimonials
  for each row execute function public.set_testimonial_approved_at();

-- Leaderboard movement: one snapshot per user per board per UTC day, written
-- by the leaderboard endpoint as a side effect. Movement = current rank vs
-- the most recent snapshot from a PREVIOUS day.
create table if not exists public.leaderboard_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_type text not null default 'coins' check (board_type in ('coins', 'streak')),
  rank int not null,
  score bigint not null default 0,
  snapshot_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (user_id, board_type, snapshot_date)
);

create index if not exists idx_lbrs_lookup
  on public.leaderboard_rank_snapshots (board_type, snapshot_date desc);
create index if not exists idx_lbrs_user
  on public.leaderboard_rank_snapshots (user_id, board_type, snapshot_date desc);

-- Mentor program
create table if not exists public.mentor_assignments (
  id          uuid primary key default uuid_generate_v4(),
  mentor_id   uuid not null references public.profiles(id) on delete cascade,
  learner_id  uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (mentor_id, learner_id)
);

create index if not exists idx_mentor_assignments_mentor
  on public.mentor_assignments(mentor_id);
create index if not exists idx_mentor_assignments_learner
  on public.mentor_assignments(learner_id);

create table if not exists public.mentor_weekly_shares (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete set null,
  title       text not null,
  message     text not null default '',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.mentor_weekly_share_recipients (
  share_id   uuid not null references public.mentor_weekly_shares(id) on delete cascade,
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  read_at    timestamptz,
  primary key (share_id, mentor_id)
);

create index if not exists idx_mwsr_mentor
  on public.mentor_weekly_share_recipients(mentor_id);

-- Robotics club
create table if not exists public.club_schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  district   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  school_id   uuid not null references public.club_schools(id) on delete restrict,
  grade       text,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  joined_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_club_members_school on public.club_members (school_id);
create index if not exists idx_club_members_user on public.club_members (user_id);


-- ============================================================================
-- SECTION 13 — MCP / CLAUDE CONNECTOR
-- student_mcp_tokens  (add_student_mcp_tokens.sql)  legacy paste-tokens
-- mcp_oauth_*         (add_mcp_oauth.sql + add_mcp_oauth_clients.sql)
-- ============================================================================

create table if not exists public.student_mcp_tokens (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token_hash  text not null unique,          -- sha256 hex of the full token
  token_prefix text not null default '',     -- first 12 chars, display only
  label       text not null default 'Claude',
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz,
  unique (user_id)
);

create index if not exists idx_student_mcp_tokens_user
  on public.student_mcp_tokens(user_id);

-- OAuth clients (RFC 7591 dynamic client registration). claude.ai expects
-- registration_endpoint in the server metadata. Public clients
-- (token_endpoint_auth_method='none') + PKCE S256 always mandatory.
create table if not exists public.mcp_oauth_clients (
  id                          uuid primary key default uuid_generate_v4(),
  client_id                   text not null unique,
  client_secret_hash          text,          -- null for public clients
  client_name                 text,
  redirect_uris               text[] not null default '{}',  -- exact-match (RFC 6749 §3.1.2.3)
  grant_types                 text[] not null default '{authorization_code,refresh_token}',
  response_types              text[] not null default '{code}',
  token_endpoint_auth_method  text not null default 'none',  -- 'none' | 'client_secret_post'
  scope                       text not null default 'read',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  revoked_at                  timestamptz
);

create index if not exists idx_mcp_oauth_clients_revoked
  on public.mcp_oauth_clients(revoked_at);

-- Pending authorization codes (single-use, 10-min TTL, PKCE-verified).
create table if not exists public.mcp_oauth_codes (
  id             uuid primary key default uuid_generate_v4(),
  code_hash      text not null unique,       -- sha256 hex of the auth code
  user_id        uuid not null references public.profiles(id) on delete cascade,
  client_id      text not null default 'claude-ai-connector',
  redirect_uri   text,
  scope          text not null default 'read',
  code_challenge text not null,              -- PKCE S256 challenge
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

create index if not exists idx_mcp_oauth_codes_expires
  on public.mcp_oauth_codes(expires_at);

-- Granted tokens. SECURITY: hashes only — plaintext tokens never stored;
-- Claude receives the plaintext exactly once at /token. Refresh tokens
-- rotate on every use. scope may include server-granted 'admin'.
create table if not exists public.mcp_oauth_tokens (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  access_hash   text not null unique,
  refresh_hash  text not null unique,
  scope         text not null default 'read',  -- space-separated: 'read', 'read grade', 'read grade admin'
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  expires_at    timestamptz not null
);

create index if not exists idx_mcp_oauth_tokens_user
  on public.mcp_oauth_tokens(user_id);


-- ============================================================================
-- SECTION 14 — ROW LEVEL SECURITY
-- ============================================================================
-- Pattern: policies for tables a browser client may touch; RLS-on with NO
-- policies (default deny) for backend-only tables. is_admin() is SECURITY
-- DEFINER to avoid the profiles-recursion trap.

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.signatures enable row level security;
alter table public.lab_files enable row level security;
alter table public.challenge_hints_unlocked enable row level security;
alter table public.hint_allowance enable row level security;
alter table public.lesson_quiz_passes enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.ai_model_versions enable row level security;
alter table public.error_logs enable row level security;
alter table public.system_logs enable row level security;
alter table public.admin_alerts enable row level security;
alter table public.student_mcp_tokens enable row level security;
alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.mentor_weekly_shares enable row level security;
alter table public.mentor_weekly_share_recipients enable row level security;
alter table public.club_schools enable row level security;
alter table public.club_members enable row level security;
alter table public.parent_payments enable row level security;
alter table security_events enable row level security;
alter table ip_blocklist enable row level security;
alter table public.leaderboard_rank_snapshots enable row level security;

-- Default-deny: these are backend/service-role-only. RLS is on above and
-- deliberately NO policies exist for them:
--   lesson_locks, user_subscriptions, ip_blocklist, security_events,
--   leaderboard_rank_snapshots, mentor_* (all three), ai_model_versions,
--   mcp_oauth_clients. The frontend reads subscription state via the
--   backend API, never from these tables.

-- ---- profiles ----
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin(auth.uid()));

-- ---- courses / modules / lessons ----
drop policy if exists "Anyone can view published courses" on public.courses;
create policy "Anyone can view published courses" on public.courses for select using (is_published = true);
drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses" on public.courses for all using (public.is_admin(auth.uid()));

drop policy if exists "Anyone can view published modules" on public.modules;
create policy "Anyone can view published modules" on public.modules for select using (is_published = true);
drop policy if exists "Admins can manage modules" on public.modules;
create policy "Admins can manage modules" on public.modules for all using (public.is_admin(auth.uid()));

drop policy if exists "Anyone can view published lessons" on public.lessons;
create policy "Anyone can view published lessons" on public.lessons for select using (is_published = true);
drop policy if exists "Admins can manage lessons" on public.lessons;
create policy "Admins can manage lessons" on public.lessons for all using (public.is_admin(auth.uid()));

-- ---- enrollments ----
drop policy if exists "Users can view own enrollments" on public.enrollments;
create policy "Users can view own enrollments" on public.enrollments for select using (auth.uid() = user_id);
drop policy if exists "Users can enroll themselves" on public.enrollments;
create policy "Users can enroll themselves" on public.enrollments for insert with check (auth.uid() = user_id);
drop policy if exists "Admins can manage enrollments" on public.enrollments;
create policy "Admins can manage enrollments" on public.enrollments for all using (public.is_admin(auth.uid()));

-- ---- lesson progress ----
drop policy if exists "Users can view own progress" on public.lesson_progress;
create policy "Users can view own progress" on public.lesson_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own progress" on public.lesson_progress;
create policy "Users can insert own progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own progress" on public.lesson_progress;
create policy "Users can update own progress" on public.lesson_progress for update using (auth.uid() = user_id);

-- ---- quizzes ----
drop policy if exists "Anyone can view published quizzes" on public.quizzes;
create policy "Anyone can view published quizzes" on public.quizzes for select using (is_published = true);
drop policy if exists "Admins can manage quizzes" on public.quizzes;
create policy "Admins can manage quizzes" on public.quizzes for all using (public.is_admin(auth.uid()));

drop policy if exists "Anyone can view quiz questions" on public.quiz_questions;
create policy "Anyone can view quiz questions" on public.quiz_questions for select using (true);
drop policy if exists "Admins can manage questions" on public.quiz_questions;
create policy "Admins can manage questions" on public.quiz_questions for all using (public.is_admin(auth.uid()));

drop policy if exists "Users can view own attempts" on public.quiz_attempts;
create policy "Users can view own attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
drop policy if exists "Users can create own attempts" on public.quiz_attempts;
create policy "Users can create own attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own lesson quiz passes" on public.lesson_quiz_passes;
create policy "Users can view own lesson quiz passes"
  on public.lesson_quiz_passes for select using (auth.uid() = user_id);

-- ---- certificates ----
drop policy if exists "Users can view own certificates" on public.certificates;
create policy "Users can view own certificates" on public.certificates for select using (auth.uid() = user_id);
drop policy if exists "Anyone can verify certificates" on public.certificates;
create policy "Anyone can verify certificates" on public.certificates for select using (true);

-- ---- services ----
drop policy if exists "Anyone can view active services" on public.services;
create policy "Anyone can view active services" on public.services for select using (is_active = true);
drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services" on public.services for all using (public.is_admin(auth.uid()));

drop policy if exists "Anyone can submit a service request" on public.service_requests;
create policy "Anyone can submit a service request" on public.service_requests for insert with check (true);
drop policy if exists "Admins can view all service requests" on public.service_requests;
create policy "Admins can view all service requests" on public.service_requests for select using (public.is_admin(auth.uid()));

-- ---- challenges / submissions / coins ----
drop policy if exists "Anyone can view active challenges" on public.challenges;
create policy "Anyone can view active challenges" on public.challenges for select using (is_active = true);
drop policy if exists "Admins can manage challenges" on public.challenges;
create policy "Admins can manage challenges" on public.challenges for all using (public.is_admin(auth.uid()));

drop policy if exists "Users can view own submissions" on public.challenge_submissions;
create policy "Users can view own submissions" on public.challenge_submissions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own submissions" on public.challenge_submissions;
create policy "Users can insert own submissions" on public.challenge_submissions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own submissions" on public.challenge_submissions;
create policy "Users can update own submissions" on public.challenge_submissions for update using (auth.uid() = user_id);

drop policy if exists "Users can view own transactions" on public.coin_transactions;
create policy "Users can view own transactions" on public.coin_transactions for select using (auth.uid() = user_id);

drop policy if exists "Users can view own unlocked hints" on public.challenge_hints_unlocked;
create policy "Users can view own unlocked hints" on public.challenge_hints_unlocked
  for select using (auth.uid() = user_id);

drop policy if exists "Users can view own hint allowance" on public.hint_allowance;
create policy "Users can view own hint allowance" on public.hint_allowance
  for select using (auth.uid() = user_id);

-- ---- signatures ----
drop policy if exists "Users can view own signature" on public.signatures;
create policy "Users can view own signature" on public.signatures for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own signature" on public.signatures;
create policy "Users can insert own signature" on public.signatures for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own signature" on public.signatures;
create policy "Users can update own signature" on public.signatures for update using (auth.uid() = user_id);

-- ---- lab files ----
drop policy if exists "Users can view own files" on public.lab_files;
CREATE POLICY "Users can view own files" ON public.lab_files FOR SELECT USING (auth.uid() = user_id);
drop policy if exists "Users can insert own files" on public.lab_files;
CREATE POLICY "Users can insert own files" ON public.lab_files FOR INSERT WITH CHECK (auth.uid() = user_id);
drop policy if exists "Users can update own files" on public.lab_files;
CREATE POLICY "Users can update own files" ON public.lab_files FOR UPDATE USING (auth.uid() = user_id);
drop policy if exists "Users can delete own files" on public.lab_files;
CREATE POLICY "Users can delete own files" ON public.lab_files FOR DELETE USING (auth.uid() = user_id);

-- ---- error/observability (error.sql) ----
drop policy if exists "Admins can view error logs" on public.error_logs;
create policy "Admins can view error logs" on public.error_logs for select using (public.is_admin(auth.uid()));
drop policy if exists "Admins can update error logs" on public.error_logs;
create policy "Admins can update error logs" on public.error_logs for update using (public.is_admin(auth.uid()));
drop policy if exists "Admins can delete error logs" on public.error_logs;
create policy "Admins can delete error logs" on public.error_logs for delete using (public.is_admin(auth.uid()));
drop policy if exists "Anyone can report an error" on public.error_logs;
create policy "Anyone can report an error" on public.error_logs for insert with check (true);

drop policy if exists "Admins can view system logs" on public.system_logs;
create policy "Admins can view system logs" on public.system_logs for select using (public.is_admin(auth.uid()));

drop policy if exists "Admins can view admin alerts" on public.admin_alerts;
create policy "Admins can view admin alerts" on public.admin_alerts for select using (public.is_admin(auth.uid()));
drop policy if exists "Admins can update admin alerts" on public.admin_alerts;
create policy "Admins can update admin alerts" on public.admin_alerts for update using (public.is_admin(auth.uid()));

-- ---- notifications & ratings ----
drop policy if exists "Users can view own notifications" on public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
drop policy if exists "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

drop policy if exists "Anyone can view ratings" on public.ratings;
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);
drop policy if exists "Users can insert own ratings" on public.ratings;
CREATE POLICY "Users can insert own ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
drop policy if exists "Users can update own ratings" on public.ratings;
CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = user_id);

-- ---- testimonials ----
drop policy if exists "Anyone can view approved testimonials" on public.student_testimonials;
create policy "Anyone can view approved testimonials"
  on public.student_testimonials for select using (status = 'approved');
drop policy if exists "Users can insert own pending testimonial" on public.student_testimonials;
create policy "Users can insert own pending testimonial"
  on public.student_testimonials for insert
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Users can view own testimonial" on public.student_testimonials;
create policy "Users can view own testimonial"
  on public.student_testimonials for select using (auth.uid() = user_id);
drop policy if exists "Users can update own pending testimonial" on public.student_testimonials;
create policy "Users can update own pending testimonial"
  on public.student_testimonials for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Users can delete own pending testimonial" on public.student_testimonials;
create policy "Users can delete own pending testimonial"
  on public.student_testimonials for delete
  using (auth.uid() = user_id and status = 'pending');

-- ---- AI reviews: students read own; admins manage ----
drop policy if exists "Students can view own AI reviews" on public.ai_reviews;
create policy "Students can view own AI reviews" on public.ai_reviews
  for select using (auth.uid() = user_id);
drop policy if exists "Admins manage AI reviews" on public.ai_reviews;
create policy "Admins manage AI reviews" on public.ai_reviews
  for all using (public.is_admin(auth.uid()));

-- ---- MCP tokens (owner read-only; management via backend API) ----
drop policy if exists "Users can view own MCP token" on public.student_mcp_tokens;
create policy "Users can view own MCP token"
  on public.student_mcp_tokens for select using (auth.uid() = user_id);

drop policy if exists "Users can view own MCP oauth tokens" on public.mcp_oauth_tokens;
create policy "Users can view own MCP oauth tokens"
  on public.mcp_oauth_tokens for select using (auth.uid() = user_id);

drop policy if exists "Users can view own MCP oauth codes" on public.mcp_oauth_codes;
create policy "Users can view own MCP oauth codes"
  on public.mcp_oauth_codes for select using (auth.uid() = user_id);

-- ---- parent payments ----
drop policy if exists "Students view own payment requests" on public.parent_payments;
CREATE POLICY "Students view own payment requests" ON parent_payments
  FOR SELECT USING (auth.uid() = student_id);
drop policy if exists "Students create payment requests" on public.parent_payments;
CREATE POLICY "Students create payment requests" ON parent_payments
  FOR INSERT WITH CHECK (auth.uid() = student_id);
drop policy if exists "Students update own payment requests" on public.parent_payments;
CREATE POLICY "Students update own payment requests" ON parent_payments
  FOR UPDATE USING (auth.uid() = student_id);
drop policy if exists "Public view by token" on public.parent_payments;
CREATE POLICY "Public view by token" ON parent_payments
  FOR SELECT USING (true);

-- ---- robotics club ----
drop policy if exists "Anyone can view active schools" on public.club_schools;
create policy "Anyone can view active schools"
  on public.club_schools for select using (is_active = true);
drop policy if exists "Users can view own club membership" on public.club_members;
create policy "Users can view own club membership"
  on public.club_members for select using (auth.uid() = user_id);


-- ============================================================================
-- SECTION 15 — TERMS & COOKIE CONSENT (from supabase_schema.sql)
-- ============================================================================

create table if not exists public.terms_acceptance (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete set null,
  ip_address    inet,
  policy_version text not null default '1.0',
  accepted_at   timestamptz not null default now()
);

create table if not exists public.cookie_consents (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete set null,
  ip_address    inet,
  analytics     boolean not null default false,
  marketing     boolean not null default false,
  accepted_at   timestamptz not null default now()
);

alter table public.terms_acceptance enable row level security;
alter table public.cookie_consents enable row level security;

drop policy if exists "Anyone can log terms acceptance" on public.terms_acceptance;
create policy "Anyone can log terms acceptance" on public.terms_acceptance for insert with check (true);
drop policy if exists "Anyone can log cookie consent" on public.cookie_consents;
create policy "Anyone can log cookie consent" on public.cookie_consents for insert with check (true);


-- ============================================================================
-- SECTION 16 — SEED: 15 CORE COURSES
-- ============================================================================

insert into public.courses (slug, title, description, icon, thumbnail_url, level, duration_weeks, is_published, sort_order) values
('programming-fundamentals',     'Programming Fundamentals',       'Master core programming concepts — variables, control flow, functions, data structures, and problem-solving mindset.',        'code',      'course-thumbnails/programming-fundamentals.jpg', 'beginner',     4, true, 1),
('git-github',                   'Git & GitHub',                    'Version control mastery — branching, merging, pull requests, collaborative workflows, and open-source contribution.',       'github',    'course-thumbnails/git-github.jpg',                'beginner',     3, true, 2),
('command-line-linux',           'Command Line / Linux Basics',     'Navigate the terminal like a pro — file systems, shell scripting, permissions, and server management.',                     'terminal',  'course-thumbnails/command-line-linux.jpg',        'beginner',     3, true, 3),
('backend-development',          'Backend Development',             'Build robust APIs with Node.js, Express, authentication, databases, and production deployment.',                            'package',   'course-thumbnails/backend-development.jpg',       'intermediate', 6, true, 4),
('frontend-development',         'Frontend Development',            'Build modern UIs with React, component design, state management, and responsive design patterns.',                           'laptop',    'course-thumbnails/frontend-development.jpg',      'intermediate', 6, true, 5),
('databases',                    'Databases (SQL + NoSQL)',         'Master PostgreSQL, MongoDB, data modeling, migrations, query optimization, and ORMs.',                                      'book-open', 'course-thumbnails/databases.jpg',                 'intermediate', 5, true, 6),
('auth-security',                'Authentication & Security Fundamentals', 'JWT, sessions, OAuth2, password hashing, OWASP Top 10, XSS, CSRF, and secure coding practices.',                     'shield',    'course-thumbnails/auth-security.jpg',             'intermediate', 4, true, 7),
('system-design',                'System Design Basics',            'Architect scalable systems — load balancing, caching, databases, microservices, and trade-off analysis.',                  'target',    'course-thumbnails/system-design.jpg',             'advanced',     5, true, 8),
('testing-debugging',            'Testing & Debugging Discipline',  'Unit tests, integration tests, TDD, debugging techniques, coverage, and CI/CD test pipelines.',                              'flask',     'course-thumbnails/testing-debugging.jpg',         'intermediate', 4, true, 9),
('devops-basics',                'DevOps Basics',                   'Docker, CI/CD, cloud deployment, monitoring, logging, and infrastructure as code.',                                         'cloud',     'course-thumbnails/devops-basics.jpg',             'intermediate', 4, true, 10),
('ai-coding-tools',              'Working with AI Coding Tools Properly', 'Prompt engineering for code, AI pair programming, code review with AI, and knowing when NOT to use AI.',              'brain',     'course-thumbnails/ai-coding-tools.jpg',           'intermediate', 3, true, 11),
('capstone-project',             'Capstone: Build and Ship a Real Portfolio Project', 'Plan, build, test, and deploy a production-quality application from scratch. Your portfolio centerpiece.',      'trophy',    'course-thumbnails/capstone-project.jpg',          'advanced',     6, true, 12),
('reading-codebases',            'Reading and Contributing to Existing Codebases', 'Navigate large codebases, understand architecture, write good PRs, and contribute to open source effectively.', 'file-check','course-thumbnails/reading-codebases.jpg',         'intermediate', 3, true, 13),
('technical-communication',      'Technical Communication',         'Write clear documentation, technical blog posts, README files, and communicate complex ideas simply.',                       'mail',      'course-thumbnails/technical-communication.jpg',   'beginner',     2, true, 14),
('problem-solving',              'Problem-Solving Under Constraints', 'Break down problems, work within time/budget limits, prioritize effectively, and ship under pressure.',                    'zap',       'course-thumbnails/problem-solving.jpg',           'intermediate', 3, true, 15)
on conflict (slug) do nothing;

-- Seed: sample services
insert into public.services (slug, title, icon, description, features) values
('web-development',   'Web Development',     'globe',      'Full-stack web apps built with modern frameworks.', '["React / Next.js", "Node.js / Express", "PostgreSQL / Supabase", "REST & GraphQL APIs"]'),
('mobile-apps',       'Mobile Applications', 'smartphone', 'Cross-platform mobile apps for iOS and Android.', '["React Native / Flutter", "Push Notifications", "Offline-first Architecture", "App Store Deployment"]'),
('ai-automation',     'AI & Automation',     'brain',      'Intelligent agents, workflow automation, and ML pipelines.', '["Custom AI Agents", "NLP & Computer Vision", "Workflow Automation", "Data Pipelines"]'),
('cybersecurity',     'Cybersecurity',       'shield',     'Offensive testing, hardening, and incident response.', '["Penetration Testing", "Security Auditing", "Hardening & Patching", "Incident Response"]'),
('iot-embedded',      'IoT & Embedded',      'plug',       'Hardware-software integration with real devices.', '["ESP32 / Arduino", "Sensor Networks", "MQTT & Real-time Dashboards", "Digital Twins"]'),
('ui-ux-design',      'UI/UX Design',        'palette',    'User research, wireframing, and polished interfaces.', '["User Research", "Wireframes & Prototypes", "Design Systems", "Figma Delivery"]')
on conflict (slug) do nothing;

-- Seed: default MCP OAuth client (public; PKCE always mandatory)
insert into public.mcp_oauth_clients
  (client_id, client_name, redirect_uris, token_endpoint_auth_method, scope)
values
  ('claude-ai-connector', 'Claude AI (built-in)', '{}', 'none', 'read grade')
on conflict (client_id) do nothing;

-- Seed: robotics club schools
insert into public.club_schools (name, district)
values ('SOS Technical High School', 'Kigali')
on conflict (name) do nothing;

-- Seed: generic hint fillers for challenges that have none. ⚠️ After running
-- this file, run backend/scripts fix_challenge_hints (hintGenerator.js) to
-- replace these with challenge-specific hints.
update public.challenges
set hints = jsonb_build_array(
  'Re-read the task carefully and identify exactly what output or behavior is expected.',
  'Break the problem into small steps and solve one step at a time.',
  'Check your syntax: variable names, brackets, and quotes must match exactly.'
)
where coalesce(jsonb_array_length(hints), 0) = 0;


-- ============================================================================
-- SECTION 17 — SEED: END-OF-COURSE QUIZZES (15 quizzes, 75 questions)
-- From quizzes_seed.sql. Each INSERT is guarded with NOT EXISTS so re-runs
-- never duplicate.
-- ============================================================================

-- 1. Programming Fundamentals
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Programming Fundamentals — End of Course Quiz',
  'Test your knowledge of variables, control flow, functions, and data structures.',
  70, true
FROM public.courses c WHERE c.slug = 'programming-fundamentals'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Programming Fundamentals — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the correct way to declare a constant in modern JavaScript?',
    '[{"id":"a","text":"var x = 5"},{"id":"b","text":"const x = 5"},{"id":"c","text":"let x = 5"},{"id":"d","text":"define x = 5"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which data structure uses FIFO (First In, First Out)?',
    '[{"id":"a","text":"Stack"},{"id":"b","text":"Queue"},{"id":"c","text":"Tree"},{"id":"d","text":"Graph"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does the "===" operator check in JavaScript?',
    '[{"id":"a","text":"Value only"},{"id":"b","text":"Type only"},{"id":"c","text":"Value and type"},{"id":"d","text":"Reference equality"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'Which of these is NOT a valid JavaScript data type?',
    '[{"id":"a","text":"undefined"},{"id":"b","text":"boolean"},{"id":"c","text":"float"},{"id":"d","text":"symbol"}]',
    'c', 4, 1),
  (uuid_generate_v4(), qid, 'What is recursion in programming?',
    '[{"id":"a","text":"A loop that never ends"},{"id":"b","text":"A function that calls itself"},{"id":"c","text":"A type of variable"},{"id":"d","text":"A sorting algorithm"}]',
    'b', 5, 1);
END $$;

-- 2. Git & GitHub
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Git & GitHub — End of Course Quiz',
  'Test your version control knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'git-github'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Git & GitHub — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does "git clone" do?',
    '[{"id":"a","text":"Creates a new repository"},{"id":"b","text":"Copies a remote repository to your machine"},{"id":"c","text":"Deletes a branch"},{"id":"d","text":"Merges two branches"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which command stages changes for the next commit?',
    '[{"id":"a","text":"git push"},{"id":"b","text":"git commit"},{"id":"c","text":"git add"},{"id":"d","text":"git stash"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is a pull request?',
    '[{"id":"a","text":"A command to pull code"},{"id":"b","text":"A request to merge changes into a branch"},{"id":"c","text":"A way to delete a branch"},{"id":"d","text":"A Git configuration file"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'How do you create a new branch in Git?',
    '[{"id":"a","text":"git branch feature-x"},{"id":"b","text":"git new branch feature-x"},{"id":"c","text":"git create feature-x"},{"id":"d","text":"git switch --new feature-x"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What does "git merge" do?',
    '[{"id":"a","text":"Deletes a branch"},{"id":"b","text":"Combines changes from two branches"},{"id":"c","text":"Reverts to a previous commit"},{"id":"d","text":"Stashes changes"}]',
    'b', 5, 1);
END $$;

-- 3. Command Line / Linux Basics
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Command Line / Linux — End of Course Quiz',
  'Test your terminal and shell knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'command-line-linux'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Command Line / Linux — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'Which command lists files in a directory?',
    '[{"id":"a","text":"dir"},{"id":"b","text":"ls"},{"id":"c","text":"list"},{"id":"d","text":"show"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does "chmod 755 file.sh" do?',
    '[{"id":"a","text":"Deletes the file"},{"id":"b","text":"Makes it executable for owner, readable by all"},{"id":"c","text":"Copies the file"},{"id":"d","text":"Renames the file"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Which command changes the current directory?',
    '[{"id":"a","text":"dir"},{"id":"b","text":"mov"},{"id":"c","text":"cd"},{"id":"d","text":"change"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'What does the pipe operator "|" do?',
    '[{"id":"a","text":"Redirects output to a file"},{"id":"b","text":"Sends output of one command as input to another"},{"id":"c","text":"Runs two commands in parallel"},{"id":"d","text":"Deletes a file"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'Which command searches for text within files?',
    '[{"id":"a","text":"find"},{"id":"b","text":"search"},{"id":"c","text":"grep"},{"id":"d","text":"locate"}]',
    'c', 5, 1);
END $$;

-- 4. Backend Development
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Backend Development — End of Course Quiz',
  'Test your API, server, and database knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'backend-development'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Backend Development — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does REST stand for in API design?',
    '[{"id":"a","text":"Remote Execution Standard Transfer"},{"id":"b","text":"Representational State Transfer"},{"id":"c","text":"Resource Encoding Standard Transport"},{"id":"d","text":"Rapid Exchange Service Thread"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which HTTP method is used to create a new resource?',
    '[{"id":"a","text":"GET"},{"id":"b","text":"PUT"},{"id":"c","text":"POST"},{"id":"d","text":"DELETE"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is middleware in Express.js?',
    '[{"id":"a","text":"A database query layer"},{"id":"b","text":"Functions that run between request and response"},{"id":"c","text":"A frontend template engine"},{"id":"d","text":"A type of HTTP header"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What status code indicates a resource was successfully created?',
    '[{"id":"a","text":"200"},{"id":"b","text":"201"},{"id":"c","text":"204"},{"id":"d","text":"301"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What does JWT stand for?',
    '[{"id":"a","text":"Java Web Token"},{"id":"b","text":"JSON Web Token"},{"id":"c","text":"JavaScript Wire Transfer"},{"id":"d","text":"Joint Web Token"}]',
    'b', 5, 1);
END $$;

-- 5. Frontend Development
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Frontend Development — End of Course Quiz',
  'Test your UI, React, and browser knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'frontend-development'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Frontend Development — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the virtual DOM in React?',
    '[{"id":"a","text":"A copy of the real DOM kept in memory"},{"id":"b","text":"A browser API"},{"id":"c","text":"A CSS framework"},{"id":"d","text":"A database"}]',
    'a', 1, 1),
  (uuid_generate_v4(), qid, 'Which hook is used for side effects in React?',
    '[{"id":"a","text":"useState"},{"id":"b","text":"useEffect"},{"id":"c","text":"useRef"},{"id":"d","text":"useMemo"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does CSS Grid use for layout?',
    '[{"id":"a","text":"Flex direction"},{"id":"b","text":"Rows and columns"},{"id":"c","text":"Float property"},{"id":"d","text":"Table layout"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a "controlled component" in React?',
    '[{"id":"a","text":"A component with no state"},{"id":"b","text":"A component whose value is driven by React state"},{"id":"c","text":"A component that uses Redux"},{"id":"d","text":"A component with error boundaries"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'Which HTML element is used for the main content of a page?',
    '[{"id":"a","text":"<div>"},{"id":"b","text":"<section>"},{"id":"c","text":"<main>"},{"id":"d","text":"<article>"}]',
    'c', 5, 1);
END $$;

-- 6. Databases
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Databases — End of Course Quiz',
  'Test your SQL, NoSQL, and data modeling knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'databases'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Databases — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does SQL stand for?',
    '[{"id":"a","text":"Simple Query Language"},{"id":"b","text":"Structured Query Language"},{"id":"c","text":"Standard Query Logic"},{"id":"d","text":"System Query Language"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which SQL clause is used to filter rows?',
    '[{"id":"a","text":"GROUP BY"},{"id":"b","text":"ORDER BY"},{"id":"c","text":"WHERE"},{"id":"d","text":"HAVING"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is a primary key?',
    '[{"id":"a","text":"A column that can have NULL values"},{"id":"b","text":"A unique identifier for each row in a table"},{"id":"c","text":"A foreign reference to another table"},{"id":"d","text":"An index for fast queries"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What type of join returns all rows from both tables?',
    '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"LEFT JOIN"},{"id":"c","text":"FULL OUTER JOIN"},{"id":"d","text":"CROSS JOIN"}]',
    'c', 4, 1),
  (uuid_generate_v4(), qid, 'In MongoDB, what is a "document"?',
    '[{"id":"a","text":"A file on disk"},{"id":"b","text":"A JSON-like record in a collection"},{"id":"c","text":"A SQL row"},{"id":"d","text":"An index entry"}]',
    'b', 5, 1);
END $$;

-- 7. Auth & Security
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Auth & Security — End of Course Quiz',
  'Test your knowledge of authentication, JWT, and security best practices.',
  70, true
FROM public.courses c WHERE c.slug = 'auth-security'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Auth & Security — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the purpose of password hashing?',
    '[{"id":"a","text":"To make passwords shorter"},{"id":"b","text":"To store passwords securely so they cannot be reversed"},{"id":"c","text":"To compress password data"},{"id":"d","text":"To encrypt network traffic"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does CSRF stand for?',
    '[{"id":"a","text":"Cross-Site Request Forgery"},{"id":"b","text":"Cross-Server Resource Fetching"},{"id":"c","text":"Client-Side Request Forwarding"},{"id":"d","text":"Cross-Site Response Forgery"}]',
    'a', 2, 1),
  (uuid_generate_v4(), qid, 'Which header helps prevent XSS attacks?',
    '[{"id":"a","text":"Content-Type"},{"id":"b","text":"X-Frame-Options"},{"id":"c","text":"Content-Security-Policy"},{"id":"d","text":"Cache-Control"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'What is a JWT composed of?',
    '[{"id":"a","text":"Username and password"},{"id":"b","text":"Header, payload, and signature"},{"id":"c","text":"API key and secret"},{"id":"d","text":"Session ID and cookie"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the principle of least privilege?',
    '[{"id":"a","text":"Give all users admin access"},{"id":"b","text":"Only grant the minimum permissions needed to perform a task"},{"id":"c","text":"Use the cheapest hosting plan"},{"id":"d","text":"Encrypt all database columns"}]',
    'b', 5, 1);
END $$;

-- 8. System Design
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'System Design — End of Course Quiz',
  'Test your architecture and scalability knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'system-design'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'System Design — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is a load balancer used for?',
    '[{"id":"a","text":"Storing user sessions"},{"id":"b","text":"Distributing incoming traffic across multiple servers"},{"id":"c","text":"Compressing database queries"},{"id":"d","text":"Encrypting API keys"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is horizontal scaling?',
    '[{"id":"a","text":"Adding more RAM to a single server"},{"id":"b","text":"Adding more servers to handle load"},{"id":"c","text":"Upgrading the CPU"},{"id":"d","text":"Moving to a faster hard drive"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What is caching used for?',
    '[{"id":"a","text":"Storing permanent data"},{"id":"b","text":"Storing frequently accessed data temporarily for faster access"},{"id":"c","text":"Compressing files"},{"id":"d","text":"Running background jobs"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is the CAP theorem about?',
    '[{"id":"a","text":"CPU, Accuracy, Performance"},{"id":"b","text":"Consistency, Availability, Partition tolerance"},{"id":"c","text":"Concurrency, Authentication, Privacy"},{"id":"d","text":"Capacity, Automation, Protection"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is a CDN?',
    '[{"id":"a","text":"A database system"},{"id":"b","text":"Content Delivery Network — serves content from edge locations"},{"id":"c","text":"A code deployment tool"},{"id":"d","text":"A CI/CD pipeline"}]',
    'b', 5, 1);
END $$;

-- 9. Testing & Debugging
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Testing & Debugging — End of Course Quiz',
  'Test your TDD, unit testing, and debugging knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'testing-debugging'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Testing & Debugging — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does TDD stand for?',
    '[{"id":"a","text":"Test-Driven Development"},{"id":"b","text":"Total Debug Discipline"},{"id":"c","text":"Technical Design Document"},{"id":"d","text":"Test Deployment Dashboard"}]',
    'a', 1, 1),
  (uuid_generate_v4(), qid, 'What is a unit test?',
    '[{"id":"a","text":"A test that runs the entire application"},{"id":"b","text":"A test that verifies a single function or unit of code"},{"id":"c","text":"A test that checks the database"},{"id":"d","text":"A test that measures performance"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does the "AAA" pattern stand for in testing?',
    '[{"id":"a","text":"Assert, Act, Arrange"},{"id":"b","text":"Arrange, Act, Assert"},{"id":"c","text":"Analyze, Apply, Approve"},{"id":"d","text":"Attach, Assert, Accept"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a mock in testing?',
    '[{"id":"a","text":"A fake implementation of a dependency used in tests"},{"id":"b","text":"A production database"},{"id":"c","text":"A deployment script"},{"id":"d","text":"A type of HTTP request"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What is code coverage?',
    '[{"id":"a","text":"The number of lines of code"},{"id":"b","text":"The percentage of code exercised by tests"},{"id":"c","text":"The amount of documentation"},{"id":"d","text":"The number of dependencies"}]',
    'b', 5, 1);
END $$;

-- 10. DevOps Basics
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'DevOps Basics — End of Course Quiz',
  'Test your Docker, CI/CD, and deployment knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'devops-basics'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'DevOps Basics — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is Docker?',
    '[{"id":"a","text":"A programming language"},{"id":"b","text":"A containerization platform"},{"id":"c","text":"A database management tool"},{"id":"d","text":"A frontend framework"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does CI/CD stand for?',
    '[{"id":"a","text":"Code Integration / Code Deployment"},{"id":"b","text":"Continuous Integration / Continuous Deployment"},{"id":"c","text":"Central Interface / Central Database"},{"id":"d","text":"Continuous Inspection / Continuous Debugging"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What is Infrastructure as Code (IaC)?',
    '[{"id":"a","text":"Writing documentation for infrastructure"},{"id":"b","text":"Managing infrastructure through machine-readable configuration files"},{"id":"c","text":"A programming paradigm for databases"},{"id":"d","text":"A type of cloud hosting"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a Dockerfile?',
    '[{"id":"a","text":"A file that stores container data"},{"id":"b","text":"A text file with instructions to build a Docker image"},{"id":"c","text":"A database schema file"},{"id":"d","text":"A deployment manifest"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the purpose of a health check in deployment?',
    '[{"id":"a","text":"To test user passwords"},{"id":"b","text":"To verify that a service is running and responsive"},{"id":"c","text":"To check database backups"},{"id":"d","text":"To monitor network bandwidth"}]',
    'b', 5, 1);
END $$;

-- 11. AI Coding Tools
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'AI Coding Tools — End of Course Quiz',
  'Test your prompt engineering and AI-assisted coding knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'ai-coding-tools'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'AI Coding Tools — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is prompt engineering?',
    '[{"id":"a","text":"Writing code in a new language"},{"id":"b","text":"Crafting effective inputs to get desired outputs from AI models"},{"id":"c","text":"Building AI hardware"},{"id":"d","text":"Training a neural network from scratch"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Why should you review AI-generated code before using it?',
    '[{"id":"a","text":"AI code is always wrong"},{"id":"b","text":"AI may introduce bugs, security issues, or incorrect logic"},{"id":"c","text":"AI cannot write code"},{"id":"d","text":"Review is not necessary"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Which is a best practice when using AI coding assistants?',
    '[{"id":"a","text":"Accept all suggestions without reviewing"},{"id":"b","text":"Provide clear context and constraints in your prompts"},{"id":"c","text":"Use AI to replace all testing"},{"id":"d","text":"Never ask follow-up questions"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is AI pair programming?',
    '[{"id":"a","text":"Two developers sharing one keyboard"},{"id":"b","text":"Using an AI tool alongside a human developer for collaborative coding"},{"id":"c","text":"Having AI write all the code automatically"},{"id":"d","text":"Running AI tests on production servers"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'When should you NOT use AI for coding?',
    '[{"id":"a","text":"For boilerplate code"},{"id":"b","text":"For security-critical code without thorough review"},{"id":"c","text":"For documentation"},{"id":"d","text":"For refactoring"}]',
    'b', 5, 1);
END $$;

-- 12. Capstone Project
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Capstone Project — End of Course Quiz',
  'Test your project planning, build, and deployment knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'capstone-project'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Capstone Project — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What should you do first when starting a capstone project?',
    '[{"id":"a","text":"Start coding immediately"},{"id":"b","text":"Define requirements, plan architecture, and set up version control"},{"id":"c","text":"Choose the most complex technology stack"},{"id":"d","text":"Deploy to production on day one"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is the purpose of a project README?',
    '[{"id":"a","text":"To store API keys"},{"id":"b","text":"To document what the project does, how to set it up, and how to run it"},{"id":"c","text":"To list all dependencies"},{"id":"d","text":"To hold environment variables"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Why is a portfolio project important?',
    '[{"id":"a","text":"It looks nice on social media"},{"id":"b","text":"It demonstrates real-world skills to employers"},{"id":"c","text":"It replaces a resume"},{"id":"d","text":"It is required by law"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What should a production deployment include?',
    '[{"id":"a","text":"console.log statements"},{"id":"b","text":"Error handling, logging, environment config, and security headers"},{"id":"c","text":"Only the frontend code"},{"id":"d","text":"Hardcoded API keys"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'How should you handle secrets in a deployed application?',
    '[{"id":"a","text":"Commit them to Git"},{"id":"b","text":"Use environment variables and never expose them in client-side code"},{"id":"c","text":"Store them in localStorage"},{"id":"d","text":"Hardcode them in the source code"}]',
    'b', 5, 1);
END $$;

-- 13. Reading Codebases
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Reading Codebases — End of Course Quiz',
  'Test your code navigation and open-source contribution knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'reading-codebases'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Reading Codebases — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the first step when joining an existing codebase?',
    '[{"id":"a","text":"Rewrite everything"},{"id":"b","text":"Read the README, run the app, and understand the project structure"},{"id":"c","text":"Delete old code"},{"id":"d","text":"Create new branches immediately"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is a good way to understand how a function works?',
    '[{"id":"a","text":"Guess by its name"},{"id":"b","text":"Read its implementation, check callers, and write a test"},{"id":"c","text":"Delete it and see what breaks"},{"id":"d","text":"Ask ChatGPT to explain it"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What makes a good pull request?',
    '[{"id":"a","text":"Changes to 50+ files at once"},{"id":"b","text":"Small, focused changes with clear description and tests"},{"id":"c","text":"No description needed"},{"id":"d","text":"Renaming files without logic changes"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'How should you approach contributing to open source?',
    '[{"id":"a","text":"Start with small, well-defined issues"},{"id":"b","text":"Immediately refactor the entire project"},{"id":"c","text":"Only contribute to projects you built"},{"id":"d","text":"Skip reading contributing guidelines"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What does "git blame" show?',
    '[{"id":"a","text":"Who committed each line of a file"},{"id":"b","text":"The git configuration"},{"id":"c","text":"Merge conflicts"},{"id":"d","text":"Repository statistics"}]',
    'a', 5, 1);
END $$;

-- 14. Technical Communication
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Technical Communication — End of Course Quiz',
  'Test your documentation and technical writing knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'technical-communication'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Technical Communication — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the purpose of a README file?',
    '[{"id":"a","text":"To store passwords"},{"id":"b","text":"To explain what a project does, how to set it up, and how to use it"},{"id":"c","text":"To hold configuration files"},{"id":"d","text":"To log errors"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Who is the primary audience for technical documentation?',
    '[{"id":"a","text":"The original developer only"},{"id":"b","text":"Other developers and users who need to understand the system"},{"id":"c","text":"Marketing teams"},{"id":"d","text":"Investors only"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What makes technical writing effective?',
    '[{"id":"a","text":"Using as many jargon words as possible"},{"id":"b","text":"Being clear, concise, and well-organized"},{"id":"c","text":"Writing very long paragraphs"},{"id":"d","text":"Avoiding code examples"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What should an API documentation include?',
    '[{"id":"a","text":"Only the endpoint URL"},{"id":"b","text":"Endpoints, parameters, request/response examples, and error codes"},{"id":"c","text":"Just the database schema"},{"id":"d","text":"Only the authentication method"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the difference between a tutorial and a reference guide?',
    '[{"id":"a","text":"There is no difference"},{"id":"b","text":"Tutorials teach concepts step-by-step; reference guides provide detailed API/function info"},{"id":"c","text":"Tutorials are for beginners, reference guides are for experts only"},{"id":"d","text":"Reference guides are shorter than tutorials"}]',
    'b', 5, 1);
END $$;

-- 15. Problem-Solving
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Problem-Solving — End of Course Quiz',
  'Test your analytical thinking and constraint management knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'problem-solving'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Problem-Solving — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = qid) THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the first step in solving a complex problem?',
    '[{"id":"a","text":"Start coding immediately"},{"id":"b","text":"Break it down into smaller, manageable parts"},{"id":"c","text":"Ask someone else to solve it"},{"id":"d","text":"Choose the most complex solution"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is the Pareto Principle (80/20 rule)?',
    '[{"id":"a","text":"80% of bugs come from 20% of code"},{"id":"b","text":"80% of effects come from 20% of causes"},{"id":"c","text":"80% of users use 20% of features"},{"id":"d","text":"All of the above are valid applications"}]',
    'd', 2, 1),
  (uuid_generate_v4(), qid, 'How should you prioritize tasks under tight deadlines?',
    '[{"id":"a","text":"Do everything at once"},{"id":"b","text":"Focus on high-impact, must-have features first"},{"id":"c","text":"Start with the easiest tasks"},{"id":"d","text":"Skip testing to save time"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a "time-box" in project management?',
    '[{"id":"a","text":"A type of clock"},{"id":"b","text":"Setting a fixed maximum time for a task"},{"id":"c","text":"A deadline for the entire project"},{"id":"d","text":"A type of database query"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'When stuck on a problem, what should you do?',
    '[{"id":"a","text":"Give up immediately"},{"id":"b","text":"Take a break, re-read the problem, try a different approach, or ask for help"},{"id":"c","text":"Keep trying the same approach"},{"id":"d","text":"Delete the code and start over"}]',
    'b', 5, 1);
END $$;


-- ============================================================================
-- SECTION 18 — SEED: PILOT COURSE "To-Do App: JS Fundamentals (Testing)"
-- From seed_todo_course.sql + update_challenges_test_cases.sql. Unpublished
-- pilot; the two challenges use DOM test_cases grading. Guarded by slug.
-- ============================================================================

DO $$
DECLARE
  v_course_id UUID;
  v_lesson_id UUID;
  v_ch1 UUID;
  v_ch2 UUID;
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'todo-app-js-fundamentals-testing';
  IF v_course_id IS NULL THEN
    INSERT INTO public.courses (
      slug, title, description, icon, level, duration_weeks, is_published, sort_order
    ) VALUES (
      'todo-app-js-fundamentals-testing',
      'To-Do App: JS Fundamentals (Testing)',
      'Build a to-do app step by step while learning core JavaScript fundamentals: DOM manipulation, loops, event handling, and basic testing mindset.',
      'code', 'beginner', 1, false, 16
    ) RETURNING id INTO v_course_id;
  END IF;

  -- Lesson (skip if it already exists)
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE course_id = v_course_id AND title = 'Checkpoint 1: Render a Task List') THEN
    INSERT INTO public.lessons (
      course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published
    ) VALUES (
      v_course_id,
      'Checkpoint 1: Render a Task List',
      'A page that displays a hardcoded list of tasks — no add/delete yet, just getting data onto the screen.',
      E'## What you''ll build\n\nA page that displays a hardcoded list of tasks — no add/delete yet, just getting data onto the screen.\n\n## Why this matters\n\nEvery dynamic web app does one thing constantly — take data (an array, an object) and turn it into HTML the user can see. This is that skill in its simplest form.\n\n## Concepts\n\n- `document.querySelector()`\n- `document.createElement()`\n- `.textContent`\n- `.appendChild()`\n- Looping with `.forEach()`\n\n## Starter HTML\n\n```html\n<ul id="task-list"></ul>\n```\n\n## Worked example\n\n```javascript\nconst tasks = ["Buy groceries", "Walk the dog", "Finish homework"];\nconst list = document.querySelector("#task-list");\n\ntasks.forEach(function(task) {\n  const li = document.createElement("li");\n  li.textContent = task;\n  list.appendChild(li);\n});\n```\n\n> **Ask:** what happens if you forget `appendChild`?\n>\n> Nothing renders — the element exists in memory but isn''t on the page. This is the #1 beginner bug.\n\n## Modify-this exercise\n\nAdd a 4th task, `"Read a book"`, to the array. Don''t touch the loop. Confirm it renders as a 4th `<li>`.',
      'reading', 15, 1, true
    );
  END IF;

  -- Challenge 1: Fix the missing appendChild
  IF NOT EXISTS (SELECT 1 FROM public.challenges WHERE title = 'Fix the missing appendChild') THEN
    INSERT INTO public.challenges (
      course_id, title, description, difficulty, challenge_type,
      coins_reward, sort_order, starter_code, expected_output, is_active,
      starter_html, test_cases
    ) VALUES (
      v_course_id,
      'Fix the missing appendChild',
      'The list stays empty. The starter code creates <li> elements but never attaches them to the page. Find the missing line and fix it so the tasks appear.',
      'easy', 'javascript', 10, 1,
      E'const tasks = ["Call mom", "Clean room"];\nconst list = document.querySelector("#task-list");\n\ntasks.forEach(function(task) {\n  const li = document.createElement("li");\n  li.textContent = task;\n  // missing something here\n});',
      '', true,
      '<ul id="task-list"></ul>',
      '[{"selector":"#task-list","property":"children.length","expected":2,"description":"Task list should have 2 items"},{"selector":"#task-list li:nth-child(1)","property":"textContent","expected":"Call mom","description":"First item should be Call mom"},{"selector":"#task-list li:nth-child(2)","property":"textContent","expected":"Clean room","description":"Second item should be Clean room"}]'::jsonb
    );
  ELSE
    -- refresh grading data from update_challenges_test_cases.sql
    SELECT id INTO v_ch1 FROM public.challenges WHERE title = 'Fix the missing appendChild';
    UPDATE public.challenges SET
      starter_html = '<ul id="task-list"></ul>',
      test_cases = '[
        {"selector": "#task-list", "property": "children.length", "expected": 2, "description": "Task list should have 2 items"},
        {"selector": "#task-list li:nth-child(1)", "property": "textContent", "expected": "Call mom", "description": "First item should be Call mom"},
        {"selector": "#task-list li:nth-child(2)", "property": "textContent", "expected": "Clean room", "description": "Second item should be Clean room"}
      ]'::jsonb
    WHERE id = v_ch1;
  END IF;

  -- Challenge 2: Render colors from scratch
  IF NOT EXISTS (SELECT 1 FROM public.challenges WHERE title = 'Render colors from scratch') THEN
    INSERT INTO public.challenges (
      course_id, title, description, difficulty, challenge_type,
      coins_reward, sort_order, starter_code, expected_output, is_active,
      starter_html, test_cases
    ) VALUES (
      v_course_id,
      'Render colors from scratch',
      'Given `const colors = ["red", "green", "blue"];` and an empty `<ul id="color-list"></ul>`, write the JavaScript that renders each color as a list item.',
      'easy', 'javascript', 10, 2,
      '', '', true,
      '<ul id="color-list"></ul>',
      '[{"selector":"#color-list","property":"children.length","expected":3,"description":"Color list should have 3 items"},{"selector":"#color-list li:nth-child(1)","property":"textContent","expected":"red","description":"First color should be red"},{"selector":"#color-list li:nth-child(2)","property":"textContent","expected":"green","description":"Second color should be green"},{"selector":"#color-list li:nth-child(3)","property":"textContent","expected":"blue","description":"Third color should be blue"}]'::jsonb
    );
  ELSE
    SELECT id INTO v_ch2 FROM public.challenges WHERE title = 'Render colors from scratch';
    UPDATE public.challenges SET
      starter_html = '<ul id="color-list"></ul>',
      test_cases = '[
        {"selector": "#color-list", "property": "children.length", "expected": 3, "description": "Color list should have 3 items"},
        {"selector": "#color-list li:nth-child(1)", "property": "textContent", "expected": "red", "description": "First color should be red"},
        {"selector": "#color-list li:nth-child(2)", "property": "textContent", "expected": "green", "description": "Second color should be green"},
        {"selector": "#color-list li:nth-child(3)", "property": "textContent", "expected": "blue", "description": "Third color should be blue"}
      ]'::jsonb
    WHERE id = v_ch2;
  END IF;
END $$;


-- ============================================================================
-- SECTION 19 — SEED: PYTHON FOUNDATIONS COURSE
-- From seed_python_course.sql. Published course; 6 lessons; 6 challenges all
-- graded by REAL EXECUTION (python3 runs the code, stdout compared to
-- expected_output). Variables prefixed v_ on purpose (a `course_id` variable
-- collides with the column name inside PL/pgSQL).
-- ============================================================================

DO $$
DECLARE
  v_course_id UUID;
  v_l1 UUID; v_l2 UUID; v_l3 UUID; v_l4 UUID; v_l5 UUID; v_l6 UUID;
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'python-foundations';

  IF v_course_id IS NULL THEN
    -- delete-and-reinsert on re-runs (challenges' FK is ON DELETE SET NULL,
    -- so they must be removed explicitly to avoid orphans)
    DELETE FROM public.challenges
     WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations');
    DELETE FROM public.lessons
     WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations');
    DELETE FROM public.courses WHERE slug = 'python-foundations';

    INSERT INTO public.courses (
      slug, title, description, icon, level, duration_weeks, is_published, sort_order
    ) VALUES (
      'python-foundations',
      'Python Foundations: Think Like a Programmer',
      'Learn real Python from zero: printing, variables, lists, loops, and functions — by writing and running actual code in every lesson.',
      'terminal', 'beginner', 3, true, 20
    ) RETURNING id INTO v_course_id;

    -- Lesson ids are assigned first: PL/pgSQL has no embedded assignment
    -- expressions inside VALUES lists.
    v_l1 := uuid_generate_v4();
    v_l2 := uuid_generate_v4();
    v_l3 := uuid_generate_v4();
    v_l4 := uuid_generate_v4();
    v_l5 := uuid_generate_v4();
    v_l6 := uuid_generate_v4();

    -- Lessons
    INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
    VALUES
    (
      v_l1, v_course_id,
      'Your First Python Program',
      'Make the computer talk: print(), strings, and comments.',
      E'## What you''ll learn\n\nEvery program starts with output. In Python, one function does it all: `print()`.\n\n## Concepts\n\n- `print()` — write text to the screen\n- Strings — text wrapped in quotes (`"like this"`)\n- Comments — lines starting with `#`, ignored by Python\n\n## Worked example\n\n```python\nprint("Hello, world!")\nprint("Python is fun")\n# this line is a comment — Python ignores it\n```\n\nOutput:\n\n```\nHello, world!\nPython is fun\n```\n\n> **Ask:** what happens if you forget the quotes?\n>\n> `print(Hello)` is a **NameError** — Python looks for a *variable* named Hello. Quotes turn it into text.\n\n## Modify-this exercise\n\nAdd a third `print()` that outputs your name. Run it — you just wrote a real program.',
      'reading', 20, 1, true
    ),
    (
      v_l2, v_course_id,
      'Variables & Data Types',
      'Store and label data: numbers, text, booleans, and f-strings.',
      E'## What you''ll learn\n\nVariables give data a name, so programs can remember and reuse values.\n\n## Concepts\n\n- **int** — whole numbers: `19`\n- **float** — decimals: `3.14`\n- **str** — text: `"Amina"`\n- **bool** — `True` / `False`\n- f-strings — inject variables into text: `f"Hi {name}"`\n- `type()` — inspect what kind of value you have\n\n## Worked example\n\n```python\nname = "Amina"\nage = 19\nheight = 1.68\nis_student = True\n\nprint(f"{name} is {age} years old")\nprint(type(age))\n```\n\nOutput:\n\n```\nAmina is 19 years old\n<class ''int''>\n```\n\n> **Ask:** what''s the difference between `print(age)` and `print("age")`?\n>\n> The first prints the **value** (19). The second prints the literal word age — quotes make it text.\n\n## Modify-this exercise\n\nCreate variables for a friend''s name and age, then print one sentence about them using an f-string.',
      'reading', 20, 2, true
    ),
    (
      v_l3, v_course_id,
      'Lists & Dictionaries',
      'Collect many values: ordered lists and labelled dictionaries.',
      E'## What you''ll learn\n\nReal programs handle many values at once. Python''s two workhorses: **lists** (ordered) and **dictionaries** (labelled).\n\n## Concepts\n\n- Lists — `scores = [45, 82, 91]`, index from **0**: `scores[0]`\n- Slicing — `scores[0:2]` gives the first two\n- `len()`, `max()`, `min()`, `sum()` — instant answers\n- Dictionaries — `student = {"name": "Amina", "age": 19}`, read with `student["name"]`\n\n## Worked example\n\n```python\nscores = [45, 82, 67, 91, 73]\nprint(len(scores))   -- 5 items\nprint(max(scores))   -- the biggest\nprint(scores[0])     -- first item\n\nstudent = {"name": "Amina", "track": "Python"}\nprint(student["name"])\n```\n\n> **Ask:** why does `scores[5]` crash when the list has 5 items?\n>\n> Indexing starts at **0**, so valid positions are 0–4. `scores[5]` is an **IndexError**.\n\n## Modify-this exercise\n\nAdd your own score to the list, then print the new length and the new maximum.',
      'reading', 25, 3, true
    ),
    (
      v_l4, v_course_id,
      'Making Decisions: if / elif / else',
      'Branch your code based on conditions.',
      E'## What you''ll learn\n\nPrograms choose paths. `if` runs code only when a condition is true.\n\n## Concepts\n\n- Comparisons — `==`, `!=`, `>`, `<`, `>=`, `<=`\n- `if` / `elif` / `else` — pick one branch\n- **Indentation is the syntax** — 4 spaces define what''s inside the branch\n- Combining conditions — `and`, `or`, `not`\n\n## Worked example\n\n```python\nscore = 78\n\nif score >= 90:\n    print("Grade: A")\nelif score >= 70:\n    print("Grade: B")\nelse:\n    print("Keep practising!")\n```\n\nOutput:\n\n```\nGrade: B\n```\n\n> **Ask:** what happens if you write `if score = 78:`?\n>\n> A **SyntaxError**. One `=` assigns a value; two `==` compares. The #1 beginner bug in every language.\n\n## Modify-this exercise\n\nChange `score` to 95, then to 30, and predict the output **before** running. Add a new branch: scores below 50 print "Grade: F".',
      'reading', 25, 4, true
    ),
    (
      v_l5, v_course_id,
      'Loops: for and while',
      'Repeat work without repeating yourself.',
      E'## What you''ll learn\n\nLoops are how programs do repetitive work: process every item, count, retry.\n\n## Concepts\n\n- `for` + `range(n)` — repeat n times (counts 0 … n−1)\n- Looping a list directly — `for s in scores:`\n- `while` — repeat **while** a condition holds\n- `break` — exit early; `continue` — skip to next round\n\n## Worked example\n\n```python\nfor i in range(3):\n    print(i)\n\nscores = [45, 82, 91]\nfor s in scores:\n    print(s * 2)\n\ncount = 3\nwhile count > 0:\n    print(count)\n    count = count - 1\n```\n\n> **Ask:** what happens if you never decrease `count` in the while loop?\n>\n> An **infinite loop** — the condition stays true forever. Always make sure something moves the loop toward its end.\n\n## Modify-this exercise\n\nPrint the 3× table from 1 to 5 (`3 6 9 12 15`), one number per line, with a `for` loop.',
      'reading', 25, 5, true
    ),
    (
      v_l6, v_course_id,
      'Functions: Build Your Own Tools',
      'Package logic into reusable, testable blocks with def and return.',
      E'## What you''ll learn\n\nFunctions let you name a piece of logic once and use it everywhere.\n\n## Concepts\n\n- `def name(parameters):` — define a function\n- `return` — send a value back to the caller (printing is not returning!)\n- Arguments — the values you pass in\n- Functions run only when **called**: `name(4, 5)`\n\n## Worked example\n\n```python\ndef area(width, height):\n    return width * height\n\nresult = area(4, 5)\nprint(result)          -- 20\nprint(area(7, 2))      -- 14\n```\n\n> **Ask:** what''s the difference between `return` and `print` inside a function?\n>\n> `print` shows a value on screen and gives nothing back. `return` hands the value to whoever called the function — so it can be stored, reused, or tested. Tools should `return`.\n\n## Modify-this exercise\n\nWrite `perimeter(width, height)` and print the perimeter of a 4×5 rectangle. Then print both area and perimeter in one f-string.',
      'reading', 30, 6, true
    );

    -- Challenges (graded by real execution)
    INSERT INTO public.challenges (
      course_id, title, description, difficulty, challenge_type,
      coins_reward, sort_order, starter_code, expected_output, is_active
    ) VALUES
    (
      v_course_id, 'Say hello to Python',
      'Write your first real program: make Python print exactly Hello, Python! (one line).',
      'easy', 'python', 10, 1,
      E'# Print exactly: Hello, Python!\n',
      'Hello, Python!', true
    ),
    (
      v_course_id, 'Your profile card',
      E'The variables name and age are given. Use them to print exactly two lines:\nName: Amina\nAge: 19\nTip: an f-string makes this easy.',
      'easy', 'python', 10, 2,
      E'name = "Amina"\nage = 19\n\n# Print "Name: Amina" then "Age: 19"\n',
      E'Name: Amina\nAge: 19', true
    ),
    (
      v_course_id, 'Top of the leaderboard',
      'Given the scores list, print the highest score (just the number). Try max() — or find it with a loop for extra practice.',
      'easy', 'python', 10, 3,
      E'scores = [45, 82, 67, 91, 73]\n\n# Print the highest score\n',
      '91', true
    ),
    (
      v_course_id, 'Even or odd checker',
      E'The variable number is given. Use an if/else to print exactly: 7 is odd\nIf the number were even your code should print "<number> is even".',
      'easy', 'python', 10, 4,
      E'number = 7\n\n# Print "7 is odd" (or "<number> is even" for even numbers)\n',
      '7 is odd', true
    ),
    (
      v_course_id, 'Countdown',
      'Print a countdown from 3 to 1 (one number per line), then Lift off! on the last line. Use a loop — not four print statements.',
      'medium', 'python', 10, 5,
      E'# Print:\n# 3\n# 2\n# 1\n# Lift off!\n',
      E'3\n2\n1\nLift off!', true
    ),
    (
      v_course_id, 'Area calculator function',
      E'Write a function area(width, height) that RETURNS the rectangle area (don''t print inside it). Then the two given print lines will output 20 and 14.',
      'medium', 'python', 10, 6,
      E'def area(width, height):\n    # return the area, don''t print it\n    pass\n\nprint(area(4, 5))\nprint(area(7, 2))\n',
      E'20\n14', true
    );

    RAISE NOTICE 'Python course seeded: % lessons, % challenges',
      (SELECT count(*) FROM public.lessons WHERE course_id = v_course_id),
      (SELECT count(*) FROM public.challenges WHERE course_id = v_course_id);
  END IF;
END $$;


-- ============================================================================
-- SECTION 20 — SEED: PREMIUM "TECH IN BUSINESS" COURSE (structure)
-- From courses/tech-in-business/seed-tech-in-business.sql. 8 modules × 4-5
-- lessons. The FULL lesson prose lives in
-- courses/tech-in-business/seed-tech-in-business-full.sql (5,600 lines) —
-- load it after this file when you want the complete content, or paste each
-- module's markdown into content_md via the admin dashboard.
-- ============================================================================

DO $$
DECLARE
  v_course_id UUID;
  v_module_idx int;
  v_lesson_in_module int;
  v_modules text[] := ARRAY[
    'Getting Your Business Online',
    'Selling & Payments',
    'Digital Marketing',
    'Operations & Productivity',
    'Data & Decision Making',
    'Security & Safety',
    'Growing with Technology',
    'Working with Tech People'
  ];
  v_lessons_per int[] := ARRAY[5,4,4,4,4,4,4,3];
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'tech-in-business';
  IF v_course_id IS NULL THEN
    INSERT INTO public.courses (
      slug, title, description, icon, level, duration_weeks, is_published, is_premium, sort_order
    ) VALUES (
      'tech-in-business',
      'Tech in Business',
      'A practical course for Rwandan business owners who want to use technology to sell smarter, automate tasks, and grow their business. No jargon, no filler — every lesson teaches something actionable.',
      'briefcase', 'beginner', 18, true, true, 20
    ) RETURNING id INTO v_course_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE course_id = v_course_id) THEN
    FOR v_module_idx IN 1..array_length(v_modules, 1) LOOP
      FOR v_lesson_in_module IN 1..v_lessons_per[v_module_idx] LOOP
        INSERT INTO public.lessons (
          course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published
        ) VALUES (
          v_course_id,
          'Module ' || v_module_idx || ' — Lesson ' || v_lesson_in_module,
          'See module markdown in courses/tech-in-business/ for the full lesson content.',
          'Full content: courses/tech-in-business/ module files (load via admin dashboard or seed-tech-in-business-full.sql).',
          'reading', 25,
          (v_module_idx - 1) * 5 + v_lesson_in_module,
          true
        );
      END LOOP;
    END LOOP;
  END IF;
END $$;


-- Seed: premium course flags (20260909_premium_courses.sql as seeds) —
-- placed here, AFTER tech-in-business is created in SECTION 20, because
-- both statements only match rows that exist.
update public.courses set is_premium = true where slug = 'tech-in-business' and not is_premium;

update public.lessons l
set is_free_preview = true
where is_free_preview = false
  and l.sort_order = (
    select min(l2.sort_order) from public.lessons l2 where l2.course_id = l.course_id
  )
  and exists (select 1 from public.courses c where c.id = l.course_id and c.is_premium = true);

-- ============================================================================
-- SECTION 21 — EXPERT LAYER (optional content upgrade)
-- ============================================================================
-- migrations/upgrade_course_expertise.sql (1,987 lines) appends "The Expert
-- Layer" prose to every published lesson of 5+ courses (ai-coding-tools,
-- auth-security, backend-development, capstone-project, command-line-linux,
-- …). It is pure CONTENT, not schema. Keep it out of this bootstrap file and
-- run it separately AFTER seeding courses+lessons:
--
--   psql -f migrations/upgrade_course_expertise.sql
--
-- (It is re-runnable by design: an existing Expert Layer is replaced, not
-- duplicated, and existing lesson content is only ever appended to.)
-- ============================================================================


-- ============================================================================
-- SECTION 22 — STORAGE LIMITS (reference; used by backend lab file service)
-- ============================================================================
-- Free:      5 files
-- Starter:   5 files
-- Pro:       10 files
-- Unlimited: unlimited (999)


-- ============================================================================
-- DONE. VERIFY YOUR BUILD:
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public' ORDER BY table_name;
-- (expect ~38 tables)
--
-- SELECT slug, is_premium FROM public.courses ORDER BY sort_order;
-- (expect 18 courses: 15 core + todo pilot + python + tech-in-business)
--
-- SELECT count(*) FROM public.quiz_questions;
-- (expect 75)
-- ============================================================================
