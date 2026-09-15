-- ============================================================
-- Challenge Hints + free monthly hint allowance
-- - challenges.hints: JSON array of hint strings (admin-editable)
-- - challenge_hints_unlocked: which user unlocked which hint #
--   (and whether it came from the free monthly quota or coins)
-- - hint_allowance: rolling monthly ledger of free hints per user
-- Policy: every user gets 5 free hints per calendar month (any
-- challenge). After that, each hint costs coins (HINT_COST_COINS).
-- ============================================================

-- 1. Hints live on the challenge itself (ordered array)
alter table public.challenges
  add column if not exists hints jsonb not null default '[]'::jsonb;

-- 2. Which hints a user has unlocked
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

alter table public.challenge_hints_unlocked enable row level security;
create policy "Users can view own unlocked hints" on public.challenge_hints_unlocked
  for select using (auth.uid() = user_id);

-- 3. Monthly free-hint allowance (5 per calendar month)
create table if not exists public.hint_allowance (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  period      text not null,           -- 'YYYY-MM'
  free_used   int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.hint_allowance enable row level security;
create policy "Users can view own hint allowance" on public.hint_allowance
  for select using (auth.uid() = user_id);

-- 4. Wallet-friendly default: seed a starter hint for every challenge
--    that has none (idempotent — only fills empty arrays).
update public.challenges
set hints = jsonb_build_array(
  'Re-read the task carefully and identify exactly what output or behavior is expected.',
  'Break the problem into small steps and solve one step at a time.',
  'Check your syntax: variable names, brackets, and quotes must match exactly.'
)
where coalesce(jsonb_array_length(hints), 0) = 0;
