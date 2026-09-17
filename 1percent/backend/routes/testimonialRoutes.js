/**
 * routes/testimonialRoutes.js
 *
 * PURPOSE:
 *   Testimonial routes: submit (pending), own status, public approved feed, admin moderation.
 *
 * ENDPOINTS:
 *   GET /
 *   GET /mine
 *   POST /
 *   DELETE /mine
 *
 * EXPORTS: adminTestimonialRoutes, router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const testimonialService = require('../services/testimonialService');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');

const router = Router();

/* ── Public ─────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 12;
    const items = await testimonialService.getApproved(limit);
    res.json({ success: true, testimonials: items });
  } catch (err) {
    console.error('[TESTIMONIALS] Public list failed:', err.message);
    res.json({ success: true, testimonials: [] }); // fail open, keep pages working
  }
});

/* ── User (auth required) ───────────────────────────── */
router.get('/mine', authenticate, async (req, res) => {
  try {
    const mine = await testimonialService.getMine(req.user.id);
    res.json({ success: true, testimonial: mine });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load your testimonial' });
  }
});

router.post('/', authenticate, sanitizeStrings(600), async (req, res) => {
  try {
    const { quote, rating, display_name, role } = req.body || {};
    if (!quote || String(quote).trim().length < 30) {
      return res.status(400).json({ success: false, error: 'Testimonial must be at least 30 characters' });
    }
    const item = await testimonialService.submit(req.user.id, { quote, rating, display_name, role });
    res.json({ success: true, testimonial: item, message: 'Thanks! Your testimonial was submitted for review.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not submit testimonial' });
  }
});

router.delete('/mine', authenticate, async (req, res) => {
  try {
    await testimonialService.deleteMine(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not withdraw testimonial' });
  }
});

/* ── Admin ──────────────────────────────────────────── */
const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/', async (req, res) => {
  try {
    const items = await testimonialService.getAll();
    res.json({ success: true, testimonials: items });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load testimonials' });
  }
});

adminRouter.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const item = await testimonialService.setStatus(req.params.id, status);
    res.json({ success: true, testimonial: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Could not update testimonial' });
  }
});

module.exports = router;
module.exports.adminTestimonialRoutes = adminRouter;
