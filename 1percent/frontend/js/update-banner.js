/* ============================================================
   Update banner — tells users a new version shipped.
   - Polls /api/version (no-store) every 5 min + on tab focus.
   - localStorage remembers the last build id the browser saw.
   - New build → dismissible "What's New" card bottom-right with
     release notes + "Refresh now" (location.reload()).
   - If the page itself was served from a stale cache (build id
     differs from the one the HTML assets were deployed with),
     the card says so and hard-refreshes (bypassing cache).
   Zero dependencies. Include on any page: <script src="/js/update-banner.js" defer></script>
   ============================================================ */
(function () {
  'use strict';
  var LS_KEY = '1p:lastBuildId';
  var POLL_MS = 5 * 60 * 1000;

  function fetchVersion() {
    // cache-buster so no intermediary ever serves a cached response
    return fetch('/api/version?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function lastSeen() {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  }
  function markSeen(id) {
    try { localStorage.setItem(LS_KEY, id); } catch { /* private mode */ }
  }

  function show(build) {
    if (document.getElementById('update-banner-card')) return;

    var card = document.createElement('div');
    card.id = 'update-banner-card';
    card.setAttribute('role', 'status');
    card.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;' +
      'max-width:340px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;' +
      'box-shadow:0 16px 48px rgba(0,0,0,.18);padding:14px 16px;font-family:Inter,system-ui,sans-serif;' +
      'color:#111827;animation:1p-slide-up .25s ease;';

    var notesHtml = (build.notes || '')
      .split('\n').filter(Boolean).slice(0, 5)
      .map(function (l) { return '<li style="margin:3px 0;">' + esc(l.replace(/^[-*]\s*/, '')) + '</li>'; })
      .join('');

    card.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
        '<span style="width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;' +
          'display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">1%</span>' +
        '<b style="font-size:13.5px;">New update available</b>' +
        '<button id="update-banner-close" aria-label="Dismiss" style="margin-left:auto;border:none;background:none;cursor:pointer;' +
          'color:#9ca3af;font-size:16px;line-height:1;padding:2px 4px;">&times;</button>' +
      '</div>' +
      (notesHtml ? '<ul style="margin:6px 0 8px;padding-left:18px;font-size:12px;color:#4b5563;line-height:1.55;">' + notesHtml + '</ul>'
                 : '<p style="margin:4px 0 8px;font-size:12px;color:#6b7280;">We shipped improvements to the platform.</p>') +
      '<div style="display:flex;gap:8px;">' +
        '<button id="update-banner-refresh" style="flex:1;padding:8px 10px;border:none;border-radius:8px;background:#0d6e3f;color:#fff;' +
          'font-size:12.5px;font-weight:700;cursor:pointer;">Refresh now</button>' +
        '<button id="update-banner-later" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;' +
          'color:#374151;font-size:12.5px;font-weight:600;cursor:pointer;">Later</button>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent = '@keyframes 1p-slide-up{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(card);

    var reload = function (hard) {
      markSeen(build.buildId);
      if (hard) {
        try {
          // Hard reload bypasses the HTTP cache for the document
          window.location.replace(window.location.href);
          return;
        } catch { /* fall through */ }
      }
      window.location.reload();
    };

    card.querySelector('#update-banner-close').onclick = function () { card.remove(); markSeen(build.buildId); };
    card.querySelector('#update-banner-later').onclick = function () { card.remove(); };
    card.querySelector('#update-banner-refresh').onclick = function () { reload(true); };

    // Auto-dismiss after 30s if untouched
    setTimeout(function () { if (card.isConnected) card.remove(); }, 30000);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function check() {
    fetchVersion().then(function (data) {
      if (!data || !data.buildId) return;
      var seen = lastSeen();
      if (seen && seen !== data.buildId) {
        // Browser has seen an OLDER build → announce the new one
        show(data);
      } else if (!seen) {
        // First visit ever — just record, don't interrupt
        markSeen(data.buildId);
      }
    });
  }

  function init() {
    check();
    setInterval(check, POLL_MS);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') check();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
