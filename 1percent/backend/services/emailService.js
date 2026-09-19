/**
 * services/emailService.js
 *
 * PURPOSE:
 *   Admin broadcast emails via the Brevo REST API (no new npm deps — plain
 *   fetch). Feeds the admin "Email Users" panel:
 *     • audiences: all / active (confirmed login) / premium / recent (7d)
 *     • quick templates: 429 apology, email-verification nudge, generic
 *   Rate limiting lesson applied: sending runs in CHUNKS of 50 with a small
 *   delay, so a 500-user blast never trips Brevo's own 300/day free-tier
 *   quota in one second or looks like spam to receivers.
 *
 * CONFIG (env):
 *   BREVO_API_KEY   — Brevo → SMTP & API → API keys (xkeysib-…)
 *   EMAIL_FROM      — "1% Learn <verified-sender@1percent.rw>"
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Build the recipient list for an audience key.
 * Emails come from auth.users (Supabase admin API) so we reach EVERY
 * account — including users who never completed email confirmation,
 * which is exactly the group the admin wants to re-engage.
 */
async function resolveAudience(audience) {
  const { adminClient } = require('../config/database');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  if (audience === 'recent') {
    // Signed up in the last 7 days (auth users list, filtered client-side)
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    return (data.users || [])
      .filter(u => u.email && new Date(u.created_at) >= new Date(sevenDaysAgo))
      .map(u => ({ email: u.email, name: u.user_metadata?.full_name || '', id: u.id }));
  }

  // all / active / premium → profiles table + auth users. Union for full reach.
  // NOTE: profiles has NO tier / is_premium / subscription_status columns
  // (selecting them 500s the whole panel → "Failed to load counts"). Premium
  // lives in user_subscriptions and is resolved below, mirroring
  // premiumService.getUserTier().
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`profiles query failed: ${error.message}`);

  // Premium tier = an active, unexpired subscription row (same rule as
  // premiumService.getUserTier). One query avoids an N+1 per profile.
  const premiumUserIds = new Set();
  try {
    const { data: subs } = await adminClient
      .from('user_subscriptions')
      .select('user_id')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());
    for (const s of subs || []) premiumUserIds.add(s.user_id);
  } catch { /* user_subscriptions not migrated — premium audience = empty */ }

  const seen = new Set();
  const out = [];
  for (const p of profiles || []) {
    if (!p.email || seen.has(p.email.toLowerCase())) continue;
    seen.add(p.email.toLowerCase());
    if (audience === 'premium' && !premiumUserIds.has(p.id)) continue;
    out.push({ email: p.email, name: p.full_name || '', id: p.id });
  }

  if (audience === 'active') return out; // profiles rows = confirmed signups

  // 'all': also include auth users missing a profiles row (never confirmed)
  if (audience === 'all') {
    const { data, error: auErr } = await adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    if (error) console.warn('[EMAIL] listUsers failed, profiles-only list:', auErr?.message);
    else {
      for (const u of data.users || []) {
        if (!u.email) continue;
        const key = u.email.toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push({ email: u.email, name: u.user_metadata?.full_name || '', id: u.id }); }
      }
    }
  }

  return out;
}

/** Quick templates the admin can one-click in the panel. */
function getTemplates() {
  return {
    rate_limit: {
      label: '⚡ 429 / Login issues apology',
      subject: 'We fixed the login issues — sorry about that',
      body: `Hi {{name}},\n\nThis morning some of you hit "Too many attempts" errors or couldn't log in or verify your email. That was our fault — a bug in our rate limiter flooded valid requests with blocks, and our email quota throttled verification mails.\n\nBoth problems are fixed now:\n✅ Login and signup work normally again\n✅ Email verification delivers in seconds\n\nIf you still can't get in, reply to this email and we'll sort it out personally.\n\n— The 1% Learn team`
    },
    verify_nudge: {
      label: '📧 Verify-your-email nudge',
      subject: 'One click left — confirm your email to start learning',
      body: `Hi {{name}},\n\nYour account is created but not yet confirmed, so logins are blocked. Click "Resend confirmation email" on the login page and confirm within the hour — the email issue that delayed your first mail is fixed.\n\nWelcome aboard!\n— The 1% Learn team`
    },
    maintenance: {
      label: '🛠️ Maintenance notice',
      subject: 'Scheduled maintenance on 1% Learn',
      body: `Hi {{name}},\n\nWe're doing maintenance on {{date}} from {{time}}. The platform will be briefly unavailable.\n\n— The 1% Learn team`
    },
    custom: {
      label: '✍️ Custom message',
      subject: '',
      body: ''
    }
  };
}

/**
 * Send a broadcast. Returns { sent, failed, chunks, skipped }.
 * {{name}} and {{email}} are interpolated per recipient; {{date}}/{{time}}
 * survive untouched unless the sender included them.
 */
async function sendBroadcast({ audience = 'all', subject, body, dryRun = false } = {}) {
  if (!subject || !String(subject).trim()) throw new Error('Subject is required.');
  if (!body || !String(body).trim()) throw new Error('Message body is required.');

  const apiKey = process.env.BREVO_API_KEY;
  const fromRaw = process.env.EMAIL_FROM || process.env.CONTACT_EMAIL || '';
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured — add it to the server .env.');
  if (!fromRaw) throw new Error('EMAIL_FROM is not configured — e.g. "1% Learn <you@1percent.rw>".');

  // Parse "Name <email>" or bare email
  const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(fromRaw.trim());
  const from = m ? { name: m[1].trim(), email: m[2].trim() } : { name: '1% Learn', email: fromRaw.trim() };

  const recipients = await resolveAudience(audience);
  if (!recipients.length) return { sent: 0, failed: 0, chunks: 0, total: 0, skipped: true };

  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < recipients.length; i += chunkSize) chunks.push(recipients.slice(i, i + chunkSize));

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let sent = 0, failed = 0;

  for (const chunk of chunks) {
    if (dryRun) { sent += chunk.length; continue; }
    try {
      const resp = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: from,
          subject: String(subject).slice(0, 200),
          htmlContent: _render(String(body)),
          // Brevo accepts up to 500 recipients per call — 50 keeps failures granular
          to: chunk.map(r => ({ email: r.email, name: r.name || undefined }))
        })
      });
      if (resp.ok) {
        sent += chunk.length;
      } else {
        const detail = await resp.text().catch(() => '');
        console.error(`[EMAIL] Brevo chunk failed (${resp.status}): ${detail.slice(0, 300)}`);
        failed += chunk.length;
      }
    } catch (e) {
      console.error('[EMAIL] Brevo request error:', e.message);
      failed += chunk.length;
    }
    if (!dryRun) await sleep(1000); // be gentle with the relay
  }

  return { sent, failed, chunks: chunks.length, total: recipients.length, skipped: false };
}

/** Tiny markdown-ish renderer: paragraphs, line breaks, bold. Escapes HTML first. */
function _render(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = esc(text)
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:24px">${paragraphs}<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#888;font-size:12px">You received this because you have a 1% Learn account.</p></body></html>`;
}

/** Audience sizes for the panel preview. Degrades per-audience so one
 *  failing source (e.g. legacy Supabase keys rejecting listUsers) doesn't
 *  500 the whole panel — failures come back as null counts + error note. */
async function getAudienceStats() {
  const keys = ['all', 'active', 'premium', 'recent'];
  const results = await Promise.allSettled(keys.map(k => resolveAudience(k)));
  const stats = {};
  let firstError = null;
  keys.forEach((k, i) => {
    if (results[i].status === 'fulfilled') stats[k] = results[i].value.length;
    else {
      stats[k] = null;
      if (!firstError) firstError = results[i].reason?.message || 'unknown error';
    }
  });
  return { stats, error: firstError };
}

module.exports = {
  resolveAudience,
  getTemplates,
  sendBroadcast,
  getAudienceStats,
  // exposed for tests
  _internals: { _render }
};
