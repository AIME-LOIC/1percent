/* ============================================================
   Robotics Club Controller
   ============================================================
   Public/authed (students):  schools, join, my membership
   Admin:                     members, stats, status, notify
   ============================================================ */

const roboticsClubService = require('../services/roboticsClubService');
const { authenticate, requireRole } = require('../middlewares/auth');
const { sanitizeStrings } = require('../middlewares/validate');
const { Router } = require('express');

class RoboticsClubController {
  /** GET /api/robotics-club/schools — public list for the join page */
  async getSchools(req, res) {
    try {
      const schools = await roboticsClubService.getSchools();
      res.json({ success: true, schools });
    } catch (err) {
      console.error('[CLUB] Schools error:', err.message);
      res.json({ success: true, schools: [] });
    }
  }

  /** GET /api/robotics-club/me — current user's membership */
  async getMyMembership(req, res) {
    try {
      const membership = await roboticsClubService.getMyMembership(req.user.id);
      res.json({ success: true, membership });
    } catch (err) {
      console.error('[CLUB] Membership error:', err.message);
      res.json({ success: true, membership: null });
    }
  }

  /** POST /api/robotics-club/join — quick join with a school */
  async join(req, res) {
    try {
      const { school_id: schoolId, grade, full_name: fullName } = req.body;
      if (!schoolId) {
        return res.status(400).json({ error: 'Please select your school.' });
      }
      if (!grade || !String(grade).trim()) {
        return res.status(400).json({ error: 'Please enter your grade or class.' });
      }
      const membership = await roboticsClubService.join(req.user.id, schoolId, grade, fullName);
      res.status(201).json({ success: true, membership });
    } catch (err) {
      if (err.code === 'ALREADY_MEMBER') {
        return res.status(409).json({ error: err.message, membership: err.membership || null });
      }
      console.error('[CLUB] Join error:', err.message);
      res.status(err.status || 500).json({ error: err.message || 'Failed to join the club.' });
    }
  }

  /** GET /api/robotics-club/admin/members?school_id=… */
  async listMembers(req, res) {
    try {
      const members = await roboticsClubService.listMembers({ schoolId: req.query.school_id || null });
      res.json({ success: true, members });
    } catch (err) {
      console.error('[CLUB] Members error:', err.message);
      res.json({ success: true, members: [], error: err.message });
    }
  }

  /** GET /api/robotics-club/admin/stats */
  async getStats(req, res) {
    try {
      const stats = await roboticsClubService.getStats();
      res.json({ success: true, ...stats });
    } catch (err) {
      console.error('[CLUB] Stats error:', err.message);
      res.json({ success: true, total_members: 0, total_schools: 0, per_school: [] });
    }
  }

  /** POST /api/robotics-club/admin/schools — add a school */
  async addSchool(req, res) {
    try {
      const { name, district } = req.body;
      const school = await roboticsClubService.addSchool(name, district);
      res.status(201).json({ success: true, school });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to add school.' });
    }
  }

  /** PUT /api/robotics-club/admin/members/:memberId/status */
  async setMemberStatus(req, res) {
    try {
      const member = await roboticsClubService.setMemberStatus(req.params.memberId, req.body.status);
      res.json({ success: true, member });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to update member.' });
    }
  }

  /** DELETE /api/robotics-club/admin/members/:memberId */
  async removeMember(req, res) {
    try {
      await roboticsClubService.removeMember(req.params.memberId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove member.' });
    }
  }

  /** POST /api/robotics-club/admin/notify — notify all or one school */
  async notifyMembers(req, res) {
    try {
      const { school_id: schoolId, title, message } = req.body;
      const result = await roboticsClubService.notifyMembers({ schoolId, title, message });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to send notification.' });
    }
  }
}

/* Routes are exported together with the controller — one file, one mount. */
const roboticsClubController = new RoboticsClubController();
const router = Router();

// Student-facing
router.get('/schools', (req, res, next) => roboticsClubController.getSchools(req, res, next));
router.get('/me', authenticate, (req, res, next) => roboticsClubController.getMyMembership(req, res, next));
router.post('/join', authenticate, sanitizeStrings(200), (req, res, next) => roboticsClubController.join(req, res, next));

// Admin
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/members', (req, res, next) => roboticsClubController.listMembers(req, res, next));
adminRouter.get('/stats', (req, res, next) => roboticsClubController.getStats(req, res, next));
adminRouter.post('/schools', sanitizeStrings(200), (req, res, next) => roboticsClubController.addSchool(req, res, next));
adminRouter.put('/members/:memberId/status', sanitizeStrings(100), (req, res, next) => roboticsClubController.setMemberStatus(req, res, next));
adminRouter.delete('/members/:memberId', (req, res, next) => roboticsClubController.removeMember(req, res, next));
adminRouter.post('/notify', sanitizeStrings(2000), (req, res, next) => roboticsClubController.notifyMembers(req, res, next));

module.exports = roboticsClubController;
module.exports.roboticsClubRouter = router;
module.exports.roboticsClubAdminRouter = adminRouter;
