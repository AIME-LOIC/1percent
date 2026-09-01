/* ============================================================
   Environment Variable Validation
   ============================================================
   Fails fast on startup if required vars are missing.
   ============================================================ */

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const OPTIONAL_VARS = {
  PORT: '3000',
  NODE_ENV: 'development',
  JWT_SECRET: 'change-this-to-a-strong-random-string',
  CONTACT_EMAIL: '1percentrwanda@gmail.com',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_REGION: 'us-east-1',
  S3_BUCKET_NAME: '1percent-lab-files'
};

function validateEnv() {
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
