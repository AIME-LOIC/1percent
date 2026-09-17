/* ============================================================
   Tests for RFC 7591 Dynamic Client Registration (MCP OAuth)
   ============================================================
   Run: node test_mcp_oauth_registration.js

   Covers the pure validation layer (redirect URI rules, scope
   normalization, registration validation, PKCE S256) plus a static
   check that both discovery documents advertise
   `registration_endpoint` — its absence is exactly what makes
   claude.ai show "Automatic client registration isn't supported".
   ============================================================ */

// Stub Supabase env BEFORE requiring the service so database.js can
// build its clients; nothing here performs network calls.
require('dotenv').config();
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

const fs = require('fs');
const path = require('path');
const svc = require('./backend/services/mcpOAuthService');

/** The _issueTokens body must not run the client-facing normalizer over
 * the stored scope string — that is what stripped the admin scope. */
function svcSrcIssueUsesNormalize() {
  const src = fs.readFileSync(path.join(__dirname, 'backend/services/mcpOAuthService.js'), 'utf8');
  const start = src.indexOf('async _issueTokens');
  if (start < 0) return true;
  const body = src.slice(start, src.indexOf('\n  }', start));
  // Match real calls (normalizeScope(x)) — prose mentioning normalizeScope() in
  // a comment has empty parens and must not trip this check.
  return /normalizeScope\s*\(\s*[^\s)]/.test(body);
}

let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
  if (!cond) failures++;
};

(async () => {
  /* ── 1. Redirect URI validation (pure) ─────────────────── */
  check('https redirect accepted', svc.isValidRedirectUri('https://claude.ai/api/mcp/auth_callback'));
  check('http localhost accepted (dev)', svc.isValidRedirectUri('http://localhost:3000/callback'));
  check('http 127.0.0.1 accepted (dev)', svc.isValidRedirectUri('http://127.0.0.1:5173/cb'));
  check('http non-localhost rejected', !svc.isValidRedirectUri('http://evil.example.com/cb'));
  check('javascript: scheme rejected', !svc.isValidRedirectUri('javascript:alert(1)'));
  check('ftp: scheme rejected', !svc.isValidRedirectUri('ftp://claude.ai/cb'));
  check('fragment rejected', !svc.isValidRedirectUri('https://claude.ai/cb#token'));
  check('garbage rejected', !svc.isValidRedirectUri('not a url'));
  check('empty rejected', !svc.isValidRedirectUri(''));

  const norm = svc.normalizeRedirectUris(['https://a.dev/cb', 'https://a.dev/cb', 'https://b.dev/cb']);
  check('normalize dedupes', Array.isArray(norm) && norm.length === 2, JSON.stringify(norm));
  check('normalize rejects on one bad URI', svc.normalizeRedirectUris(['https://ok.dev/cb', 'nope']) === null);

  /* ── 2. Scope normalization ────────────────────────────── */
  check('scope read+grade kept', svc.normalizeRequestedScopes('read grade').join(' ') === 'read grade');
  check('unknown scopes dropped', svc.normalizeRequestedScopes('read admin:root').join(' ') === 'read');
  check('empty scope falls back to read', svc.normalizeRequestedScopes('').join(' ') === 'read');
  check('array scopes accepted', svc.normalizeRequestedScopes(['grade', 'bogus']).join(' ') === 'grade');

  /* ── 3. registerClient validation (fails closed before DB) ── */
  let err = null;
  try { await svc.registerClient({ redirectUris: [] }); } catch (e) { err = e; }
  check('register rejects empty redirect_uris', err && err.oauthError === 'invalid_redirect_uri', err && err.message);

  err = null;
  try { await svc.registerClient({ redirectUris: ['http://evil.com/cb'] }); } catch (e) { err = e; }
  check('register rejects non-https redirect', err && err.oauthError === 'invalid_redirect_uri');

  err = null;
  try { await svc.registerClient({ redirectUris: ['https://ok.dev/cb'], grantTypes: ['client_credentials'] }); } catch (e) { err = e; }
  check('register rejects missing authorization_code grant', err && err.oauthError === 'invalid_client_metadata');

  /* ── 3b. Admin scope is server-granted, never client-requestable ── */
  check('client-supplied admin scope is stripped', !svc.normalizeRequestedScopes('read admin').includes('admin'));
  check('admin-only request falls back to read', svc.normalizeRequestedScopes('admin').join(' ') === 'read');
  check('student scopes survive normalization', svc.normalizeRequestedScopes('read grade').join(' ') === 'read grade');

  /* ── 3c. Stored scope parsing keeps server-granted admin ──
     Regression guard: _issueTokens() once parsed the stored scope with
     the client-facing normalizer, which strips 'admin' — every issued
     token came out student-only and admins lost the platform tools. */
  check('parseStoredScopes keeps admin', svc.parseStoredScopes('read grade admin').includes('admin'));
  check('parseStoredScopes defaults empty to read', svc.parseStoredScopes('').join(' ') === 'read');
  check('issue path no longer uses client normalizer on stored scope', !svcSrcIssueUsesNormalize());

  /* ── 4. PKCE S256 round-trip (the real verifier flow) ───── */
  const crypto = require('crypto');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  check('PKCE S256 verifies correct verifier', svc._pkceOk(verifier, challenge, 'S256'));
  check('PKCE S256 rejects wrong verifier', !svc._pkceOk(crypto.randomBytes(32).toString('base64url'), challenge, 'S256'));
  check('PKCE refuses plain method', !svc._pkceOk(verifier, challenge, 'plain'));
  check('PKCE refuses missing challenge', !svc._pkceOk(verifier, null, 'S256'));

  /* ── 4b. Route wiring: /me endpoint + server-side scope grant ── */
  const svcSrc = fs.readFileSync(path.join(__dirname, 'backend/services/mcpOAuthService.js'), 'utf8');
  const rpcSrc = fs.readFileSync(path.join(__dirname, 'backend/routes/studentMcpRoutes.js'), 'utf8');
  check('RPC route resolves admin from live profile', rpcSrc.includes("liveRole === 'admin'") && /from\('profiles'\)/.test(rpcSrc));
  check('RPC route backfills admin scope for existing connections', rpcSrc.includes('!req.mcpScope.includes(ADMIN_SCOPE)'));
  const routesSrc = fs.readFileSync(path.join(__dirname, 'backend/routes/mcpOAuthRoutes.js'), 'utf8');
  check('authorize route validates against requestable scopes (not admin)', /USER_REQUESTABLE_SCOPES\.includes\(s\)/.test(routesSrc));
  check('scope grant re-checks profiles.role', svcSrc.includes("from('profiles')") && svcSrc.includes("profile?.role === 'admin'"));
  check('token issue re-verifies admin role', svcSrc.includes("profile?.role !== 'admin'") && svcSrc.includes("scopes.filter(s => s !== ADMIN_SCOPE)"));
  check('verifyAccessToken preserves stored admin scope', !/scope:\s*normalizeScope\(data\.scope\)/.test(svcSrc));
  check('me endpoint returns is_admin', /is_admin:\s*profile\.role === 'admin'/.test(routesSrc));
  check('consent page discloses admin access', routesSrc.includes('ADMIN ACCESS'));

  /* ── 5. Discovery documents advertise registration_endpoint ── */
  const indexSrc = fs.readFileSync(path.join(__dirname, 'backend/index.js'), 'utf8');
  check('route discovery advertises registration_endpoint', /registration_endpoint:\s*`\$\{base\}\/mcp\/oauth\/register`/.test(routesSrc));
  check('root discovery advertises registration_endpoint', /registration_endpoint:\s*`\$\{base\}\/mcp\/oauth\/register`/.test(indexSrc));
  check('register route mounted', /router\.post\('\/register',\s*rateLimit/.test(routesSrc));

  /* ── 6. Migration exists and seeds the DEFAULT client ───── */
  const mig = fs.readFileSync(path.join(__dirname, 'migrations/add_mcp_oauth_clients.sql'), 'utf8');
  check('migration creates mcp_oauth_clients', mig.includes('create table if not exists public.mcp_oauth_clients'));
  check('migration seeds claude-ai-connector', mig.includes("'claude-ai-connector'"));

  /* ── 7. Consent page inline script must PARSE in a browser ──
     The page is a JS template literal inside mcpOAuthRoutes.js, so
     every browser-side escape must be doubled there. A single \'
     collapses to a bare ' in the served HTML and SyntaxErrors the
     whole init script → consent stuck on "Checking your sign-in…". */
  const tplStart = routesSrc.indexOf('`<!DOCTYPE html>');
  const tplEnd = routesSrc.indexOf('`;', tplStart);
  check('consent template found in routes', tplStart > 0 && tplEnd > tplStart);
  if (tplStart > 0 && tplEnd > tplStart) {
    const render = new Function('payload', 'return ' + routesSrc.slice(tplStart, tplEnd + 1));
    const html = render(Buffer.from(JSON.stringify({
      client_id: 'claude-ai-connector',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      scope: 'read grade', state: '', code_challenge: 'x'.repeat(43)
    })).toString('base64url'));
    const inline = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    check('consent page has an inline script', inline.length === 1, inline.length + ' scripts');
    let parsed = true, parseErr = '';
    try { new Function(inline[0]); } catch (e) { parsed = false; parseErr = e.message; }
    check('consent inline script parses in browser', parsed, parseErr);
    check('login hint keeps escaped apostrophe', html.includes("you\\'ll"));
  }

  console.log(failures === 0 ? '\nALL REGISTRATION TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
