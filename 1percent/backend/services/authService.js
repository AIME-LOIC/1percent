/* ============================================================
   Auth Service
   ============================================================
   Wraps Supabase Auth operations for signup, login, logout,
   and session management.
   ============================================================ */

const { adminClient, anonClient } = require('../config/database');

class AuthService {
  /**
   * Register a new user
   */
  async signup(email, password, metadata = {}) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: metadata.full_name || '',
        ...metadata
      }
    });

    if (error) throw error;

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
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || ''
      }
    };
  }

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

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
        role
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };
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
   * Get user profile from profiles table
   */
  async getProfile(userId) {
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
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
