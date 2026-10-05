-- ── Referral / where-did-you-hear-from (added by mentor-capacity + referrals PR) ───────────
-- profiles: capture the source of the signup (Google Search / LinkedIn /
--            Instagram / Friend / ...).
alter table public.profiles
  add column if not exists referral_source text default '' check (char_length(referral_source) <= 80),
  add column if not exists referral_source_url text default '' check (char_length(referral_source_url) <= 500);

-- referral_links: one row per source/link the student tapped.
create table if not exists public.referral_links (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  source       text not null default '' check (char_length(source) <= 80),
  source_url   text not null default '' check (char_length(source_url) <= 500),
  clicked_at   timestamptz not null default now()
);

create index if not exists idx_referral_links_user on public.referral_links(user_id);
create index if not exists idx_referral_links_clicked on public.referral_links(clicked_at desc);

-- Extend the notifications type CHECK so the mentor email feature and the
-- referral pipeline can use server-generated in-app types without hitting
-- the CHECK constraint.
ALTER TABLE public.notifications
  ALTER COLUMN type DROP CONSTRAINT;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'success', 'warning', 'error', 'mentor_nudge', 'mentor_email', 'referral', 'marketing'));
