/* ============================================================
   Mentor Service — mentor program data access
   ============================================================
   • Admin promotes/demotes mentors via profiles.role.
   • Admin assigns learners to mentors (mentor_assignments).
   • Mentor reads ONLY their assigned learners' progress.
   • Admin shares a weekly course/activity note with mentors.
   ============================================================ */

const { adminClient } = require('../config/database');

class MentorService {
  /* ---------- ADMIN: role management ---------- */

  async setUserRole(adminUserId, targetUserId, role) {
    const allowed = ['student', 'mentor', 'admin'];
    if (!allowed.includes(role)) throw new Error('Invalid role');
    if (targetUserId === adminUserId) throw new Error('You cannot change your own role');

    const { data, error } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', targetUserId)
      .select('id, full_name, email, role')
      .single();
    if (error) throw error;
    return data;
  }

  async listMentors() {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('role', 'mentor')
      .order('full_name');
    if (error) throw error;
    return data || [];
  }

  /* ---------- ADMIN: assignments ---------- */

  async assignLearner(adminUserId, mentorId, learnerId) {
    // Validate mentor + learner roles
    const { data: mentor } = await adminClient
      .from('profiles').select('id, role').eq('id', mentorId).single();
    if (!mentor || mentor.role !== 'mentor') throw new Error('Target user is not a mentor');

    const { error } = await adminClient
      .from('mentor_assignments')
      .upsert({ mentor_id: mentorId, learner_id: learnerId, assigned_by: adminUserId },
        { onConflict: 'mentor_id,learner_id' });
    if (error) throw error;
    return { success: true };
  }

  async unassignLearner(mentorId, learnerId) {
    const { error } = await adminClient
      .from('mentor_assignments')
      .delete()
      .eq('mentor_id', mentorId)
      .eq('learner_id', learnerId);
    if (error) throw error;
    return { success: true };
  }

  async getMentorLearnerIds(mentorId) {
    const { data, error } = await adminClient
      .from('mentor_assignments')
      .select('learner_id')
      .eq('mentor_id', mentorId);
    if (error) throw error;
    return (data || []).map(r => r.learner_id);
  }

  /* ---------- MENTOR: learner progress ---------- */

  async getLearnerProgress(mentorId) {
    const learnerIds = await this.getMentorLearnerIds(mentorId);
    if (!learnerIds.length) return [];

    const { data: learners, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, coins')
      .in('id', learnerIds)
      .order('full_name');
    if (error) throw error;

    return Promise.all((learners || []).map(async (l) => {
      // Enrollments + course titles
      const { data: enrollments } = await adminClient
        .from('enrollments')
        .select('course_id, enrolled_at, completed_at, courses(title, slug)')
        .eq('user_id', l.id);

      const courseIds = (enrollments || []).map(e => e.course_id);
      const [{ data: lessons }, { data: progress }, { data: submissions }] = await Promise.all([
        courseIds.length
          ? adminClient.from('lessons').select('id, course_id').in('course_id', courseIds).eq('is_published', true)
          : Promise.resolve({ data: [] }),
        adminClient.from('lesson_progress').select('lesson_id, completed_at')
          .eq('user_id', l.id).eq('completed', true),
        adminClient.from('challenge_submissions').select('challenge_id, passed, submitted_at')
          .eq('user_id', l.id)
      ]);

      const lessonIdsByCourse = {};
      (lessons || []).forEach(ls => {
        (lessonIdsByCourse[ls.course_id] = lessonIdsByCourse[ls.course_id] || []).push(ls.id);
      });
      const doneSet = new Set((progress || []).map(p => p.lesson_id));

      const coursesOut = (enrollments || []).map(e => {
        const total = (lessonIdsByCourse[e.course_id] || []).length;
        const done = (lessonIdsByCourse[e.course_id] || []).filter(id => doneSet.has(id)).length;
        return {
          title: e.courses?.title || 'Course',
          slug: e.courses?.slug || '',
          enrolled_at: e.enrolled_at,
          completed: !!e.completed_at,
          lessons_done: done,
          lessons_total: total,
          percent: total ? Math.round((done / total) * 100) : 0
        };
      });

      return {
        id: l.id,
        full_name: l.full_name || l.email,
        email: l.email,
        coins: l.coins || 0,
        courses: coursesOut,
        challenges_passed: (submissions || []).filter(s => s.passed).length,
        challenges_attempted: (submissions || []).length,
        last_activity: (submissions || []).map(s => s.submitted_at)
          .concat((progress || []).map(p => p.completed_at))
          .filter(Boolean).sort().pop() || null
      };
    }));
  }

  /* ---------- MENTOR: weekly shares ---------- */

  async getWeeklyShares(mentorId, limit = 10) {
    const { data: recips, error } = await adminClient
      .from('mentor_weekly_share_recipients')
      .select('share_id, read_at')
      .eq('mentor_id', mentorId);
    if (error) throw error;
    const shareIds = (recips || []).map(r => r.share_id);
    if (!shareIds.length) return [];

    const { data: shares } = await adminClient
      .from('mentor_weekly_shares')
      .select('id, title, message, course_id, created_at, courses(title, slug), profiles!mentor_weekly_shares_created_by_fkey(full_name)')
      .in('id', shareIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      // FK name may differ — fall back without the join
      const { data: plain } = await adminClient
        .from('mentor_weekly_shares')
        .select('id, title, message, course_id, created_at')
        .in('id', shareIds)
        .order('created_at', { ascending: false })
        .limit(limit);
      const readMap = new Map((recips || []).map(r => [r.share_id, r.read_at]));
      return (plain || []).map(s => ({ ...s, course_title: '', shared_by: '', read_at: readMap.get(s.id) || null }));
    }
    const readMap = new Map((recips || []).map(r => [r.share_id, r.read_at]));
    return (shares || []).map(s => ({
      id: s.id,
      title: s.title,
      message: s.message,
      created_at: s.created_at,
      course_title: s.courses?.title || '',
      course_slug: s.courses?.slug || '',
      shared_by: s.profiles?.full_name || 'Admin',
      read_at: readMap.get(s.id) || null
    }));
  }

  async markShareRead(mentorId, shareId) {
    await adminClient
      .from('mentor_weekly_share_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('share_id', shareId)
      .eq('mentor_id', mentorId);
    return { success: true };
  }

  /* ---------- ADMIN: create weekly share ---------- */

  async createWeeklyShare(adminUserId, { course_id, title, message, mentor_ids }) {
    if (!title || !String(title).trim()) throw new Error('Title is required');

    let recipients = mentor_ids;
    if (!Array.isArray(recipients) || !recipients.length) {
      // Empty = all mentors
      recipients = (await this.listMentors()).map(m => m.id);
    }
    if (!recipients.length) throw new Error('No mentors to share with');

    const { data: share, error } = await adminClient
      .from('mentor_weekly_shares')
      .insert({ course_id: course_id || null, title, message: message || '', created_by: adminUserId })
      .select('id')
      .single();
    if (error) throw error;

    await adminClient
      .from('mentor_weekly_share_recipients')
      .insert(recipients.map(mid => ({ share_id: share.id, mentor_id: mid })));

    return { success: true, share_id: share.id, recipients: recipients.length };
  }

  /* ---------- ADMIN: overview ---------- */

  async getAdminOverview() {
    const mentors = await this.listMentors();
    const { count: assignments } = await adminClient
      .from('mentor_assignments')
      .select('*', { count: 'exact', head: true });
    return { mentors: mentors.length, assignments: assignments || 0 };
  }
}

module.exports = new MentorService();
