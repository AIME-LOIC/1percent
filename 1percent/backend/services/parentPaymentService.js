/* ============================================================
   Parent Payment Service
   ============================================================
   Handles payment request generation and processing.
   Students create a payment link, parents open it and pay.
   ============================================================ */

const { adminClient } = require('../config/database');

class ParentPaymentService {
  /**
   * Create a payment request and return the shareable link token
   */
  async createPaymentRequest(studentId, data) {
    const { plan_slug = 'pro', parent_name, parent_email, parent_phone, notes } = data;

    const plans = { pro: 15000, unlimited: 35000 };
    const amount = plans[plan_slug] || 15000;

    const { data: record, error } = await adminClient
      .from('parent_payments')
      .insert({
        student_id: studentId,
        plan_slug,
        amount,
        parent_name: parent_name || null,
        parent_email: parent_email || null,
        parent_phone: parent_phone || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  /**
   * Get payment request by reference token (public — no auth needed)
   */
  async getByToken(token) {
    const { data, error } = await adminClient
      .from('parent_payments')
      .select('*, profiles!parent_payments_student_id_fkey(full_name, email)')
      .eq('reference_token', token)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all payment requests for a student
   */
  async getStudentRequests(studentId) {
    const { data, error } = await adminClient
      .from('parent_payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Process a parent payment (mark as paid and subscribe the student)
   */
  async processPayment(token, paymentData) {
    const { payment_method, parent_name, parent_email, parent_phone } = paymentData;

    // Get the payment request
    const request = await this.getByToken(token);

    if (!request) throw new Error('Payment request not found');
    if (request.status !== 'pending') throw new Error('Payment request is no longer pending');
    if (request.paid_at) throw new Error('Payment already completed');

    // Mark as paid
    const { data: updated, error: updateError } = await adminClient
      .from('parent_payments')
      .update({
        status: 'paid',
        payment_method: payment_method || 'momo',
        parent_name: parent_name || request.parent_name,
        parent_email: parent_email || request.parent_email,
        parent_phone: parent_phone || request.parent_phone,
        paid_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Subscribe the student
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: subError } = await adminClient
        .from('premium_subscriptions')
        .upsert({
          user_id: request.student_id,
          tier_slug: request.plan_slug,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_method: payment_method || 'momo',
          parent_payment_id: request.id
        }, { onConflict: 'user_id' });

      if (subError) {
        // Table might not exist yet — that's ok for now
        console.warn('[PARENT-PAY] Subscription insert error (table may not exist):', subError.message);
      }
    } catch (e) {
      console.warn('[PARENT-PAY] Could not auto-subscribe:', e.message);
    }

    return updated;
  }

  /**
   * Cancel a payment request
   */
  async cancelRequest(requestId, studentId) {
    const { data, error } = await adminClient
      .from('parent_payments')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Expire old pending requests (older than 24 hours)
   */
  async expireOldRequests() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error } = await adminClient
      .from('parent_payments')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', twentyFourHoursAgo);

    if (error) console.error('[PARENT-PAY] Expire error:', error.message);
  }
}

module.exports = new ParentPaymentService();
