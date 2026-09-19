#!/usr/bin/env bash
# ============================================================
# scripts/unblock-ip.sh — CLI escape hatch for IP blocks
#
# The WAF blocks an IP after 5 strikes (1h → 6h → 24h). If that IP is
# yours, you cannot reach the admin panel to lift the block — so this
# script talks to Supabase DIRECTLY (no HTTP needed) and clears the
# block. Run it on the server or anywhere with the service key.
#
# Usage:
#   ./scripts/unblock-ip.sh                  # list currently-blocked IPs
#   ./scripts/unblock-ip.sh 102.89.34.10     # unblock a specific IP
#   ./scripts/unblock-ip.sh --all            # clear EVERY block (lockout recovery)
#
# Needs SUPABASE_URL + a service key — SUPABASE_SERVICE_ROLE_KEY (legacy)
# or SUPABASE_SECRET_KEY (new Supabase key format) — and LOG_HASH_SECRET /
# JWT_SECRET (must MATCH the server's value — the hash is derived from it).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# Load .env the same way server.js does (override shell vars)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# New-format Supabase keys win over legacy names (mirrors env.js)
if [ -n "${SUPABASE_SECRET_KEY:-}" ]; then export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SECRET_KEY"; fi
if [ -n "${SUPABASE_PUBLISHABLE_KEY:-}" ]; then export SUPABASE_ANON_KEY="$SUPABASE_PUBLISHABLE_KEY"; fi

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "✗ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) must be set (check .env)" >&2
  exit 1
fi

IP="${1:-}"

export UNBLOCK_IP="$IP"
node <<'EOF'
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Must match logService.hashIp exactly
function hashIp(ip) {
  if (!ip) return null;
  const secret = process.env.LOG_HASH_SECRET || process.env.JWT_SECRET || '1percent-log-pepper';
  return crypto.createHmac('sha256', secret).update(String(ip)).digest('hex').slice(0, 32);
}

function previewIp(ip) {
  const s = String(ip);
  if (s.includes(':')) return s.split(':').slice(0, 2).join(':') + '::*';
  const parts = s.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return s.slice(0, 8) + '…';
}  (async () => {
  const ip = process.env.UNBLOCK_IP;

  // ── Clear-all mode: lift every block (full lockout recovery) ──
  if (ip === '--all') {
    const { data, error } = await db.from('ip_blocklist').delete().neq('ip_hash', '').select();
    if (error) { console.error('✗ Delete failed:', error.message); process.exit(1); }
    console.log(`✅ Cleared ${data ? data.length : 0} blocklist row(s).`);
    console.log('   Note: in-memory blocks on the running server clear within 30s (or on restart).');
    return;
  }

  if (!ip) {
    // ── List mode ──
    const { data, error } = await db.from('ip_blocklist')
      .select('ip_preview, reason, blocked_until')
      .gt('blocked_until', new Date().toISOString());
    if (error) { console.error('✗ Query failed:', error.message); process.exit(1); }
    if (!data || !data.length) { console.log('No IPs are currently blocked. ✅'); return; }
    console.log(`Currently blocked IPs (${data.length}):\n`);
    for (const row of data) {
      const until = row.blocked_until ? new Date(row.blocked_until).toLocaleString() : '?';
      console.log(`  ${row.ip_preview || '(hashed)'}  until ${until}  — ${row.reason || 'unknown reason'}`);
    }
    console.log('\nTo unblock: ./scripts/unblock-ip.sh <the.full.ip.address>');
    return;
  }

  // ── Unblock mode ──
  if (ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
    console.error(`✗ "${ip}" does not look like an IP address`); process.exit(1);
  }
  const ipHash = hashIp(ip);
  if (!ipHash) { console.error('✗ Could not hash IP (missing LOG_HASH_SECRET/JWT_SECRET?)'); process.exit(1); }

  const { data, error } = await db.from('ip_blocklist')
    .delete()
    .eq('ip_hash', ipHash)
    .select();

  if (error) { console.error('✗ Delete failed:', error.message); process.exit(1); }

  if (data && data.length) {
    console.log(`✅ Unblocked ${previewIp(ip)} — removed ${data.length} blocklist row(s).`);
    console.log('   Note: the in-memory block on the running server clears within 30s (or on restart).');
  } else {
    console.log(`ℹ  No DB blocklist row found for ${previewIp(ip)}.`);
    console.log('   Either it already expired, or the block is in-memory only —');
    console.log('   restarting the server clears all in-memory blocks/strikes.');
  }
})().catch(e => { console.error('✗', e.message); process.exit(1); });
EOF
