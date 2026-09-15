-- ============================================================
-- Mentor Program
-- ============================================================
-- Admins promote users to the mentor role (profiles.role already
-- supports 'mentor' in supabase_schema.sql). A mentor sees the
-- progress of learners assigned to them, and admins can share a
-- weekly course + activity note with every mentor (or one mentor).
--
-- Security model:
--   • role changes happen ONLY through the admin API
--     (PUT /api/admin/users/:id/role) — no client-side table grants.
--   • mentor_assignments / mentor_weekly_shares: RLS on, service-role
--     backend bypasses it; mentors never touch these tables directly.
-- ============================================================

-- 1. Mentor → learner assignments
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

-- 2. Weekly share: admin pushes a course + activity note to mentors
create table if not exists public.mentor_weekly_shares (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete set null,
  title       text not null,
  message     text not null default '',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Which mentors received each share (denormalized for easy reads)
create table if not exists public.mentor_weekly_share_recipients (
  share_id   uuid not null references public.mentor_weekly_shares(id) on delete cascade,
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  read_at    timestamptz,
  primary key (share_id, mentor_id)
);

create index if not exists idx_mwsr_mentor
  on public.mentor_weekly_share_recipients(mentor_id);

-- 3. RLS — backend service-role bypasses; clients get no direct access
alter table public.mentor_assignments enable row level security;
alter table public.mentor_weekly_shares enable row level security;
alter table public.mentor_weekly_share_recipients enable row level security;

-- No policies created = default deny for anon/authenticated keys.
-- (Mentors read everything through the backend API, which uses the
-- service-role key — the same model as mcp_oauth_* tables.)

-- 4. Reusable helper: is this user a mentor? (SECURITY DEFINER so
-- future policies can use it without recursion)
create or replace function public.is_mentor(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = uid and role = 'mentor');
$$;
