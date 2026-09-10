/* ============================================================
   Notification Service
   ============================================================
   Handles notification CRUD operations for the platform.
   ============================================================ */

const { adminClient } = require('../config/database');

class NotificationService {
  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Notifications list with unread count
   */
  async getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    let query = adminClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Get unread count separately
    const { count: unreadCount } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0
    };
  }

  /**
   * Get a single notification by ID
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Object} Notification data
   */
  async getNotificationById(notificationId, userId) {
    const { data, error } = await adminClient
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const { data, error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Object} Update result
   */
  async markAllAsRead(userId) {
    const { data, error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true, message: 'All notifications marked as read' };
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Delete result
   */
  async deleteNotification(notificationId, userId) {
    const { error } = await adminClient
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, message: 'Notification deleted' };
  }

  /**
   * Create a notification (admin only)
   * @param {Object} notificationData - Notification data
   * @returns {Object} Created notification
   */
  async createNotification(notificationData) {
    const { user_id, title, message, type = 'info' } = notificationData;

    const { data, error } = await adminClient
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create notification for multiple users (admin only)
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data (title, message, type)
   * @returns {Object} Created notifications count
   */
  async createBulkNotifications(userIds, notificationData) {
    const { title, message, type = 'info' } = notificationData;

    const notifications = userIds.map(user_id => ({
      user_id,
      title,
      message,
      type
    }));

    const { data, error } = await adminClient
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return { success: true, count: data?.length || 0 };
  }

  /**
   * Create notification for all users (admin only)
   * @param {Object} notificationData - Notification data (title, message, type)
   * @returns {Object} Created notifications count
   */
  async createNotificationForAllUsers(notificationData) {
    // Get all user IDs from profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id');

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return { success: true, count: 0 };
    }

    const userIds = profiles.map(p => p.id);
    return this.createBulkNotifications(userIds, notificationData);
  }

  /**
   * Delete all notifications for a user (admin only)
   * @param {string} userId - User ID
   * @returns {Object} Delete result
   */
  async deleteUserNotifications(userId) {
    const { error } = await adminClient
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, message: 'All notifications deleted for user' };
  }
}

module.exports = new NotificationService();
