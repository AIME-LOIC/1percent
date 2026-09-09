-- ============================================================
-- Migration: Add modules table and update lessons
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create modules table
create table public.modules (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text default '',
  sort_order  int not null default 0,
  is_published boolean not null default true,
  created_at  timestamptz not null default now()
);

create index idx_modules_course on public.modules(course_id, sort_order);

-- 2. Add module_id to lessons (nullable for backwards compatibility)
alter table public.lessons add column module_id uuid references public.modules(id) on delete set null;

-- 3. Enable RLS on modules
alter table public.modules enable row level security;

-- 4. RLS policies for modules
create policy "Anyone can view published modules" on public.modules
  for select using (is_published = true);

create policy "Admins can manage modules" on public.modules
  for all using (public.is_admin(auth.uid()));

-- 5. Update lessons policies to allow viewing module-linked lessons
-- (existing policies already cover this since lessons are published)

-- Done. Modules table is ready.
