/**
 * config/env.js
 *
 * PURPOSE:
 *   Central environment-variable access. Loads dotenv once and validates that required vars are
 *   present at boot (fail fast), so no module reads process.env directly.
 *
 * EXPORTS: validateEnv
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const OPTIONAL_VARS = {
  PORT: '3000',
  NODE_ENV: 'development',
  JWT_SECRET: 'change-this-to-a-strong-random-string',
  // Pepper for HMAC-hashing IPs in logs. Should be set in production; the
  // default keeps dev working. Rotating it invalidates IP correlation.
  LOG_HASH_SECRET: '1percent-log-pepper',
  CONTACT_EMAIL: '1percentrwanda@gmail.com',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_REGION: 'us-east-1',
  S3_BUCKET_NAME: '1percent-lab-files'
};

function validateEnv() {
  // Supabase key-name migration: new Supabase projects ship PUBLISHABLE /
  // SECRET keys and many have legacy (JWT-style) keys disabled entirely.
  // The codebase reads the legacy names. New-format keys WIN whenever they
  // are present — so operators can just append the sb_ keys to .env and
  // leave the old lines behind (they are dead anyway on such projects).
  if (process.env.SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (process.env.SUPABASE_SECRET_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
  if (process.env.SUPABASE_ANON_KEY?.startsWith('eyJ') || process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ')) {
    console.warn('⚠️  Legacy JWT-style Supabase keys detected. Projects with legacy keys disabled will reject them — switch to the sb_publishable_/sb_secret_ keys from the Supabase dashboard (Settings → API Keys).');
    console.warn('⚠️  Auth (login / signup / magic link / password reset) WILL FAIL until the keys are replaced.');
  }

  const missing = REQUIRED_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(key => console.error(`   → ${key}`));
    console.error('\n   Copy .env.example to .env and fill in your values.\n');
    process.exit(1);
  }

  // Set defaults for optional vars
  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  console.log('✅ Environment variables validated');
}

module.exports = { validateEnv };
