-- GitHub identity link (project system Phase 23/36)
-- Stores the student's PUBLIC GitHub username so commits, pull requests, and
-- reviews delivered by the webhook are attributed to the right profile and
-- credited to their dashboard activity. Only public identity data (username);
-- no tokens, no scopes.
-- Run: Supabase SQL Editor (idempotent).

alter table public.profiles
  add column if not exists github_username text;

-- One GitHub account can be linked to at most one profile.
create unique index if not exists idx_profiles_github_username
  on public.profiles (github_username)
  where github_username is not null;
