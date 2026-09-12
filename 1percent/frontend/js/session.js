/* ============================================================
   Shared Session Manager (window.OPSession)
   ============================================================
   One Supabase client per page with persistent sessions:
   - persistSession: true  -> session survives tab/browser closes
   - autoRefreshToken: true-> access token auto-renews in the
     background, so the user stays logged in indefinitely
     (until they explicitly sign out).
   Pages must use OPSession.getClient() instead of calling
   supabase.createClient() themselves so every page reads the
   SAME persisted session from localStorage.
   ============================================================ */

(function () {
  let _clientPromise = null;

  function _create() {
    return fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (!config.supabaseUrl || !config.supabaseAnonKey || typeof supabase === 'undefined') {
          return null;
        }
        return supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,      // keep the session in localStorage
            autoRefreshToken: true,    // silently renew before expiry
            detectSessionInUrl: false
          }
        });
      })
      .catch(() => null);
  }

  /** Get (and memoize) the shared Supabase client. Resolves null if unconfigured. */
  function getClient() {
    if (!_clientPromise) _clientPromise = _create();
    return _clientPromise;
  }

  /** Restore + keep alive the persisted session. Returns the user or null. */
  async function getUser() {
    const client = await getClient();
    if (!client) return null;
    try {
      // getSession() reads localStorage and auto-refreshes if expired.
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return null;

      // Proactively refresh if the access token dies within 5 minutes.
      const expiresAtMs = (session.expires_at || 0) * 1000;
      if (expiresAtMs && expiresAtMs - Date.now() < 5 * 60 * 1000) {
        await client.auth.refreshSession();
        const { data: { session: fresh } } = await client.auth.getSession();
        return fresh?.user || session.user;
      }
      return session.user;
    } catch {
      return null;
    }
  }

  /** Access token for API calls (auto-refreshed by the client). */
  async function getToken() {
    const client = await getClient();
    if (!client) return null;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) return null;
      const expiresAtMs = (session.expires_at || 0) * 1000;
      if (expiresAtMs && expiresAtMs - Date.now() < 5 * 60 * 1000) {
        const { data: { session: fresh } } = await client.auth.refreshSession();
        return fresh?.access_token || session.access_token;
      }
      return session.access_token;
    } catch {
      return null;
    }
  }

  /** Sign out everywhere and clear the persisted session. */
  async function signOut() {
    const client = await getClient();
    if (client) { try { await client.auth.signOut(); } catch {} }
  }

  window.OPSession = { getClient, getUser, getToken, signOut };
})();
