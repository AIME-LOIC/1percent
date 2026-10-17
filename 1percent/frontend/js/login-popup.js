/* ============================================================
   Login Popup → Sign-in redirect shim (window.LoginPopup)
   ============================================================
   The Student Login / Sign Up popup was replaced by the dedicated
   /signin and /signup pages. This module keeps the LoginPopup API
   that gated pages (lab.html, playground.html, robotics-club.html,
   dashboard.html) already call — but show() now redirects to the
   sign-in page instead of opening a modal.

   Return-back behaviour is preserved via the ?next= parameter:
   after login, /signin sends the visitor back to the page that
   requested it (and honours the stored 'mcpConsentReturn' for MCP
   consent flows). Pages may still call setLoggedIn/isLoggedIn —
   they are kept for API compatibility.
   ============================================================ */

(function () {
  'use strict';

  let loggedIn = null; // null = unknown, true/false = resolved

  /** Redirect to the sign-in page, carrying the current page as ?next=. */
  function show() {
    const authRoutes = () => {
      // Route maps exist for both hosts; plain /signin works everywhere.
      return '/signin';
    };
    const next = location.pathname + location.search;
    if (next && next !== '/') {
      window.location.href = authRoutes() + '?next=' + encodeURIComponent(next);
    } else {
      window.location.href = authRoutes();
    }
  }

  function hide() { /* the redirect replaces the popup; nothing to hide */ }

  /** True once the page's own auth init has resolved the session state. */
  function isLoggedIn() { return loggedIn === true; }
  /** Mark knowledge of the session (called by pages after their own auth init). */
  function setLoggedIn(v) { loggedIn = !!v; }
  /** True until the page's auth init has resolved. */
  function isResolved() { return loggedIn !== null; }

  window.LoginPopup = { show, hide, isLoggedIn, isResolved, setLoggedIn };
})();
