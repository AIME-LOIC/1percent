/* ============================================================
   Setup Script — Create Admin Account
   ============================================================
   Run once: node backend/setup-admin.js
   Creates admin user: kingaime132@gmail.com / admin132@
   ============================================================ */

require('dotenv').config();
const { adminClient } = require('./config/database');

async function setupAdmin() {
  const EMAIL = 'kingaime132@gmail.com';
  const PASSWORD = 'admin132@';
  const FULL_NAME = 'Admin King Aime';

  console.log('[SETUP] Creating admin account...');

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: FULL_NAME
      }
    });

    if (authError) {
      if (authError.message?.includes('already')) {
        console.log('[SETUP] User already exists, fetching...');
        // Try to get existing user
        const { data: users } = await adminClient.auth.admin.listUsers();
        const existing = users?.users?.find(u => u.email === EMAIL);
        if (existing) {
          console.log(`[SETUP] User found: ${existing.id}`);
          // Update role to admin
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({ role: 'admin', full_name: FULL_NAME })
            .eq('id', existing.id);

          if (updateError) {
            console.error('[SETUP] Profile update error:', updateError.message);
          } else {
            console.log('[SETUP] Profile updated to admin role');
          }
          console.log('[SETUP] Done!');
          return;
        }
      }
      console.error('[SETUP] Auth error:', authError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`[SETUP] User created: ${userId}`);

    // 2. Set admin role in profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: 'admin', full_name: FULL_NAME })
      .eq('id', userId);

    if (profileError) {
      console.error('[SETUP] Profile update error:', profileError.message);
    } else {
      console.log('[SETUP] Admin role assigned');
    }

    // 3. Create default signature
    const { error: sigError } = await adminClient
      .from('signatures')
      .insert({
        user_id: userId,
        full_name: FULL_NAME,
        signature_url: '' // Empty - will be set via sign page
      });

    if (sigError) {
      console.warn('[SETUP] Signature creation skipped:', sigError.message);
    } else {
      console.log('[SETUP] Signature record created');
    }

    console.log('\n[SETUP] Admin account created successfully!');
    console.log(`[SETUP] Email:    ${EMAIL}`);
    console.log(`[SETUP] Password: ${PASSWORD}`);
    console.log(`[SETUP] Role:     admin`);
    console.log('[SETUP] Login at: /learn');

  } catch (err) {
    console.error('[SETUP] Fatal error:', err.message);
    process.exit(1);
  }
}

setupAdmin();
