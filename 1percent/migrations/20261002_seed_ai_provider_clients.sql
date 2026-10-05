-- ============================================================
-- AI Connection Seeds — ChatGPT + Gemini provider clients
-- ============================================================
-- These two rows register the ChatGPT and Gemini connectors in
-- mcp_oauth_clients, so the existing /mcp/oauth/register,
-- /authorize, /token and /revoke endpoints already work for them:
-- the provider id is passed as client_id and every provider share
-- the same PKCE S256 + consent + code-exchange flow.
--
-- NOTE:
--   • The real provider redirects (openai.com / googleusercontent.com)
--     are issued by the provider, so we only give a *local* callback
--     host here.  The provider-oauth end of the flow is out of scope
--     for this platform; the /mcp/oauth/* endpoints plus the
--     settings/admin UI below just make the connector visible and
--     revocable per account.
--   • New clients (chatgpt-client, gemini-client) are public
--     (token_endpoint_auth_method=none) — PKCE is mandatory, same as
--     claude-ai-connector.

insert into public.mcp_oauth_clients
  (client_id, client_name, redirect_uris, grant_types, response_types,
   token_endpoint_auth_method, scope)
values
  ('chatgpt-client', 'ChatGPT (AI connect)', '{"https://1percent.rw/mcp/ai/chatgpt"}', '{authorization_code,refresh_token}', '{code}', 'none', 'read grade')
on conflict (client_id) do nothing;

insert into public.mcp_oauth_clients
  (client_id, client_name, redirect_uris, grant_types, response_types,
   token_endpoint_auth_method, scope)
values
  ('gemini-client', 'Gemini (AI connect)', '{"https://1percent.rw/mcp/ai/gemini"}', '{authorization_code,refresh_token}', '{code}', 'none', 'read grade')
on conflict (client_id) do nothing;

create index if not exists idx_mcp_oauth_clients_revoked
  on public.mcp_oauth_clients(revoked_at);
