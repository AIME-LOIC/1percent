-- ============================================================
-- profiles.email — the profiles table never had an email column
-- (emails live in auth.users). Any query selecting profiles.email
-- (mentor program, admin enrollments enrichment) failed with
-- "column profiles.email does not exist" → 500s + missing names.
--
-- This migration:
--   1. adds profiles.email,
--   2. backfills it from auth.users,
--   3. installs triggers to keep it in sync on signup and on
--      auth email changes,
--   4. indexes it for admin lookups.
-- Idempotent — safe to run more than once.
-- ============================================================

-- 1. Column (empty string default matches full_name's convention)
alter table public.profiles
  add column if not exists email text not null default '';

-- 2. Backfill from auth.users
update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.id = u.id
  and p.email = '';

-- 3a. Trigger: on new auth user, copy email into profile.
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

-- 3b. Trigger: on auth email change, keep profile in sync.
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

-- 4. Lookup index (case-insensitive admin searches)
create index if not exists profiles_email_idx
  on public.profiles (lower(email));
