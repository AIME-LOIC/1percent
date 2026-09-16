-- ============================================================
-- MCP OAuth — Dynamic Client Registration (RFC 7591)
-- ============================================================
-- claude.ai custom connectors expect the authorization server to
-- advertise `registration_endpoint` in its metadata. When it is
-- missing, claude.ai refuses to auto-connect and shows
--   "Automatic client registration isn't supported… add an OAuth
--    Client ID" (ofid_* reference).
--
-- This table stores clients created via POST /mcp/oauth/register:
--   • Public clients (token_endpoint_auth_method=none) — the claude.ai
--     model. PKCE S256 remains mandatory for every authorize call.
--   • Confidential clients (MCP_OAUTH_CLIENT_SECRET is honoured at
--     /token for the seeded DEFAULT client only).
-- ============================================================

create table if not exists public.mcp_oauth_clients (
  id                          uuid primary key default uuid_generate_v4(),
  client_id                   text not null unique,          -- returned to the client verbatim
  client_secret_hash          text,                          -- null for public clients
  client_name                 text,
  redirect_uris               text[] not null default '{}',  -- exact-match strings (RFC 6749 §3.1.2.3)
  grant_types                 text[] not null default '{authorization_code,refresh_token}',
  response_types              text[] not null default '{code}',
  token_endpoint_auth_method  text not null default 'none',  -- 'none' (public) | 'client_secret_post'
  scope                       text not null default 'read',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  revoked_at                  timestamptz
);

-- Seeded so flows that omit client_id (older connectors, the Settings
-- "try it now" button) keep working with the fixed public id.
insert into public.mcp_oauth_clients
  (client_id, client_name, redirect_uris, token_endpoint_auth_method, scope)
values
  ('claude-ai-connector', 'Claude AI (built-in)', '{}', 'none', 'read grade')
on conflict (client_id) do nothing;

create index if not exists idx_mcp_oauth_clients_revoked
  on public.mcp_oauth_clients(revoked_at);

alter table public.mcp_oauth_clients enable row level security;

-- The client registry is server-side only: no anon/auth policies.
-- The backend uses the service-role client, which bypasses RLS.
