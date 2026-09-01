/* ============================================================
   Cookie Consent Module
   ============================================================
   Manages cookie consent banner, localStorage persistence,
   and optional logging to Supabase.
   ============================================================ */

const CookieConsent = {
  STORAGE_KEY: 'cookie_consent',

  /**
   * Check if user has already given consent
   */
  hasConsented() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  },

  /**
   * Get stored consent preferences
   */
  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  },

  /**
   * Accept all cookies
   */
  acceptAll() {
    const prefs = { analytics: true, marketing: true, accepted: true, timestamp: Date.now() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    this._hideBanner();
    this._logToServer(prefs);
    return prefs;
  },

  /**
   * Reject optional cookies (essential only)
   */
  rejectAll() {
    const prefs = { analytics: false, marketing: false, accepted: true, timestamp: Date.now() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    this._hideBanner();
    this._logToServer(prefs);
    return prefs;
  },

  /**
   * Show the banner if not yet consented
   */
  showBannerIfNeeded() {
    if (!this.hasConsented()) {
      setTimeout(() => {
        document.getElementById('cookie-banner')?.classList.add('show');
      }, 1500);
    }
  },

  /**
   * Hide the banner
   */
  _hideBanner() {
    document.getElementById('cookie-banner')?.classList.remove('show');
  },

  /**
   * Log consent to server (non-critical, fails silently)
   */
  async _logToServer(prefs) {
    try {
      // Try the API endpoint
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '[Cookie Consent]',
          email: 'noreply@1percentrwanda.com',
          message: JSON.stringify(prefs)
        })
      });
    } catch {
      // Non-critical — fail silently
    }
  },

  /**
   * Initialize — bind buttons and check status
   */
  init() {
    const acceptBtn = document.getElementById('cookie-accept');
    const rejectBtn = document.getElementById('cookie-reject');

    if (acceptBtn) acceptBtn.addEventListener('click', () => this.acceptAll());
    if (rejectBtn) rejectBtn.addEventListener('click', () => this.rejectAll());

    this.showBannerIfNeeded();
  }
};

// Make globally accessible
window.CookieConsent = CookieConsent;
