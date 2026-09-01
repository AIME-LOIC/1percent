/* ============================================================
   Certificate Controller
   ============================================================ */

const certificateService = require('../services/certificateService');

class CertificateController {
  /**
   * POST /api/courses/:courseId/certificate
   * Request certificate for a completed course (auth required)
   */
  async issue(req, res) {
    try {
      const result = await certificateService.issueIfComplete(req.user.id, req.params.courseId);

      if (result.certificate) {
        return res.json({
          success: true,
          message: result.already_issued ? 'Certificate already issued.' : 'Certificate issued!',
          certificate: result.certificate
        });
      }

      res.json({
        success: false,
        message: 'Course not yet complete.',
        progress: result.progress,
        quiz_required: result.quiz_required || false,
        quiz_passed: result.quiz_passed ?? true
      });
    } catch (err) {
      console.error('[CERT] Issue error:', err.message);
      res.status(500).json({ error: 'Failed to issue certificate.' });
    }
  }

  /**
   * GET /api/certificates/verify/:number
   * Verify a certificate (public)
   */
  async verify(req, res) {
    try {
      const result = await certificateService.verify(req.params.number);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[CERT] Verify error:', err.message);
      res.status(500).json({ error: 'Verification failed.' });
    }
  }

  /**
   * GET /api/certificates/mine
   * Get current user's certificates (auth required)
   */
  async getMine(req, res) {
    try {
      const certificates = await certificateService.getUserCertificates(req.user.id);
      res.json({ success: true, certificates });
    } catch (err) {
      console.error('[CERT] List error:', err.message);
      res.status(500).json({ error: 'Failed to load certificates.' });
    }
  }

  /**
   * GET /api/certificates/public/:number
   * Public certificate view with signature
   */
  async publicView(req, res) {
    try {
      const { adminClient } = require('../config/database');
      const { data: cert, error } = await adminClient
        .from('certificates')
        .select('id, certificate_number, learner_name, course_title, course_level, duration_weeks, issued_at, user_id, course_id')
        .eq('certificate_number', req.params.number)
        .single();

      if (error || !cert) {
        return res.json({ success: false, error: 'Certificate not found.' });
      }

      // Get signature — first try certificate owner, then fallback to any admin
      let signatureUrl = null;
      try {
        // Try certificate owner's signature first
        const { data: sig } = await adminClient
          .from('signatures')
          .select('signature_url')
          .eq('user_id', cert.user_id)
          .single();
        if (sig?.signature_url) {
          signatureUrl = sig.signature_url;
        } else {
          // Fallback: get any admin's signature
          const { data: adminProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .single();
          if (adminProfile?.id) {
            const { data: adminSig } = await adminClient
              .from('signatures')
              .select('signature_url')
              .eq('user_id', adminProfile.id)
              .single();
            if (adminSig?.signature_url) signatureUrl = adminSig.signature_url;
          }
        }
      } catch {}

      res.json({
        success: true,
        certificate: {
          id: cert.id,
          certificate_number: cert.certificate_number,
          learner_name: cert.learner_name,
          course_title: cert.course_title,
          course_level: cert.course_level,
          duration_weeks: cert.duration_weeks,
          issued_at: cert.issued_at,
          completed_at: cert.issued_at,
          course_id: cert.course_id
        },
        signature_url: signatureUrl
      });
    } catch (err) {
      console.error('[CERT] Public view error:', err.message);
      res.status(500).json({ error: 'Failed to load certificate.' });
    }
  }

  /**
   * POST /api/certificates/free-view
   * Record that the user used their one free certificate view
   */
  async recordFreeView(req, res) {
    try {
      const { adminClient } = require('../config/database');
      const userId = req.user.id;

      // Check if user has premium subscription
      const { data: sub } = await adminClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      const isPremium = !!sub;

      if (isPremium) {
        return res.json({ success: true, is_premium: true });
      }

      // Check if already used free view
      const { data: profile } = await adminClient
        .from('profiles')
        .select('has_used_free_cert_view')
        .eq('id', userId)
        .single();

      if (profile?.has_used_free_cert_view) {
        return res.status(403).json({ success: false, error: 'Free view already used. Subscribe to Pro for unlimited views.' });
      }

      // Mark as used
      await adminClient
        .from('profiles')
        .update({ has_used_free_cert_view: true })
        .eq('id', userId);

      res.json({ success: true, is_premium: false });
    } catch (err) {
      console.error('[CERT] Free view error:', err.message);
      res.status(500).json({ error: 'Failed to record free view.' });
    }
  }

  /**
   * GET /api/certificates/usage
   * Check if user has used free view and subscription status
   */
  async getUsage(req, res) {
    try {
      if (!req.user) {
        return res.json({ success: true, used_free_view: false, is_premium: false });
      }

      const { adminClient } = require('../config/database');

      const { data: profile } = await adminClient
        .from('profiles')
        .select('has_used_free_cert_view')
        .eq('id', req.user.id)
        .single();

      const { data: sub } = await adminClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      res.json({
        success: true,
        used_free_view: profile?.has_used_free_cert_view || false,
        is_premium: !!sub
      });
    } catch (err) {
      console.error('[CERT] Usage error:', err.message);
      res.json({ success: true, used_free_view: false, is_premium: false });
    }
  }
}

module.exports = new CertificateController();
