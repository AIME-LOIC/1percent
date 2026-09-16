/* ============================================================
   Mentor Routes
   ============================================================
   ADMIN (mounted under /api/admin/mentor):
     PUT  /users/:userId/role          → promote/demote (student|mentor|admin)
     GET  /learners                    → mentor list + assignments overview
     POST /assignments                 → assign learner to mentor
     DELETE /assignments/:mentorId/:learnerId
     POST /weekly-share                → share weekly course/activity

   MENTOR (mounted under /api/mentor):
     GET  /learners                    → assigned learners' progress
     GET  /shares                      → weekly shares for me
     POST /shares/:shareId/read       → mark one share read
     POST /learners/:learnerId/nudge  → send an encouragement nudge
   ============================================================ */

const { Router } = require('express');
const { authenticate, requireRole, requireAdmin } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');
const mentorService = require('../services/mentorService');
const logService = require('../services/logService');

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

module.exports = { mentorRoutes: router, adminMentorRoutes: adminRouter };
