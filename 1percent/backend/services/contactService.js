/* ============================================================
   Contact Service
   ============================================================
   Handles service requests and contact form submissions.
   ============================================================ */

const { adminClient } = require('../config/database');

class ContactService {
  /**
   * Submit a service request / contact form
   */
  async submitRequest({ name, email, company, service_slug, budget_range, message }) {
    const { data, error } = await adminClient
      .from('service_requests')
      .insert({
        full_name: name,
        email,
        company: company || null,
        service_slug: service_slug || null,
        budget_range: budget_range || null,
        message
      })
      .select()
      .single();

    if (error) throw error;

    // In production: send notification email, add to CRM, etc.
    console.log('[CONTACT] New service request:', { name, email, service_slug });

    return data;
  }

  /**
   * Get all service requests (admin only)
   */
  async getRequests({ status, limit = 50, offset = 0 } = {}) {
    let query = adminClient
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Update request status (admin only)
   */
  async updateStatus(requestId, status) {
    const { data, error } = await adminClient
      .from('service_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get active services
   */
  async getServices() {
    const { data, error } = await adminClient
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = new ContactService();
