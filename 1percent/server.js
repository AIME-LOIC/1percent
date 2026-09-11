/* ============================================================
   1percent Rwanda — Server Entry Point
   ============================================================
   Loads .env, validates required variables, starts the app.
   ============================================================ */

// Load environment variables FIRST — override shell vars so .env takes precedence
require('dotenv').config({ override: true });

// Validate environment
const { validateEnv } = require('./backend/config/env');
validateEnv();

// Create and start the app
const app = require('./backend');
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
try {
  const { initSocket } = require('./backend/config/socket');
  initSocket(server);
} catch (e) {
  console.error('[SERVER] Failed to init Socket.IO:', e.message);
}

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   1percent Rwanda — Server Running            ║
  ║   http://localhost:${String(PORT).padEnd(33)}║
  ║   Environment: ${NODE_ENV.padEnd(35)}║
  ║   Supabase: ${(process.env.SUPABASE_URL || 'NOT SET').slice(0, 35).padEnd(35)}║
  ╚═══════════════════════════════════════════════════╝
  `);

  // Start background workers (only from server.js, not from backend/index.js)
  try {
    const { startStreakCron } = require('./backend/workers/streakCron');
    startStreakCron();
  } catch (e) {
    console.error('[SERVER] Failed to start streak cron:', e.message);
  }

  try {
    const { startKeepAlive } = require('./backend/workers/keepAlive');
    startKeepAlive();
  } catch (e) {
    console.error('[SERVER] Failed to start keep-alive:', e.message);
  }
});
