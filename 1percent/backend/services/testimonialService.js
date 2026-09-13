/* ============================================================
   Student Testimonials Service
   ============================================================
   Students submit a short testimonial about learning with
   1Percent. Submissions start as 'pending'; admins approve and
   only approved rows are shown on public pages.

   Status values: 'pending' | 'approved' | 'rejected'
   ============================================================ */

const { adminClient } = require('../config/database');

class TestimonialService {
  /** Public: latest approved testimonials (safe fields only). */
  async getApproved(limit = 12) {
    const { data, error } = await adminClient
      .from('student_testimonials')
      .select('display_name, role, quote, rating, approved_at')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(Math.min(Math.max(1, limit), 24));

    if (error) throw error;
    return data || [];
  }

  /** Submit (or replace) the caller's pending testimonial. */
  async submit(userId, { quote, rating, display_name, role }) {
    // Replace any previous pending submission (only one pending per user).
    await adminClient
      .from('student_testimonials')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending');

    const { data, error } = await adminClient
      .from('student_testimonials')
      .insert({
        user_id: userId,
        quote: String(quote).trim().slice(0, 600),
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        display_name: String(display_name || '').trim().slice(0, 60),
        role: String(role || '').trim().slice(0, 80),
        status: 'pending'
      })
      .select('id, status, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  /** The caller's own testimonial (any status). */
  async getMine(userId) {
    const { data, error } = await adminClient
      .from('student_testimonials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // ignore "no rows"
    return data || null;
  }

  async deleteMine(userId) {
    const { error } = await adminClient
      .from('student_testimonials')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return true;
  }

  /** Admin: list all testimonials. */
  async getAll() {
    const { data, error } = await adminClient
      .from('student_testimonials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  }

  /** Admin: approve or reject. */
  async setStatus(id, status) {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new Error('Invalid status');
    }
    const { data, error } = await adminClient
      .from('student_testimonials')
      .update({ status })
      .eq('id', id)
      .select('id, status, approved_at')
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = new TestimonialService();
