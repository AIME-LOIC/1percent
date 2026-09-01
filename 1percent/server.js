/* ============================================================
   1% Digital Solutions — Server Entry Point
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

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   1% Digital Solutions — Server Running            ║
  ║   http://localhost:${String(PORT).padEnd(33)}║
  ║   Environment: ${NODE_ENV.padEnd(35)}║
  ║   Supabase: ${(process.env.SUPABASE_URL || 'NOT SET').slice(0, 35).padEnd(35)}║
  ╚═══════════════════════════════════════════════════╝
  `);
});
