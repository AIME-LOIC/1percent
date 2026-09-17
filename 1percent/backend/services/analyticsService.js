/**
 * services/analyticsService.js
 *
 * PURPOSE:
 *   Admin analytics aggregation: signups, active users, enrollments, completion rates, coin flow,
 *   and revenue — computed with SQL aggregates over the service-role client.
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient } = require('../config/database');

/* Rwanda-local YYYY-MM-DD for "today", same convention as streakService */
const APP_TIMEZONE = 'Africa/Kigali';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit'
});

function _today() {
  return dateFormatter.format(new Date());
}

function _dayKey(d) {
  return dateFormatter.format(d);
}

/** Array of the last N days as YYYY-MM-DD strings, oldest first. */
function _lastNDays(n) {
  const out = [];
  const base = new Date(_today() + 'T00:00:00Z').getTime();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(base - i * 86400000).toISOString().split('T')[0]);
  }
  return out;
}

/** Count rows in a table, optionally filtered. Errors → 0. */
async function _count(table, filterFn) {
  try {
    let q = adminClient.from(table).select('*', { count: 'exact', head: true });
    if (filterFn) q = filterFn(q);
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

class AnalyticsService {
  async getOverview() {
    const days = 14;

    /* ---------- Totals (parallel, all degrade to 0) ---------- */
    const [
      totalUsers, totalStudents, totalMentors,
      totalCourses, publishedCourses,
      totalEnrollments, completedEnrollments, totalLessons, totalChallenges,
      totalSubmissions, passedSubmissions, totalCertificates,
      beginnerCourses, intermediateCourses, advancedCourses,
      premiumUsers, activeToday
    ] = await Promise.all([
      _count('profiles'),
      _count('profiles', q => q.eq('role', 'student')),
      _count('profiles', q => q.eq('role', 'mentor')),
      _count('courses'),
      _count('courses', q => q.eq('is_published', true)),
      _count('enrollments'),
      _count('enrollments', q => q.not('completed_at', 'is', null)),
      _count('lessons'),
      _count('challenges', q => q.eq('is_active', true)),
      _count('challenge_submissions'),
      _count('challenge_submissions', q => q.eq('passed', true)),
      _count('certificates'),
      _count('courses', q => q.eq('level', 'beginner')),
      _count('courses', q => q.eq('level', 'intermediate')),
      _count('courses', q => q.eq('level', 'advanced')),
      _count('user_subscriptions', q => q.eq('is_active', true)),
      _count('profiles', q => q.gte('updated_at', _today() + 'T00:00:00'))
    ]);

    const totals = {
      users: totalUsers,
      students: totalStudents,
      mentors: totalMentors,
      courses: totalCourses,
      published_courses: publishedCourses,
      enrollments: totalEnrollments,
      completed_enrollments: completedEnrollments,
      lessons: totalLessons,
      challenges: totalChallenges,
      submissions: totalSubmissions,
      passed_submissions: passedSubmissions,
      certificates: totalCertificates,
      premium_users: premiumUsers,
      active_today: activeToday
    };

    /* ---------- Daily signup counts (14 days) ----------
       created_at is timestamptz — filter with a proper ISO lower bound. */
    const since14 = new Date(new Date(_today() + 'T00:00:00Z').getTime() - (days - 1) * 86400000).toISOString();
    const [signupsRes, completionsRes, submissionsRes] = await Promise.all([
      adminClient.from('profiles').select('created_at').gte('created_at', since14),
      adminClient.from('lesson_progress').select('completed_at').eq('completed', true).gte('completed_at', since14),
      adminClient.from('challenge_submissions').select('submitted_at').gte('submitted_at', since14)
    ]);

    const signupCounts = {};
    (signupsRes.data || []).forEach(r => {
      if (!r.created_at) return;
      const k = _dayKey(new Date(r.created_at));
      signupCounts[k] = (signupCounts[k] || 0) + 1;
    });

    const completionCounts = {};
    (completionsRes.data || []).forEach(r => {
      if (!r.completed_at) return;
      const k = _dayKey(new Date(r.completed_at));
      completionCounts[k] = (completionCounts[k] || 0) + 1;
    });

    const submissionCounts = {};
    (submissionsRes.data || []).forEach(r => {
      if (!r.submitted_at) return;
      const k = _dayKey(new Date(r.submitted_at));
      submissionCounts[k] = (submissionCounts[k] || 0) + 1;
    });

    const dayKeys = _lastNDays(days);
    const signups = dayKeys.map(d => ({ date: d, count: signupCounts[d] || 0 }));
    const completions = dayKeys.map(d => ({ date: d, count: completionCounts[d] || 0 }));
    const submissions = dayKeys.map(d => ({ date: d, count: submissionCounts[d] || 0 }));

    /* ---------- Top courses by enrollment (bar chart) ---------- */
    let topCourses = [];
    try {
      const { data } = await adminClient
        .from('enrollments')
        .select('course_id');
      if (data) {
        const counts = {};
        data.forEach(e => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
        const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
        if (ids.length) {
          const { data: courses } = await adminClient
            .from('courses')
            .select('id, title, icon')
            .in('id', ids);
          const byId = {};
          (courses || []).forEach(c => { byId[c.id] = c; });
          topCourses = ids.map(id => ({
            title: byId[id]?.title || 'Unknown course',
            icon: byId[id]?.icon || 'book-open',
            enrollments: counts[id] || 0
          }));
        }
      }
    } catch { /* chart data is optional */ }

    /* ---------- Weekly comparison (this week vs last week) ---------- */
    const weekNow = completions.slice(-7).reduce((s, d) => s + d.count, 0);
    const weekPrev = completions.slice(-14, -7).reduce((s, d) => s + d.count, 0);

    return {
      totals,
      charts: {
        signups,
        completions,
        submissions,
        course_levels: {
          beginner: beginnerCourses,
          intermediate: intermediateCourses,
          advanced: advancedCourses
        },
        top_courses: topCourses
      },
      week_completions: weekNow,
      prev_week_completions: weekPrev
    };
  }
}

module.exports = new AnalyticsService();
