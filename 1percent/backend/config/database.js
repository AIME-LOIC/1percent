/* ============================================================
   Supabase Client Initialization
   ============================================================
   Two clients:
   - adminClient: uses service role key — bypasses RLS, server-only
   - anonClient: uses anon key — respects RLS, safe for edge cases
   ============================================================ */

const { createClient } = require('@supabase/supabase-js');

// Admin client — server-side only, bypasses RLS
const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anon client — respects RLS, can be used for public operations.
// flowType:'implicit' is REQUIRED for our email links (confirmation,
// magic link, reset): implicit links carry tokens in the URL fragment
// where our /api/auth/callback page picks them up client-side. The
// default PKCE flow needs a code_verifier that cannot survive between
// two serverless/express requests.
const anonClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { adminClient, anonClient };
