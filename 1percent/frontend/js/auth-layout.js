/* ============================================================
   Shared AuthLayout component
   ============================================================
   Builds the two-column auth page shell (hero panel + form
   panel) used by /signin and /signup. The per-page form markup
   lives in a <template id="auth-form-template"> inside the page
   itself and is moved into the shell, so pages keep their forms
   in plain HTML and this file stays the single source of truth
   for the layout.

   Usage (from a page script, after DOMContentLoaded):
     AuthLayout.render({
       formSide: 'right',        // which side the FORM is on ('left' | 'right')
       heading: 'Welcome back',
       subtext: 'Log in to continue your training.',
       crossLink: { href: '/signup', html: "Don't have an account? <a ...>Sign up</a>" }
     });

   The hero reuses the homepage headline/copy verbatim.
   ============================================================ */

(function () {
  'use strict';

  var CHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var ARROW_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';

  function el(id) { return document.getElementById(id); }

  /**
   * Render the auth layout into #auth-root.
   * @param {Object} opts
   * @param {'left'|'right'} opts.formSide  Which column holds the form.
   * @param {string} opts.heading           Form panel heading.
   * @param {string} opts.subtext           One line of muted copy under the heading.
   * @param {Object} [opts.crossLink]       { href, html } shown under the form.
   */
  function render(opts) {
    var root = el('auth-root');
    if (!root) return;

    var tpl = el('auth-form-template');
    var formNode = tpl && tpl.content && tpl.content.firstElementChild
      ? tpl.content.firstElementChild.cloneNode(true)
      : null;

    var title = opts.heading || 'Welcome back';
    root.setAttribute('role', 'region');
    root.innerHTML =
      '<div class="auth-page">' +
      '<div class="auth-layout" data-form-side="' + (opts.formSide === 'left' ? 'left' : 'right') + '">' +

      // ── HERO PANEL ──
      '<section class="auth-hero" aria-hidden="true">' +
      '<div class="auth-hero-inner">' +
      '<h1>Turn junior developers into the <em>1% of engineers</em> who build production systems</h1>' +
      '<p class="auth-hero-lead">Rigorous, mentor-led developer training — hands-on projects and a curriculum built around production.</p>' +
      '<div class="auth-hero-checks">' +
      '<div class="auth-hero-check"><i>' + CHECK_SVG + '</i><span>Hands-on projects</span></div>' +
      '<div class="auth-hero-check"><i>' + CHECK_SVG + '</i><span>Expert mentors</span></div>' +
      '<div class="auth-hero-check"><i>' + CHECK_SVG + '</i><span>Production-grade curriculum</span></div>' +
      '</div>' +
      '</div>' +
      '<div class="auth-hero-footer">&copy; 2026 1percent Rwanda</div>' +
      '</section>' +

      // ── FORM PANEL ──
      '<main class="auth-form-col">' +
      '<a class="auth-back" href="/">' + ARROW_SVG + ' Back</a>' +
      '<div class="auth-form-wrap">' +
      '<div class="auth-brand">' +
      '<span class="auth-brand-mark">1%</span>' +
      '<span class="auth-brand-name"><b>1percent Rwanda</b><span>Learn. Build. Ship.</span></span>' +
      '</div>' +
      '<h1 class="auth-heading">' + title + '</h1>' +
      '<p class="auth-subtext">' + (opts.subtext || '') + '</p>' +
      // Reusable inline alert — hidden by default
      '<div class="auth-alert" id="auth-alert" role="alert" hidden></div>' +
      '<div id="auth-form-slot"></div>' +
      (opts.crossLink
        ? '<p class="auth-alt-link-row">' + opts.crossLink.html + '</p>'
        : '') +
      '</div>' +
      '</main>' +

      '</div></div>';

    if (formNode) el('auth-form-slot').appendChild(formNode);

    var heading = document.querySelector('.auth-heading');
    if (heading) heading.id = 'auth-heading';
    var back = document.querySelector('.auth-back');
    if (back) back.setAttribute('aria-label', 'Back to homepage');
  }

  /* ── Alert helpers (error / warning / success) ── */

  var ALERT_ICONS = {
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>'
  };

  function showAlert(type, message) {
    var alert = el('auth-alert');
    if (!alert) return;
    alert.className = 'auth-alert auth-alert-' + type + ' show';
    alert.hidden = false;
    alert.innerHTML = '<span class="auth-alert-icon">' + (ALERT_ICONS[type] || '') + '</span><span></span>';
    alert.lastElementChild.textContent = message;
  }

  function hideAlert() {
    var alert = el('auth-alert');
    if (!alert) return;
    alert.hidden = true;
    alert.className = 'auth-alert';
    alert.textContent = '';
  }

  /** Password eye toggle + Enter-submit wiring for any rendered form. */
  function enhanceForm(form) {
    if (!form) return;
    form.querySelectorAll('.auth-password-wrap').forEach(function (wrap) {
      var input = wrap.querySelector('input[type="password"]');
      var btn = wrap.querySelector('.auth-eye');
      if (!input || !btn) return;
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.setAttribute('aria-pressed', String(show));
        input.focus();
      });
    });
  }

  window.AuthLayout = { render: render, showAlert: showAlert, hideAlert: hideAlert, enhanceForm: enhanceForm };
})();
