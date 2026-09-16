-- ============================================================
-- Robotics Club — schools + club members
-- ============================================================
-- Students can "quick join" the robotics club by picking the school
-- they study at. Club admins see every member (filterable by school)
-- and can send club-wide or school-wide notifications.
--
-- Seed data: the schools known so far. New schools can be added by
-- admins later — the join page always reads the live list.
-- Idempotent — safe to run more than once.
-- ============================================================

-- 1. SCHOOLS
create table if not exists public.club_schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  district   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. CLUB MEMBERS (one membership per user; school is required)
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

create index if not exists idx_club_members_school
  on public.club_members (school_id);
create index if not exists idx_club_members_user
  on public.club_members (user_id);

-- 3. RLS: members read their own row; the backend uses the service-role
--    client (bypasses RLS) for all writes and admin reads.
alter table public.club_schools enable row level security;
alter table public.club_members enable row level security;

drop policy if exists "Anyone can view active schools" on public.club_schools;
create policy "Anyone can view active schools"
  on public.club_schools for select
  using (is_active = true);

drop policy if exists "Users can view own club membership" on public.club_members;
create policy "Users can view own club membership"
  on public.club_members for select
  using (auth.uid() = user_id);

-- 4. SEED: schools known so far
insert into public.club_schools (name, district)
values ('SOS Technical High School', 'Kigali')
on conflict (name) do nothing;
