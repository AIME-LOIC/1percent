/**
 * routes/referralRoutes.js
 *
 * PURPOSE:
 *   Where-did-you-hear-from intake: (1) record a source + source URL on a
 *   new / returning user, and (2) accept source + link JSON from the site
 *   (Google Search / LinkedIn / Instagram / Friend / ...).
 *
 * ENDPOINTS:
 *   POST /referrals
 *     { source, source_url }  -- e.g. { source: 'Google Search', source_url: 'https://www.google.com/search?q=1percent+rwanda' }
 *
 * EXPORTS: router, adminReferralRoutes
 * DEPENDENCIES: express
 */

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');
const referralService = require('../services/referralService');

const router = Router();

// Guest / web path: record the user's answer anytime, even before login.
router.post('/referrals', sanitizeStrings(1000), async (req, res) => {
  try {
    const { source, source_url } = req.body || {};
    const result = await referralService.recordReferral({
      userId: null,
      source,
      sourceUrl: source_url
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[REFERRAL] POST error:', err.message);
    res.status(500).json({ error: 'Failed to record referral.' });
  }
});

// Authenticated-user path.
router.post('/referrals', authenticate, sanitizeStrings(1000), async (req, res) => {
  try {
    const { source, source_url } = req.body || {};
    if (!source && !source_url) {
      return res.status(422).json({ error: 'source or source_url is required.' });
    }
    const result = await referralService.recordReferral({
      userId: req.user.id,
      source,
      sourceUrl: source_url
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[REFERRAL] POST error:', err.message);
    res.status(500).json({ error: 'Failed to record referral.' });
  }
});

// Admin: list sources/links per user (no PII beyond what already exists).
const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/:userId', async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('referral_links')
      .select('id, source, source_url, clicked_at')
      .eq('user_id', req.params.userId)
      .order('clicked_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, links: data || [] });
  } catch (err) {
    console.error('[REFERRAL] list error:', err.message);
    res.status(500).json({ error: 'Failed to load referrals.' });
  }
});

module.exports = { router, adminReferralRoutes: adminRouter };
