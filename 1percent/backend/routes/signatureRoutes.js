/* ============================================================
   Signature Routes
   ============================================================
   POST /api/sign/signature       — Save signature (auth)
   GET  /api/sign/signature       — Get own signature (auth)
   GET  /api/sign/public/:userId  — Get public signature (for PDFs)
   ============================================================ */

const { Router } = require('express');
const { adminClient } = require('../config/database');
const { authenticate } = require('../middlewares/auth');

const router = Router();

/**
 * POST /api/sign/signature
 * Save or update the user's signature (base64 data URL or URL string)
 */
router.post('/signature', authenticate, async (req, res) => {
  try {
    const { signature_url, full_name } = req.body;
    if (!signature_url) return res.status(422).json({ error: 'signature_url is required' });

    // Upsert — one signature per user
    const { data, error } = await adminClient
      .from('signatures')
      .upsert({
        user_id: req.user.id,
        signature_url,
        full_name: full_name || req.user.full_name || ''
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, signature: data });
  } catch (err) {
    console.error('[SIGN] Save error:', err.message);
    res.status(500).json({ error: 'Failed to save signature.' });
  }
});

/**
 * GET /api/sign/signature
 * Get the authenticated user's own signature
 */
router.get('/signature', authenticate, async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('signatures')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.json({ success: true, signature: null });
    }
    res.json({ success: true, signature: data });
  } catch (err) {
    console.error('[SIGN] Get error:', err.message);
    res.status(500).json({ error: 'Failed to load signature.' });
  }
});

/**
 * GET /api/sign/public/:userId
 * Get a user's signature (used by PDF generation)
 */
router.get('/public/:userId', async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('signatures')
      .select('signature_url, full_name, created_at')
      .eq('user_id', req.params.userId)
      .single();

    if (error || !data) {
      return res.json({ success: true, signature: null });
    }
    res.json({ success: true, signature: data });
  } catch (err) {
    console.error('[SIGN] Public error:', err.message);
    res.status(500).json({ error: 'Failed to load signature.' });
  }
});

module.exports = router;
