/* ============================================================
   Migration: AI review pipeline tables
   ============================================================
   ai_reviews        — every AI-generated marking/review, stored
                       as PENDING. Nothing is applied to the
                       student's record until an admin approves.
   ai_model_versions — audit trail of training runs (who, when,
                       corpus stats) so the "trained model" is
                       inspectable and revertable.

   Run in Supabase SQL Editor.
   ============================================================ */

-- 1. AI reviews: the queue admins act on
create table if not exists public.ai_reviews (
  id             uuid primary key default uuid_generate_v4(),
  -- What was reviewed
  user_id        uuid not null references public.profiles(id) on delete cascade,
  challenge_id   uuid references public.challenges(id) on delete cascade,
  submission_id  uuid,                          -- challenge_submissions row (set on apply)
  -- The AI's work product
  verdict        text not null default 'needs_review'
                 check (verdict in ('pass', 'fail', 'needs_review')),
  score          int not null default 0,        -- 0-100 rubric score
  quality        text not null default 'beginner'
                 check (quality in ('beginner', 'developing', 'proficient')),
  review         jsonb not null default '{}'::jsonb,   -- full review artifact (strengths, concepts…)
  shape_signature text not null default '',     -- for future duplicate matching
  -- Governance
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by    uuid references public.profiles(id),  -- admin who decided
  decided_at     timestamptz,
  admin_note     text not null default '',
  -- Engine provenance
  engine_version text not null default '1percent-local-engine-v1',
  model_trained_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_ai_reviews_status on public.ai_reviews(status, created_at);
create index if not exists idx_ai_reviews_user on public.ai_reviews(user_id);
create index if not exists idx_ai_reviews_challenge on public.ai_reviews(challenge_id);

alter table public.ai_reviews enable row level security;

-- Students may see their OWN reviews (read-only)
create policy "Students can view own AI reviews" on public.ai_reviews
  for select using (auth.uid() = user_id);

-- Admins manage everything (admin role checked by app layer too)
create policy "Admins manage AI reviews" on public.ai_reviews
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 2. Model version audit trail
create table if not exists public.ai_model_versions (
  id             uuid primary key default uuid_generate_v4(),
  version        int not null,
  trained_at     timestamptz not null default now(),
  trained_by     uuid references public.profiles(id),
  stats          jsonb not null default '{}'::jsonb,  -- courses/lessons/challenges counts
  notes          text not null default ''
);

alter table public.ai_model_versions enable row level security;

create policy "Admins manage model versions" on public.ai_model_versions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 3. Admin alert when a review needs attention (reuses logService)
--    No table change needed — admin_alerts already exists.

-- Done. The engine writes here with service_role; RLS above governs
-- the dashboard clients.
