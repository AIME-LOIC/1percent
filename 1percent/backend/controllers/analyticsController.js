/* ============================================================
   Analytics Controller — feeds the admin dashboard charts
   ============================================================ */

const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  /**
   * GET /api/admin/analytics
   * Platform-wide stats + time-series for the admin dashboard charts.
   */
  async getOverview(req, res) {
    try {
      const data = await analyticsService.getOverview();
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('[ANALYTICS] Overview error:', err.message);
      // Never break the dashboard — return an empty but valid payload.
      res.json({
        success: true,
        totals: {},
        charts: {
          signups: [], completions: [], submissions: [],
          course_levels: { beginner: 0, intermediate: 0, advanced: 0 },
          top_courses: []
        },
        week_completions: 0,
        prev_week_completions: 0,
        error: err.message
      });
    }
  }
}

module.exports = new AnalyticsController();
