/* ============================================================
   Parent Payment Controller
   ============================================================
   Handles HTTP requests for parent payment operations.
   ============================================================ */

const parentPaymentService = require('../services/parentPaymentService');

class ParentPaymentController {
  /**
   * POST /api/parent-payments/create
   * Create a payment request (student only)
   */
  async createRequest(req, res) {
    try {
      const studentId = req.user.id;
      const { plan_slug, parent_name, parent_email, parent_phone, notes } = req.body;

      if (!plan_slug) {
        return res.status(400).json({ error: 'plan_slug is required (pro or unlimited)' });
      }

      const request = await parentPaymentService.createPaymentRequest(studentId, {
        plan_slug,
        parent_name,
        parent_email,
        parent_phone,
        notes
      });

      res.status(201).json({
        success: true,
        request,
        share_url: `/parent-payment/${request.reference_token}`
      });
    } catch (err) {
      console.error('[PARENT-PAY] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create payment request' });
    }
  }

  /**
   * GET /api/parent-payments/my
   * Get student's own payment requests
   */
  async getMyRequests(req, res) {
    try {
      const requests = await parentPaymentService.getStudentRequests(req.user.id);
      res.json({ success: true, requests });
    } catch (err) {
      console.error('[PARENT-PAY] Get my requests error:', err.message);
      res.status(500).json({ error: 'Failed to load payment requests' });
    }
  }

  /**
   * GET /api/parent-payments/:token
   * Get payment request by token (public — parent page)
   *
   * Response is MINIMIZED for the public: only what the payment page renders
   * (amount/plan/status/notes + first name). The raw row previously included
   * the student's full email, phone numbers, and every DB column — anyone
   * with the link (or a proxy logging responses) could harvest them.
   */
  async getByToken(req, res) {
    try {
      const { token } = req.params;
      // Token shape check (32 hex chars) — reject garbage before hitting the DB
      if (!token || !/^[a-f0-9]{32}$/.test(String(token))) {
        return res.status(404).json({ error: 'Payment link not found or expired' });
      }
      const request = await parentPaymentService.getByToken(token);

      if (!request) {
        return res.status(404).json({ error: 'Payment link not found or expired' });
      }

      const student = request.profiles || {};
      res.json({
        success: true,
        request: {
          plan_slug: request.plan_slug,
          amount: request.amount,
          status: request.status,
          paid_at: request.paid_at || null,
          notes: request.notes || null,
          parent_name: request.parent_name || null,
          student_first_name: (student.full_name || 'Student').split(' ')[0],
          // Omitted vs the old response: student email, student_id,
          // parent_email, parent_phone, reference_token, internal ids
        }
      });
    } catch (err) {
      console.error('[PARENT-PAY] Get by token error:', err.message);
      // Check if it's a missing table error
      const isTableMissing = err.message.includes('table missing') || err.message.includes('does not exist');
      res.status(404).json({
        error: 'Payment link not found',
        detail: isTableMissing ? 'The parent_payments table has not been created yet. Please run the migration in Supabase SQL Editor.' : undefined
      });
    }
  }

  /**
   * POST /api/parent-payments/:token/pay
   * Process parent payment (public — no auth needed)
   */
  async processPayment(req, res) {
    try {
      const { token } = req.params;
      const { payment_method, parent_name, parent_email, parent_phone } = req.body;

      const result = await parentPaymentService.processPayment(token, {
        payment_method,
        parent_name,
        parent_email,
        parent_phone
      });

      res.json({
        success: true,
        message: 'Payment processed successfully! The student\'s account has been upgraded.',
        payment: result
      });
    } catch (err) {
      console.error('[PARENT-PAY] Process payment error:', err.message);
      res.status(400).json({ error: err.message || 'Failed to process payment' });
    }
  }

  /**
   * DELETE /api/parent-payments/:id/cancel
   * Cancel a payment request (student only)
   */
  async cancelRequest(req, res) {
    try {
      const result = await parentPaymentService.cancelRequest(req.params.id, req.user.id);
      res.json({ success: true, message: 'Payment request cancelled', request: result });
    } catch (err) {
      console.error('[PARENT-PAY] Cancel error:', err.message);
      res.status(500).json({ error: 'Failed to cancel payment request' });
    }
  }
}

module.exports = new ParentPaymentController();
