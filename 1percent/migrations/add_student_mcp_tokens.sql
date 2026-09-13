-- ============================================================
-- Student MCP Connection — per-student tokens for Claude
-- ============================================================
-- Lets each student generate their own MCP token from the
-- settings page ("Connect to Claude") so Claude can read their
-- learning data and help them understand lessons.
--
-- SECURITY MODEL (important):
--   • Tokens are shown ONCE at creation, then only a prefix is
--     stored (first 12 chars) for display/identification.
--   • The full token is verified via SHA-256 hash lookup.
--   • Students revoke and re-generate at any time.
--   • One active token per student (new one replaces the old).
-- ============================================================

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

-- RLS: only the owner can touch their token row via anon/auth clients.
-- The backend uses the service-role client, which bypasses RLS.
alter table public.student_mcp_tokens enable row level security;

create policy "Users can view own MCP token"
  on public.student_mcp_tokens for select
  using (auth.uid() = user_id);

-- The student never reads the token back through this table from the
-- browser (they see it once at creation); all management goes through
-- the backend API with their Supabase JWT.
