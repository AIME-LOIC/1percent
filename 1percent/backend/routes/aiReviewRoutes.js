/* ============================================================
   AI Review Routes — admin governance + student visibility
   ============================================================
   Admin:
     GET    /api/admin/ai-reviews?status=pending   → queue
     GET    /api/admin/ai-reviews/pending-count    → sidebar badge
     POST   /api/admin/ai-reviews/:id/decide       → { decision: approve|reject, note? }
   Student:
     GET    /api/ai-reviews/mine/:challengeId      → own latest review
   ============================================================ */

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const aiReviewService = require('../services/aiReviewService');

const router = Router();
const adminOnly = requireAdmin;

/* ── Admin: list the queue ── */
router.get('/admin/ai-reviews', authenticate, adminOnly, async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'applied', 'rejected', 'superseded', 'all'].includes(req.query.status)
      ? req.query.status : 'pending';
    const reviews = await aiReviewService.listByStatus(status, Number(req.query.limit) || 50);
    res.json({ reviews });
  } catch (err) { next(err); }
});

/* ── Admin: pending badge count ── */
router.get('/admin/ai-reviews/pending-count', authenticate, adminOnly, async (req, res, next) => {
  try {
    res.json({ count: await aiReviewService.pendingCount() });
  } catch (err) { next(err); }
});

/* ── Admin: approve / reject ── */
router.post('/admin/ai-reviews/:id/decide', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { decision, note } = req.body || {};
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(422).json({ error: 'decision must be "approve" or "reject"' });
    }
    const result = await aiReviewService.decide(req.params.id, req.user.id, decision, note || '');
    res.json({ success: true, ...result });
  } catch (err) {
    if (/not found|already decided/.test(err.message)) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

/* ── Student: see the AI's review of their own submission ── */
router.get('/mine/:challengeId', authenticate, async (req, res, next) => {
  try {
    const review = await aiReviewService.getOwn(req.user.id, req.params.challengeId);
    res.json({ review });
  } catch (err) { next(err); }
});

/* ── Admin: retrain the model on the current course corpus ──
   Re-runs the training pipeline (reads courses, lessons,
   challenges, solved submissions) and compiles a fresh
   model.json. The reviewer hot-reloads it on the next review. */
router.post('/admin/rebuild-model', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { trainModel } = require('../ai/train');
    const model = await trainModel({ verbose: false });
    // Record the version for auditability
    await aiReviewService.recordModelVersion(model, req.user.id);
    res.json({ success: true, trainedAt: model.trainedAt, stats: model.stats });
  } catch (err) {
    console.error('[AI-REVIEW] rebuild failed:', err.message);
    res.status(500).json({ error: 'Model rebuild failed: ' + err.message });
  }
});

module.exports = router;
