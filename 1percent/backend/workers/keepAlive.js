/* ============================================================
   Render Free-Tier Keep-Alive Worker
   ============================================================
   Pings the service's own public URL every ~10 minutes to
   prevent Render's free tier from spinning down the instance.

   IMPORTANT: Free tier uses ~730 of ~750 monthly hours for
   24/7 keep-alive. This will starve other free services on
   the same Render account.

   Uses process.env.RENDER_EXTERNAL_URL (set automatically by
   Render on every web service). If not set (local dev), the
   worker no-ops silently.
   ============================================================ */

const http = require('http');
const https = require('https');

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const HEALTH_ROUTE = '/api/health';

function startKeepAlive() {
  const baseUrl = process.env.RENDER_EXTERNAL_URL;
  if (!baseUrl) {
    console.log('[KEEP-ALIVE] RENDER_EXTERNAL_URL not set — skipping (local dev)');
    return;
  }

  const url = baseUrl.replace(/\/$/, '') + HEALTH_ROUTE;
  console.log(`[KEEP-ALIVE] Will ping ${url} every ${PING_INTERVAL_MS / 1000}s`);

  const ping = () => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      // Consume response to free up the socket
      res.resume();
      if (res.statusCode === 200) {
        console.log(`[KEEP-ALIVE] Ping OK — ${res.statusCode}`);
      } else {
        console.warn(`[KEEP-ALIVE] Ping returned ${res.statusCode}`);
      }
    });
    req.on('error', (err) => {
      console.error(`[KEEP-ALIVE] Ping failed: ${err.message}`);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error('[KEEP-ALIVE] Ping timed out');
    });
  };

  // First ping after 30 seconds (give the server time to start)
  setTimeout(ping, 30_000);
  // Then every 10 minutes
  setInterval(ping, PING_INTERVAL_MS);
}

module.exports = { startKeepAlive };
