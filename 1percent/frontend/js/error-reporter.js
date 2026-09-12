/* ============================================================
   Frontend Error Reporter
   ============================================================
   Captures JavaScript errors, unhandled promise rejections and
   failed API calls in the browser and sends them to
   POST /api/logs/error so an admin can see what a user hit and
   provide support.
   - Never throws, never blocks the user.
   - De-duplicates identical errors.
   - Attaches the logged-in user id/e-mail when a Supabase
     session is present in localStorage.
   ============================================================ */

(function () {
  const MAX_REPORTS = 25;              // hard cap per page load
  const DEDUPE_WINDOW_MS = 10000;      // ignore identical errors within 10s
  const ENDPOINT = '/api/logs/error';

  const sent = new Map();
  let reportCount = 0;

  function getAccessToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && /^sb-.*-auth-token$/.test(key)) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && parsed.access_token) return parsed.access_token;
          if (parsed && parsed.currentSession && parsed.currentSession.access_token) {
            return parsed.currentSession.access_token;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function shouldSend(key) {
    if (reportCount >= MAX_REPORTS) return false;
    const now = Date.now();
    const last = sent.get(key);
    if (last && now - last < DEDUPE_WINDOW_MS) return false;
    sent.set(key, now);
    reportCount += 1;
    return true;
  }

  function send(payload) {
    try {
      const key = `${payload.message}|${payload.path || ''}`;
      if (!shouldSend(key)) return;

      const headers = { 'Content-Type': 'application/json' };
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      // keepalive lets the request finish even during navigation.
      fetch(ENDPOINT, {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify(payload)
      }).catch(() => { /* reporting must never surface an error */ });
    } catch {
      /* ignore */
    }
  }

  const ErrorReporter = {
    report(message, context, level) {
      if (!message) return;
      send({
        message: String(message),
        stack: context && context.stack ? String(context.stack) : null,
        level: level || 'error',
        source: 'frontend',
        path: location.pathname + location.search,
        url: location.href,
        context: context || {}
      });
    },

    event(name, metadata, level) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        fetch('/api/logs/event', {
          method: 'POST',
          headers,
          keepalive: true,
          body: JSON.stringify({ event: name, level: level || 'info', metadata: metadata || {} })
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    },

    /** Manual "Report a problem" from a user (prompt-based). */
    reportProblem() {
      const description = window.prompt('Describe the issue you are having:');
      if (!description) return;
      this.report(`User report: ${description}`, {
        userDescription: description,
        userAgent: navigator.userAgent
      }, 'warning');
      if (window.Toast && typeof window.Toast.success === 'function') {
        window.Toast.success('Thanks! Your report was sent to support.');
      } else {
        window.alert('Thanks! Your report was sent to support.');
      }
    }
  };

  window.ErrorReporter = ErrorReporter;
  window.reportProblem = () => ErrorReporter.reportProblem();

  // --- Global error capture ---
  window.addEventListener('error', (event) => {
    // Resource load errors (img/script) have no `error` object.
    if (event.message) {
      ErrorReporter.report(event.message, {
        stack: event.error && event.error.stack,
        line: event.lineno,
        column: event.colno,
        file: event.filename
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason && (reason.message || reason.toString());
    ErrorReporter.report(message ? `Unhandled promise rejection: ${message}` : 'Unhandled promise rejection', {
      stack: reason && reason.stack
    });
  });

  // --- Capture failed server responses (5xx) from the page's own fetches ---
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (...args) {
      return originalFetch.apply(this, args).then((response) => {
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
          // Never report the reporter's own calls (avoid loops).
          if (response && response.status >= 500 && !url.includes('/api/logs/')) {
            ErrorReporter.report(`HTTP ${response.status} from ${url}`, {
              status: response.status,
              apiUrl: url
            }, response.status >= 503 ? 'fatal' : 'error');
          }
        } catch {
          /* ignore */
        }
        return response;
      });
    };
  }
})();
