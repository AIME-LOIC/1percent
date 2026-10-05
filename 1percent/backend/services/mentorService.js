/**
 * services/mentorService.js
 *
 * PURPOSE:
 *   Mentor program: mentor↔learner assignments, weekly share composition, per-mentor read receipts.
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { adminClient } = require('../config/database');
const notificationService = require('./notificationService');

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
    const mentors = data || [];
    if (!mentors.length) return mentors;

    // Assignment counts per mentor (for the admin Mentors panel)
    const { data: assignments, error: aErr } = await adminClient
      .from('mentor_assignments')
      .select('mentor_id');
    if (aErr || !assignments) return mentors;
    const counts = {};
    assignments.forEach(a => { counts[a.mentor_id] = (counts[a.mentor_id] || 0) + 1; });
    return mentors.map(m => ({ ...m, learner_count: counts[m.id] || 0 }));
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

  /* ---------- MENTOR: nudge a learner ---------- */

  /**
   * Mentor sends an encouragement nudge to one of their assigned learners.
   * Creates an in-app notification; rate limited to 3 per learner per 24h.
   */
  async nudgeLearner(mentorId, learnerId, message) {
    // Verify the learner is actually assigned to this mentor
    const { data: assignment, error: aErr } = await adminClient
      .from('mentor_assignments')
      .select('learner_id')
      .eq('mentor_id', mentorId)
      .eq('learner_id', learnerId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) throw new Error('This learner is not assigned to you.');

    // Rate limit: max 3 nudges per learner per 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', learnerId)
      .eq('type', 'mentor_nudge')
      .gte('created_at', since);
    if ((recent || 0) >= 3) {
      throw new Error('You already sent 3 nudges to this learner today. Try again tomorrow.');
    }

    const { data: mentor, error: mErr } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', mentorId)
      .single();
    if (mErr) throw mErr;
    const mentorName = mentor?.full_name || 'Your mentor';
    const finalMessage = (message && String(message).trim())
      ? String(message).trim().slice(0, 300)
      : 'Keep going — your mentor is cheering you on! 🎯';

    const notification = await notificationService.createNotification({
      user_id: learnerId,
      title: `Nudge from ${mentorName}`,
      message: finalMessage,
      type: 'mentor_nudge',
      link: '/dashboard'
    });
    return { success: true, notification };
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

  /**
   * Mentor sends an email to an assigned learner.
   * - Verifies the learner is assigned to this mentor.
   * - Rate limits to 1 per learner per 3h (buffered by the 24h
   *   referral cooldown) and one per mentor per 24h.
   * - Sends Brevo to the learner's stored email.
   * - ALWAYS creates an in-app mentor_email notification.
   *
   * Returns { success, recipient, rateLimited, sent }.
   */
  async sendLearnerEmail(mentorId, learnerId, subject, body) {
    // 1. Verify the learner is assigned to this mentor
    const { data: assignment, error: aErr } = await adminClient
      .from('mentor_assignments')
      .select('learner_id')
      .eq('mentor_id', mentorId)
      .eq('learner_id', learnerId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) throw new Error('This learner is not assigned to you.');

    // 2. Rate limit: 1 email per learner per 3h (buffered behind the
    //    24h referral cooldown), plus 1 per mentor per 24h.
    const since3h = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { count: recent3h } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', learnerId)
      .eq('type', 'mentor_email')
      .gte('created_at', since3h);
    if ((recent3h || 0) >= 1) {
      return { success: true, recipient: learnerId, rateLimited: true, sent: false };
    }

    const { count: recent24h } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', learnerId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if ((recent24h || 0) >= 1) {
      return { success: true, recipient: learnerId, rateLimited: true, sent: false };
    }

    // 3. Resolve the learner's current email
    const { data: learner, error: lErr } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', learnerId)
      .single();
    if (lErr) throw lErr;
    const recipientEmail = learner?.email;
    if (!recipientEmail) {
      return { success: true, recipient: learnerId, rateLimited: false, sent: false };
    }

    // 4. Send via Brevo (guarded in try/catch; a failure never kills
    //    the in-app notification below)
    let sentToBrevo = false;
    try {
      const emailService = require('./emailService');
      const apiKey = process.env.BREVO_API_KEY;
      if (!apiKey) {
        console.error('[MENTOR_EMAIL] BREVO_API_KEY not configured; skipping Brevo send.');
      } else {
        const fromRaw = process.env.EMAIL_FROM || process.env.CONTACT_EMAIL || '';
        const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(fromRaw.trim());
        const from = m ? { name: m[1].trim(), email: m[2].trim() } : { name: '1% Learn', email: fromRaw.trim() };
        const msg = {
          sender: from,
          subject: String(subject || '').slice(0, 200),
          htmlContent: emailService._render(String(body || '').replace(/<br\s*/i, '<br>')),
          to: [{ email: recipientEmail, name: learner?.full_name || '' }]
        };
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify(msg)
        });
        if (resp.ok) {
          sentToBrevo = true;
        } else {
          const detail = await resp.text().catch(() => '');
          console.error('[MENTOR_EMAIL] Brevo failed:', resp.status, detail.slice(0, 300));
        }
      }
    } catch (e) {
      console.error('[MENTOR_EMAIL] Brevo request error:', e.message);
    }

    // 5. ALWAYS create the in-app mentor_email notification (rate-limited)
    const { data: mentor, error: mErr } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', mentorId)
      .single();
    if (mErr) throw mErr;
    const mentorName = mentor?.full_name || 'Your mentor';
    const notification = await notificationService.createNotification({
      user_id: learnerId,
      title: `Email from ${mentorName}`,
      message: String(body || '').slice(0, 300),
      type: 'mentor_email',
      link: '/dashboard'
    });

    return { success: true, recipient: learnerId, rateLimited: false, sent: sentToBrevo, notification };
  }

  async getAdminOverview() {
    const mentors = await this.listMentors();
    const { count: assignments } = await adminClient
      .from('mentor_assignments')
      .select('*', { count: 'exact', head: true });
    return { mentors: mentors.length, assignments: assignments || 0 };
  }
}

module.exports = new MentorService();
