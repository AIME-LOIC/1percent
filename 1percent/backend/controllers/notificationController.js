/* ============================================================
   Notification Controller
   ============================================================
   Handles HTTP requests for notification operations.
   ============================================================ */

const notificationService = require('../services/notificationService');

class NotificationController {
  /**
   * GET /api/notifications
   * Get notifications for the authenticated user
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0, unread_only = false } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        unreadOnly: unread_only === 'true'
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      console.error('[NOTIFICATIONS] Get error:', err.message);
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  }

  /**
   * GET /api/notifications/:id
   * Get a single notification
   */
  async getNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await notificationService.getNotificationById(id, userId);
      res.json({ success: true, notification });
    } catch (err) {
      console.error('[NOTIFICATIONS] Get by ID error:', err.message);
      res.status(404).json({ error: 'Notification not found' });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark a notification as read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);
      res.json({ success: true, notification });
    } catch (err) {
      console.error('[NOTIFICATIONS] Mark read error:', err.message);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllAsRead(userId);
      res.json(result);
    } catch (err) {
      console.error('[NOTIFICATIONS] Mark all read error:', err.message);
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await notificationService.deleteNotification(id, userId);
      res.json(result);
    } catch (err) {
      console.error('[NOTIFICATIONS] Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  /**
   * POST /api/admin/notifications
   * Create a notification (admin only)
   */
  async createNotification(req, res) {
    try {
      const { user_id, title, message, type, link } = req.body;

      if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'user_id, title, and message are required' });
      }

      const notification = await notificationService.createNotification({
        user_id,
        title,
        message,
        type,
        link
      });

      res.status(201).json({ success: true, notification });
    } catch (err) {
      console.error('[NOTIFICATIONS] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  /**
   * POST /api/admin/notifications/bulk
   * Create notifications for multiple users (admin only)
   */
  async createBulkNotifications(req, res) {
    try {
      const { user_ids, title, message, type, link } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || !title || !message) {
        return res.status(400).json({ error: 'user_ids (array), title, and message are required' });
      }

      const result = await notificationService.createBulkNotifications(user_ids, {
        title,
        message,
        type,
        link
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('[NOTIFICATIONS] Bulk create error:', err.message);
      res.status(500).json({ error: 'Failed to create notifications' });
    }
  }

  /**
   * POST /api/admin/notifications/broadcast
   * Create notification for all users (admin only)
   */
  async broadcastNotification(req, res) {
    try {
      const { title, message, type, link } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'title and message are required' });
      }

      const result = await notificationService.createNotificationForAllUsers({
        title,
        message,
        type,
        link
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('[NOTIFICATIONS] Broadcast error:', err.message);
      res.status(500).json({ error: 'Failed to broadcast notification' });
    }
  }

  /**
   * DELETE /api/admin/notifications/user/:userId
   * Delete all notifications for a user (admin only)
   */
  async deleteUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const result = await notificationService.deleteUserNotifications(userId);
      res.json(result);
    } catch (err) {
      console.error('[NOTIFICATIONS] Delete user notifications error:', err.message);
      res.status(500).json({ error: 'Failed to delete user notifications' });
    }
  }
}

module.exports = new NotificationController();
