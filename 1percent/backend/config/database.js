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

// Anon client — respects RLS, can be used for public operations
const anonClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = { adminClient, anonClient };
