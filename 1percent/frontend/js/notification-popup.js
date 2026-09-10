/* ============================================================
   Notification Popup System
   ============================================================
   Shows real-time notification popups centered on screen.
   Works on any page (dashboard, course, etc.)
   ============================================================ */

const NotificationPopup = {
  _lastCheck: null,
  _pollInterval: null,
  _pendingNotifications: [],
  _isShowing: false,
  _supabase: null,
  _audioEnabled: true,

  /**
   * Initialize the notification popup system
   */
  async init(supabaseClient) {
    this._supabase = supabaseClient;
    this._lastCheck = new Date().toISOString();
    
    // Create popup container
    this._createPopupContainer();
    
    // Start polling for new notifications
    this._startPolling();
    
    // Load audio notification
    this._loadAudio();
    
    console.log('[NotificationPopup] Initialized');
  },

  /**
   * Create the popup container in DOM
   */
  _createPopupContainer() {
    // Main overlay
    const overlay = document.createElement('div');
    overlay.id = 'notification-popup-overlay';
    overlay.className = 'notif-popup-overlay';
    overlay.innerHTML = `
      <div class="notif-popup-modal" id="notif-popup-modal">
        <div class="notif-popup-header">
          <div class="notif-popup-icon" id="notif-popup-icon">📢</div>
          <button class="notif-popup-close" id="notif-popup-close" title="Close">&times;</button>
        </div>
        <div class="notif-popup-body">
          <h3 class="notif-popup-title" id="notif-popup-title"></h3>
          <p class="notif-popup-message" id="notif-popup-message"></p>
          <span class="notif-popup-time" id="notif-popup-time"></span>
        </div>
        <div class="notif-popup-footer">
          <button class="notif-popup-btn secondary" id="notif-popup-dismiss">Dismiss</button>
          <button class="notif-popup-btn primary" id="notif-popup-mark-read">Mark as Read</button>
        </div>
        <div class="notif-popup-progress">
          <div class="notif-popup-progress-bar" id="notif-popup-progress-bar"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('notif-popup-close').addEventListener('click', () => this.dismiss());
    document.getElementById('notif-popup-dismiss').addEventListener('click', () => this.dismiss());
    document.getElementById('notif-popup-mark-read').addEventListener('click', () => this.markAsRead());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.dismiss();
    });

    // Escape key to dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isShowing) this.dismiss();
    });
  },

  /**
   * Load notification sound
   */
  _loadAudio() {
    // Create a simple notification sound using Web Audio API
    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('[NotificationPopup] Audio not available');
      this._audioEnabled = false;
    }
  },

  /**
   * Play notification sound
   */
  _playSound() {
    if (!this._audioEnabled || !this._audioContext) return;
    
    try {
      // Resume audio context if suspended
      if (this._audioContext.state === 'suspended') {
        this._audioContext.resume();
      }

      const oscillator = this._audioContext.createOscillator();
      const gainNode = this._audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this._audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this._audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this._audioContext.currentTime + 0.3);
      
      oscillator.start(this._audioContext.currentTime);
      oscillator.stop(this._audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('[NotificationPopup] Sound playback failed:', e);
    }
  },

  /**
   * Start polling for new notifications
   */
  _startPolling() {
    // Check every 30 seconds
    this._pollInterval = setInterval(() => this._checkForNewNotifications(), 30000);
    
    // Also check immediately
    this._checkForNewNotifications();
  },

  /**
   * Stop polling
   */
  stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  },

  /**
   * Check for new notifications from the server
   */
  async _checkForNewNotifications() {
    try {
      const { data: { session } } = await this._supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/notifications?limit=5&unread_only=true', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) return;
      
      const json = await res.json();
      if (!json.success || !json.notifications?.length) return;

      // Filter for new notifications since last check
      const newNotifications = json.notifications.filter(n => {
        const created = new Date(n.created_at);
        const lastCheck = new Date(this._lastCheck);
        return created > lastCheck;
      });

      if (newNotifications.length > 0) {
        // Queue notifications for display
        this._pendingNotifications = [...newNotifications, ...this._pendingNotifications];
        
        // Show next notification if not currently showing one
        if (!this._isShowing) {
          this._showNext();
        }
      }

      this._lastCheck = new Date().toISOString();
    } catch (err) {
      console.error('[NotificationPopup] Check failed:', err);
    }
  },

  /**
   * Show the next pending notification
   */
  _showNext() {
    if (this._pendingNotifications.length === 0) {
      this._isShowing = false;
      return;
    }

    this._isShowing = true;
    const notification = this._pendingNotifications.shift();
    this._currentNotification = notification;

    // Set content
    document.getElementById('notif-popup-title').textContent = notification.title;
    document.getElementById('notif-popup-message').textContent = notification.message || '';
    document.getElementById('notif-popup-time').textContent = this._getTimeAgo(notification.created_at);

    // Set icon based on type
    const iconMap = {
      info: '📢',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    document.getElementById('notif-popup-icon').textContent = iconMap[notification.type] || '📢';

    // Set type class
    const modal = document.getElementById('notif-popup-modal');
    modal.className = `notif-popup-modal ${notification.type}`;

    // Show overlay
    const overlay = document.getElementById('notification-popup-overlay');
    overlay.classList.add('show');

    // Play sound
    this._playSound();

    // Auto-dismiss after 8 seconds
    this._autoDismissTimer = setTimeout(() => this.dismiss(), 8000);

    // Animate progress bar
    const progressBar = document.getElementById('notif-popup-progress-bar');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.style.transition = 'width 8s linear';
      progressBar.style.width = '0%';
    }, 50);
  },

  /**
   * Dismiss the current notification
   */
  dismiss() {
    clearTimeout(this._autoDismissTimer);
    
    const overlay = document.getElementById('notification-popup-overlay');
    overlay.classList.remove('show');

    // Show next notification after a short delay
    setTimeout(() => this._showNext(), 300);
  },

  /**
   * Mark current notification as read
   */
  async markAsRead() {
    if (!this._currentNotification) return;

    try {
      const { data: { session } } = await this._supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch(`/api/notifications/${this._currentNotification.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Update badge count if on dashboard
      if (typeof Dashboard !== 'undefined' && Dashboard._loadNotifications) {
        Dashboard._loadNotifications();
      }
    } catch (err) {
      console.error('[NotificationPopup] Mark read failed:', err);
    }

    this.dismiss();
  },

  /**
   * Manually trigger a notification check
   */
  async checkNow() {
    this._lastCheck = new Date(0).toISOString();
    await this._checkForNewNotifications();
  },

  /**
   * Get time ago string
   */
  _getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  },

  /**
   * Show a manual popup (for testing or immediate notifications)
   */
  showPopup(title, message, type = 'info') {
    const notification = {
      id: 'manual-' + Date.now(),
      title,
      message,
      type,
      created_at: new Date().toISOString()
    };
    
    this._pendingNotifications.unshift(notification);
    if (!this._isShowing) {
      this._showNext();
    }
  }
};

// Make globally accessible
window.NotificationPopup = NotificationPopup;
