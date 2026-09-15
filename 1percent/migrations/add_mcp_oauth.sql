-- ============================================================
-- MCP OAuth — "Connect to Claude" with an account (no keys)
-- ============================================================
-- Replaces copy-pasted student MCP keys with an OAuth 2.0
-- Authorization-Code + PKCE flow:
--
--   1. User clicks "Connect to Claude" → claude.ai opens
--      /mcp/oauth/authorize (PKCE code_challenge present).
--   2. Consent page (requires the user's Supabase session).
--   3. Approval creates a one-time auth code (mcp_oauth_codes).
--   4. Claude exchanges code + verifier at /mcp/oauth/token
--      and receives a bearer token (mcp_oauth_tokens).
--
-- SECURITY MODEL:
--   • Auth codes: single-use, 10-min TTL, PKCE-verified.
--   • Tokens: SHA-256 hashes only — plaintext never stored.
--     (Claude receives the plaintext exactly once, at /token.)
--   • Refresh tokens rotate on every use.
--   • Revoking sets revoked_at on ALL of the user's tokens.
--   • RLS on; the backend uses the service-role client.
-- ============================================================

-- 1. Pending authorization codes (burned at exchange time)
create table if not exists public.mcp_oauth_codes (
  id             uuid primary key default uuid_generate_v4(),
  code_hash      text not null unique,        -- sha256 hex of the auth code
  user_id        uuid not null references public.profiles(id) on delete cascade,
  client_id      text not null default 'claude-ai-connector',
  redirect_uri   text,
  scope          text not null default 'read',
  code_challenge text not null,               -- PKCE S256 challenge
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

create index if not exists idx_mcp_oauth_codes_expires
  on public.mcp_oauth_codes(expires_at);

-- 2. Granted tokens (access + refresh, hashed)
create table if not exists public.mcp_oauth_tokens (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  access_hash   text not null unique,         -- sha256 hex of the access token
  refresh_hash  text not null unique,         -- sha256 hex of the refresh token
  scope         text not null default 'read', -- space-separated: "read" or "read grade"
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  expires_at    timestamptz not null          -- refresh-token expiry
);

create index if not exists idx_mcp_oauth_tokens_user
  on public.mcp_oauth_tokens(user_id);

-- RLS: users may view their own rows via anon/auth clients; the
-- backend uses the service-role client, which bypasses RLS.
alter table public.mcp_oauth_codes  enable row level security;
alter table public.mcp_oauth_tokens enable row level security;

create policy "Users can view own MCP oauth tokens"
  on public.mcp_oauth_tokens for select
  using (auth.uid() = user_id);

create policy "Users can view own MCP oauth codes"
  on public.mcp_oauth_codes for select
  using (auth.uid() = user_id);

-- ============================================================
-- OPTIONAL CLEANUP (run manually once the OAuth flow is live):
--
--   delete from public.student_mcp_tokens;
--
-- Legacy per-user paste tokens remain valid until then; existing
-- Claude connections using them keep working during the cutover.
-- ============================================================
