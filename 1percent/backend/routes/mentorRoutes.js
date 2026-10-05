/**
 * routes/mentorRoutes.js
 *
 * PURPOSE:
 *   Mentor program routes: assignments, weekly shares, read receipts.
 *
 * ENDPOINTS:
 *   GET /learners
 *   GET /shares
 *   POST /shares/:shareId/read
 *   POST /learners/:learnerId/nudge
 *
 * EXPORTS: mentorRoutes, adminMentorRoutes
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const { authenticate, requireRole, requireAdmin } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');
const emailService = require('../services/emailService');

const mentorService = require('../services/mentorService');
const referralService = require('../services/referralService');
const logService = require('../services/logService');
const { adminClient } = require('../config/database');

const router = Router();
const adminRouter = Router();

/* ── ADMIN ───────────────────────────────────────────── */

adminRouter.use(authenticate, requireAdmin);

adminRouter.put('/users/:userId/role', async (req, res) => {
  try {
    const role = String(req.body?.role || '');
    const user = await mentorService.setUserRole(req.user.id, req.params.userId, role);
    logService.logEvent({
      level: 'info', event: 'mentor_role_changed',
      message: `Role set to '${role}'`, userId: req.params.userId,
      metadata: { by: req.user.id, role }
    }).catch(() => {});
    res.json({ success: true, user });
  } catch (err) {
    console.error('[MENTOR] Role change error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to change role.' });
  }
});

adminRouter.get('/learners', async (req, res) => {
  try {
    const mentors = await mentorService.listMentors();
    const overview = await mentorService.getAdminOverview();
    res.json({ success: true, mentors, overview });
  } catch (err) {
    console.error('[MENTOR] List error:', err.message);
    res.status(500).json({ error: 'Failed to load mentors.' });
  }
});

adminRouter.post('/assignments', async (req, res) => {
  try {
    const { mentor_id, learner_id } = req.body || {};
    if (!mentor_id || !learner_id) return res.status(422).json({ error: 'mentor_id and learner_id are required.' });
    const result = await mentorService.assignLearner(req.user.id, mentor_id, learner_id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to assign learner.' });
  }
});

adminRouter.delete('/assignments/:mentorId/:learnerId', async (req, res) => {
  try {
    const result = await mentorService.unassignLearner(req.params.mentorId, req.params.learnerId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to unassign learner.' });
  }
});

adminRouter.post('/weekly-share', sanitizeStrings(5000), async (req, res) => {
  try {
    const { course_id, title, message, mentor_ids } = req.body || {};
    const result = await mentorService.createWeeklyShare(req.user.id, { course_id, title, message, mentor_ids });
    logService.logEvent({
      level: 'info', event: 'mentor_weekly_share_created',
      message: `Weekly share: ${title}`, userId: req.user.id,
      metadata: { recipients: result.recipients }
    }).catch(() => {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create share.' });
  }
});

/* ── MENTOR ──────────────────────────────────────────── */

router.use(authenticate, requireRole('mentor', 'admin'));

router.get('/learners', async (req, res) => {
  try {
    const learners = await mentorService.getLearnerProgress(req.user.id);
    res.json({ success: true, learners });
  } catch (err) {
    console.error('[MENTOR] Learner progress error:', err.message);
    res.status(500).json({ error: 'Failed to load learner progress.' });
  }
});

router.get('/shares', async (req, res) => {
  try {
    const shares = await mentorService.getWeeklyShares(req.user.id);
    res.json({ success: true, shares });
  } catch (err) {
    console.error('[MENTOR] Shares error:', err.message);
    res.status(500).json({ error: 'Failed to load weekly shares.' });
  }
});

router.post('/shares/:shareId/read', async (req, res) => {
  try {
    const result = await mentorService.markShareRead(req.user.id, req.params.shareId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: 'Failed to mark share read.' });
  }
});

router.post('/learners/:learnerId/nudge', sanitizeStrings(500), async (req, res) => {
  try {
    const result = await mentorService.nudgeLearner(req.user.id, req.params.learnerId, req.body?.message);
    logService.logEvent({
      level: 'info', event: 'mentor_nudge_sent',
      message: 'Mentor nudged a learner', userId: req.user.id,
      metadata: { learner_id: req.params.learnerId }
    }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('[MENTOR] Nudge error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to send nudge.' });
  }
});

// ── Referral: where did they hear from? (mentor-facing) ──
router.post('/referrals/record', authenticate, sanitizeStrings(1000), async (req, res) => {
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
    console.error('[MENTOR] Referral record error:', err.message);
    res.status(500).json({ error: 'Failed to record referral.' });
  }
});

router.get('/learners/:learnerId/referrals', authenticate, async (req, res) => {
  try {
    const { data, error } = await adminClient
      .from('referral_links')
      .select('id, source, source_url, clicked_at')
      .eq('user_id', req.params.learnerId)
      .order('clicked_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, referrals: data || [] });
  } catch (err) {
    console.error('[MENTOR] Referral list error:', err.message);
    res.status(500).json({ error: 'Failed to load referrals.' });
  }
});

/* ── MENTOR EMAIL ──────────────────────────────────────────── */
router.post('/learners/:learnerId/email', authenticate, sanitizeStrings(3000), async (req, res) => {
  try {
    const { subject, body } = req.body || {};
    if (!subject || !body) {
      return res.status(422).json({ error: 'subject and body are required.' });
    }
    const result = await mentorService.sendLearnerEmail(req.user.id, req.params.learnerId, subject, body);
    if (result.rateLimited) {
      return res.status(429).json({ success: true, rateLimited: true });
    }
    res.json({ success: true, recipient: result.recipient, sent: result.sent });
  } catch (err) {
    console.error('[MENTOR] Email error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to send email.' });
  }
});

module.exports = { mentorRoutes: router, adminMentorRoutes: adminRouter };
