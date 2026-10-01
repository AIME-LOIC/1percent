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

/* ============================================================
   Contact Form — Formspree
   ============================================================
   The 3D/business page has an inline submit handler that posts to
   /api/contact. Intercept the submit event during capture so the
   public contact form uses the same working Formspree endpoint as
   the learn branch.
   ============================================================ */

const FORMSPREE_CONTACT_ENDPOINT = 'https://formspree.io/f/mbgjbngp';

// Capture phase runs before the page's existing bubble-phase handler.
document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'contact-form') return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const status = document.getElementById('contact-status');
  const submitButton = form.querySelector('button[type="submit"]');

  const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
  const data = {
    name: getValue('contact-name'),
    email: getValue('contact-email'),
    company: getValue('contact-company'),
    service: getValue('contact-service'),
    message: getValue('contact-message'),
    _subject: `[1% Website Contact] ${getValue('contact-name') || 'New message'}`
  };

  if (status) {
    status.style.display = 'block';
    status.style.color = 'var(--text-muted)';
    status.textContent = 'Sending...';
  }
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
  }

  try {
    const response = await fetch(FORMSPREE_CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = Array.isArray(result.errors) && result.errors.length
        ? result.errors.map((error) => error.message).join(', ')
        : (result.error || 'Failed to send. Please try again.');
      throw new Error(errorMessage);
    }

    if (status) {
      status.style.color = 'var(--success)';
      status.textContent = "✓ Message sent! We'll get back to you within 24 hours.";
    }
    form.reset();
  } catch (error) {
    if (status) {
      status.style.color = 'var(--danger)';
      status.textContent = error.message || 'Network error. Please try again.';
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Message';
    }
  }
}, true);
