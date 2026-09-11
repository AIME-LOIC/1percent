/* Shared auth routing helpers for main site vs learn subdomain */
const AuthHelpers = {
  isLearn() {
    const host = location.hostname;
    return host === 'learn.1percent.rw' || host === 'www.learn.1percent.rw';
  },

  appPath(path) {
    if (this.isLearn()) return path;
    return path.startsWith('/learn') ? path : '/learn' + path;
  },

  postLoginPath(user, role) {
    if (role === 'admin') return this.appPath('/admin');
    if (user && !user.user_metadata?.onboarding_completed) return this.appPath('/onboarding');
    return this.appPath('/dashboard');
  },

  /**
   * Password-reset and magic-link tokens must not be consumed on /admin or other pages.
   * Redirect recovery links to reset-password.html with the hash preserved.
   */
  redirectAuthHashIfNeeded() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return false;
    if (window.location.pathname.includes('reset-password')) return false;

    if (hash.includes('type=recovery') || hash.includes('type=signup') || hash.includes('type=magiclink')) {
      window.location.replace('/reset-password.html' + hash);
      return true;
    }
    return false;
  }
};

window.AuthHelpers = AuthHelpers;
