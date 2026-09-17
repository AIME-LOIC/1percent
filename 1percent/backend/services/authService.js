/**
 * services/authService.js
 *
 * PURPOSE:
 *   Signup/login against Supabase Auth, profile row sync (role, email), session/token issuing, and
 *   password flows. Emits onboarding notifications via the worker queue.
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient, anonClient } = require('../config/database');

class AuthService {
  /**
   * Register a new user.
   *
   * Uses the PUBLIC signUp endpoint (not admin.createUser) so Supabase
   * sends the confirmation email natively — admin.createUser never mails
   * anyone. The user must click that link before they can log in
   * (login() refuses unconfirmed accounts).
   *
   * CHECKS BEFORE GREEN:
   *   1. an account with this email already exists → error (Supabase's
   *      signUp is a silent no-op for existing emails — no error, no
   *      email, no new user — so we must detect it ourselves);
   *   2. Supabase returned a "fake user" (identities: []) → same as (1);
   *   3. no user object at all → error, never report success;
   *   4. the profiles row exists (writes it if the signup trigger
   *      didn't) so the user really lands in the database.
   */
  async signup(email, password, metadata = {}, redirectBase = '') {
    // ── Check 1: existing account? ────────────────────────────
    const existing = await this.userExistsByEmail(email);
    if (existing) {
      const err = new Error('An account with this email already exists. Please log in instead.');
      err.code = 'email_exists';
      throw err;
    }

    const { data, error } = await Promise.race([
      anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name || '',
            policy_version: metadata.policy_version || '1.0'
          },
          // Confirmation link lands on our callback, which exchanges
          // the code for a session and continues to the dashboard.
          ...(redirectBase ? { emailRedirectTo: `${redirectBase}/api/auth/callback` } : {})
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase connection timed out')), 10000))
    ]);

    if (error) throw error;

    // ── Check 2: Supabase's "fake user" for a duplicate email ─
    // When email confirmation is ON, signUp for an ALREADY-registered
    // email returns a user object with an empty identities array and
    // sends nothing. Treat it as "account exists".
    if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
      const err = new Error('An account with this email already exists. Please log in instead.');
      err.code = 'email_exists';
      throw err;
    }

    // ── Check 3: no user created → never report success ───────
    if (!data.user?.id) {
      throw new Error('Account creation failed — please try again.');
    }

    // ── Check 4: make sure the profile row really exists ──────
    // The handle_new_user trigger normally inserts it; verify and
    // repair so a missing/broken trigger can't drop the user.
    await this._ensureProfileRow(data.user.id, {
      full_name: data.user.user_metadata?.full_name || metadata.full_name || '',
      email: data.user.email || email
    });

    // Log terms acceptance
    try {
      await adminClient.from('terms_acceptance').insert({
        user_id: data.user.id,
        policy_version: metadata.policy_version || '1.0'
      });
    } catch (e) {
      console.warn('[AUTH] Could not log terms acceptance:', e.message);
    }

    return {
      // If the project has "Confirm email" disabled, Supabase returns a
      // session right away — pass it through so the user is logged in.
      ...(data.session ? { session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      } } : {}),
      email_confirmation_required: !data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
        user_metadata: data.user.user_metadata || {}
      }
    };
  }

  /**
   * Guarantee a profiles row exists for a fresh auth user. Repairs the
   * rare case where the handle_new_user trigger didn't fire — without
   * this the user can log in but "doesn't exist" in the database.
   */
  async _ensureProfileRow(userId, { full_name, email }) {
    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (profile) return;
      const { error } = await adminClient
        .from('profiles')
        .insert({ id: userId, full_name: full_name || '', email: email || '' });
      if (error) {
        console.error('[AUTH] Profile row insert failed for', userId, error.message);
      }
    } catch (e) {
      console.error('[AUTH] Profile row check failed:', e.message);
    }
  }

  /**
   * Re-send the signup confirmation email.
   * Generic success even for unknown/confirmed emails (no account
   * enumeration); errors are logged, not surfaced.
   */
  async resendConfirmationEmail(email, redirectBase = '') {
    const { error } = await anonClient.auth.resend({
      type: 'signup',
      email,
      ...(redirectBase ? { options: { emailRedirectTo: `${redirectBase}/api/auth/callback` } } : {})
    });
    if (error) {
      // Already-confirmed or unknown email — nothing to do; stay silent.
      console.warn('[AUTH] Resend confirmation skipped:', error.message);
    }
    return true;
  }

  /**
   * Send a magic link — passwordless sign-in by email.
   * Works for existing accounts AND creates new ones (shouldCreateUser),
   * so a visitor without an account can sign up with just their email.
   */
  async sendMagicLink(email, redirectBase = '') {
    const { error } = await anonClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        ...(redirectBase ? { emailRedirectTo: `${redirectBase}/api/auth/callback` } : {})
      }
    });
    if (error) throw error;
    return true;
  }

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    const { data, error } = await Promise.race([
      anonClient.auth.signInWithPassword({ email, password }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase connection timed out')), 10000))
    ]);

    if (error) throw error;

    // Email-confirmation gate: no login until the address is verified.
    // (Safe to check AFTER the password validated — the caller just
    // proved they own the credentials for this address.)
    if (!data.user?.email_confirmed_at) {
      const err = new Error('Please confirm your email first — check your inbox for the verification link.');
      err.code = 'email_not_confirmed';
      err.email = email;
      throw err;
    }

    // Get role from profiles table
    let role = 'student';
    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profile?.role) role = profile.role;
    } catch {}

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
        role,
        user_metadata: data.user.user_metadata || {}
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };
  }

  /**
   * Check whether a user exists for the supplied email.
   */
  async userExistsByEmail(email) {
    if (!email) return false;
    try {
      const { data, error } = await adminClient.auth.admin.getUserByEmail(email);
      if (error) return false;
      return !!data?.user;
    } catch {
      return false;
    }
  }

  /**
   * Send a password reset email.
   * Uses the PUBLIC endpoint so Supabase actually sends the mail
   * (admin.generateLink only RETURNS a link — it never sends email).
   * The controller pre-checks existence to give a friendly 404.
   */
  async requestPasswordReset(email, redirectBase = '') {
    const { error } = await anonClient.auth.resetPasswordForEmail(email, {
      ...(redirectBase ? { redirectTo: `${redirectBase}/reset-password` } : {})
    });
    if (error) throw error;
    return true;
  }

  /**
   * Get user from token
   */
  async getUser(token) {
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error) throw error;
    return user;
  }

  /**
   * Invalidate all sessions for a user (server-side logout)
   */
  async logout(userId) {
    // Sign out all sessions for this user
    const { error } = await adminClient.auth.admin.signOut(userId, 'global');
    if (error) throw error;
  }

  /**
   * Refresh session
   */
  async refreshSession(refreshToken) {
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) throw error;

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };
  }

  /**
   * Get user profile from profiles table.
   * Attaches the subscription tier from user_subscriptions so the session
   * payload (/api/auth/me) is the single source of truth for the client
   * theme — the premium UI must never be derived from localStorage or
   * URL params.
   */
  async getProfile(userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Resolve the active paid tier (source of truth for theme + badges)
    let tier = 'free';
    let is_premium = false;
    let subscription_status = 'inactive';
    try {
      const { data: sub } = await adminClient
        .from('user_subscriptions')
        .select('tier_slug, is_active, expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.tier_slug && sub.tier_slug !== 'free') {
        tier = sub.tier_slug;
        is_premium = true;
        subscription_status = 'active';
      }
    } catch (e) {
      // Subscription lookup is non-fatal — default to free
      console.warn('[AUTH] Tier lookup failed:', e.message);
    }

    return { ...data, tier, is_premium, subscription_status };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    // Whitelist allowed fields to prevent role escalation
    const allowedFields = ['full_name', 'avatar_url', 'country'];
    const safeUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data, error } = await adminClient
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new AuthService();
