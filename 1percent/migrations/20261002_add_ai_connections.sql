-- ============================================================
-- AI Connections — multi-AI OAuth bridge (ChatGPT + Gemini)
-- ============================================================
-- Reuses the existing /mcp/oauth OAuth 2.0 + PKCE machine
-- (register / authorize / token / revoke).  Each provider is just
-- a registered client row in mcp_oauth_clients; the frontend and
-- backend only forward the provider id as client_id.
--
-- Stored rows: public.ai_connections (user -> provider -> MCP client
-- connection).  mcp_token_hash keeps the server-granted connection
-- token hashed; mcp_client_id points at the registered provider row.

create table if not exists public.ai_connections (
  id              uuid primary key default uuid_generate_v4(),
  -- The 1% Learn account that owns this connection.
  user_id         uuid not null references public.profiles(id) on delete cascade,
  -- ChatGPT | Gemini.
  provider        text not null check (provider in ('chatgpt', 'gemini')),
  -- The registered MCP OAuth client that backs this provider.
  mcp_client_id   text not null,
  -- Hashed token returned by the provider at token-exchange time.
  mcp_token_hash  text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

create index if not exists idx_ai_connections_user
  on public.ai_connections(user_id);

create index if not exists idx_ai_connections_provider
  on public.ai_connections(provider);

create index if not exists idx_ai_connections_revoked
  on public.ai_connections(revoked_at);

alter table public.ai_connections enable row level security;

-- Only the owner may read their own AI connections.
create policy "Users can view own AI connections"
  on public.ai_connections for select
  using (auth.uid() = user_id);

-- The backend uses the service-role client, which bypasses RLS.
