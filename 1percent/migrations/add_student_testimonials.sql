/* ============================================================
   1Percent Learn — Student Testimonials
   Students submit a short testimonial; only admins publish
   (approved) ones to public pages. Safe to run multiple times.
   Run in the Supabase SQL Editor.
   ============================================================ */

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

alter table public.student_testimonials enable row level security;

create policy "Anyone can view approved testimonials"
  on public.student_testimonials for select
  using (status = 'approved');

create policy "Users can insert own pending testimonial"
  on public.student_testimonials for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users can view own testimonial"
  on public.student_testimonials for select
  using (auth.uid() = user_id);

create policy "Users can update own pending testimonial"
  on public.student_testimonials for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users can delete own pending testimonial"
  on public.student_testimonials for delete
  using (auth.uid() = user_id and status = 'pending');

-- Keep approved_at accurate when admins publish.
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
