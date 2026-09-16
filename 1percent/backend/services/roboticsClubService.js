/* ============================================================
   Robotics Club Service
   ============================================================
   Quick-join memberships by school + school-targeted
   notifications for club admins.
   ============================================================ */

const { adminClient } = require('../config/database');

class RoboticsClubService {
  /** Active schools for the join page dropdown. */
  async getSchools() {
    const { data, error } = await adminClient
      .from('club_schools')
      .select('id, name, district')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /** Add a school (admin). */
  async addSchool(name, district) {
    const clean = String(name || '').trim();
    if (!clean) { const e = new Error('School name is required'); e.status = 400; throw e; }
    const { data, error } = await adminClient
      .from('club_schools')
      .insert({ name: clean, district: district ? String(district).trim() : null })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        const e = new Error('That school already exists.'); e.status = 409; throw e;
      }
      throw error;
    }
    return data;
  }

  /** The current user's membership (with school info), or null. */
  async getMyMembership(userId) {
    const { data, error } = await adminClient
      .from('club_members')
      .select('*, club_schools(name, district)')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  /** Quick join: creates a membership for the user at the chosen school. */
  async join(userId, schoolId, grade, fullName) {
    // Grade/class is required
    if (!grade || !String(grade).trim()) {
      const e = new Error('Please enter your grade or class.'); e.status = 400; throw e;
    }

    // School must exist and be active
    const { data: school, error: schoolErr } = await adminClient
      .from('club_schools')
      .select('id, name')
      .eq('id', schoolId)
      .eq('is_active', true)
      .single();
    if (schoolErr || !school) {
      const e = new Error('Please select a valid school.'); e.status = 400; throw e;
    }

    // Already a member? Keep the original membership (idempotent).
    const existing = await this.getMyMembership(userId);
    if (existing) {
      const e = new Error('You have already joined the robotics club.');
      e.status = 409; e.code = 'ALREADY_MEMBER'; e.membership = existing;
      throw e;
    }

    const { data, error } = await adminClient
      .from('club_members')
      .insert({
        user_id: userId,
        school_id: schoolId,
        grade: String(grade).trim().slice(0, 40),
        status: 'pending'
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        const e = new Error('You have already joined the robotics club.');
        e.status = 409; e.code = 'ALREADY_MEMBER'; throw e;
      }
      throw error;
    }

    // Welcome notification (never fails the join)
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        user_id: userId,
        title: '🤖 Welcome to the Robotics Club!',
        message: `Your membership at ${school.name} is registered. Watch this space for club meetups and build sessions.`,
        type: 'success'
      });
    } catch (e) {
      console.warn('[CLUB] Welcome notification failed:', e.message);
    }

    // Best-effort: save the provided full name on the profile if it's empty
    const cleanName = fullName && String(fullName).trim();
    if (cleanName) {
      try {
        const { data: prof } = await adminClient.from('profiles').select('full_name').eq('id', userId).single();
        if (prof && !prof.full_name) {
          await adminClient.from('profiles').update({ full_name: cleanName.trim().slice(0, 80) }).eq('id', userId);
        }
      } catch (e) { /* cosmetic — ignore */ }
    }

    return data;
  }

  /**
   * Admin: all members with profile + school info.
   * Optional schoolId filter.
   */
  async listMembers({ schoolId = null } = {}) {
    let query = adminClient
      .from('club_members')
      .select('id, user_id, grade, status, joined_at, club_schools(id, name, district), profiles(full_name, email, coins, streak_count)')
      .order('joined_at', { ascending: false });

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(m => ({
      id: m.id,
      user_id: m.user_id,
      name: m.profiles?.full_name || 'Anonymous',
      email: m.profiles?.email || '',
      school: m.club_schools?.name || '',
      school_id: m.club_schools?.id || m.school_id || null,
      grade: m.grade || '',
      status: m.status,
      joined_at: m.joined_at,
      coins: m.profiles?.coins || 0,
      streak: m.profiles?.streak_count || 0
    }));
  }

  /** Member counts per school (for admin stat cards). */
  async getStats() {
    const [{ count: totalMembers }, { data: schools }] = await Promise.all([
      adminClient.from('club_members').select('*', { count: 'exact', head: true }),
      adminClient.from('club_schools').select('id, name').eq('is_active', true)
    ]);

    const perSchool = {};
    try {
      const { data } = await adminClient.from('club_members').select('school_id');
      (data || []).forEach(m => {
        perSchool[m.school_id] = (perSchool[m.school_id] || 0) + 1;
      });
    } catch { /* optional */ }

    return {
      total_members: totalMembers || 0,
      total_schools: (schools || []).length,
      per_school: (schools || []).map(s => ({ id: s.id, name: s.name, members: perSchool[s.id] || 0 }))
    };
  }

  /** Approve / reject a membership (admin). */
  async setMemberStatus(memberId, status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      const e = new Error('Invalid status'); e.status = 400; throw e;
    }
    const { data, error } = await adminClient
      .from('club_members')
      .update({ status })
      .eq('id', memberId)
      .select()
      .single();
    if (error) throw error;

    if (status === 'approved') {
      try {
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          user_id: data.user_id,
          title: '✅ Robotics Club membership approved',
          message: 'You are officially in the club. See you at the next build session!',
          type: 'success'
        });
      } catch { /* optional */ }
    }
    return data;
  }

  /** Remove a member (admin). */
  async removeMember(memberId) {
    const { error } = await adminClient
      .from('club_members')
      .delete()
      .eq('id', memberId);
    if (error) throw error;
    return true;
  }

  /**
   * Send a notification to club members.
   * schoolId=null → every member; otherwise only that school's members.
   */
  async notifyMembers({ schoolId = null, title, message }) {
    if (!title || !message) {
      const e = new Error('Title and message are required'); e.status = 400; throw e;
    }

    let query = adminClient.from('club_members').select('user_id');
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data: members, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((members || []).map(m => m.user_id))];
    if (!userIds.length) return { count: 0 };

    const notificationService = require('./notificationService');
    return notificationService.createBulkNotifications(userIds, {
      title, message, type: 'info'
    });
  }
}

module.exports = new RoboticsClubService();
