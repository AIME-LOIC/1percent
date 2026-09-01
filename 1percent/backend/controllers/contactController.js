/* ============================================================
   Contact Controller
   ============================================================
   Handles service requests and service listing endpoints.
   ============================================================ */

const contactService = require('../services/contactService');

class ContactController {
  /**
   * POST /api/contact
   * Submit a contact / service request form
   */
  async submitRequest(req, res) {
    try {
      const { name, email, company, service, budget, message } = req.body;

      const result = await contactService.submitRequest({
        name,
        email,
        company,
        service_slug: service,
        budget_range: budget,
        message
      });

      res.status(201).json({
        success: true,
        message: 'Thank you! We\'ll be in touch within 1-2 business days.',
        id: result.id
      });
    } catch (err) {
      console.error('[CONTACT] Submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit. Please try again or email us directly.' });
    }
  }

  /**
   * GET /api/services
   * Get all active services (public)
   */
  async getServices(req, res) {
    try {
      const services = await contactService.getServices();
      res.json({ success: true, services });
    } catch (err) {
      console.error('[CONTACT] Services error:', err.message);
      res.status(500).json({ error: 'Failed to load services.' });
    }
  }

  /**
   * GET /api/admin/requests
   * Get all service requests (admin only)
   */
  async getRequests(req, res) {
    try {
      const { status, limit, offset } = req.query;
      const requests = await contactService.getRequests({
        status,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      res.json({ success: true, requests });
    } catch (err) {
      console.error('[CONTACT] List error:', err.message);
      res.status(500).json({ error: 'Failed to load requests.' });
    }
  }

  /**
   * PUT /api/admin/requests/:id/status
   * Update request status (admin only)
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'reviewed', 'in_progress', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const updated = await contactService.updateStatus(id, status);
      res.json({ success: true, request: updated });
    } catch (err) {
      console.error('[CONTACT] Update error:', err.message);
      res.status(500).json({ error: 'Failed to update status.' });
    }
  }
}

module.exports = new ContactController();
