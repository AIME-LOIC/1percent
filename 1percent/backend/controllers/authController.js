/* ============================================================
   Auth Controller
   ============================================================
   Handles signup, login, logout, session refresh, and profile.
   ============================================================ */

const authService = require('../services/authService');

class AuthController {
  /**
   * POST /api/auth/signup
   */
  async signup(req, res) {
    try {
      const { email, password, full_name } = req.body;

      const result = await authService.signup(email, password, {
        full_name,
        policy_version: '1.0'
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        user: result.user
      });
    } catch (err) {
      console.error('[AUTH] Signup error:', err.message);

      if (err.message?.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      if (err.message?.includes('password')) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful.',
        user: result.user,
        session: result.session
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err.message);

      if (err.message?.includes('Invalid login')) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      if (req.user?.id) {
        await authService.logout(req.user.id);
      }
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      console.error('[AUTH] Logout error:', err.message);
      // Still return success — client clears token regardless
      res.json({ success: true, message: 'Logged out.' });
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res) {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token required.' });
      }

      const result = await authService.refreshSession(refresh_token);
      res.json({ success: true, session: result.session });
    } catch (err) {
      console.error('[AUTH] Refresh error:', err.message);
      res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const profile = await authService.getProfile(req.user.id);
      res.json({ success: true, user: profile });
    } catch (err) {
      console.error('[AUTH] Get profile error:', err.message);
      res.status(500).json({ error: 'Failed to load profile.' });
    }
  }

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const { full_name, avatar_url, country } = req.body;
      const updates = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (country !== undefined) updates.country = country;
      // Note: role is NOT updatable here — only via admin endpoints

      const profile = await authService.updateProfile(req.user.id, updates);
      res.json({ success: true, user: profile });
    } catch (err) {
      console.error('[AUTH] Update profile error:', err.message);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
}

module.exports = new AuthController();
