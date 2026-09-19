/**
 * services/securityService.js
 *
 * PURPOSE:
 *   Security plumbing shared by the WAF and auth flows: IP hashing (peppered HMAC-SHA256 + masked
 *   preview), ip_blocklist check/expire, and strike accounting.
 *
 * EXPORTS: RULES, scanRequest, scanString, identifyAttacker, isBlocked, isWhitelisted, recordAttack, recordRateLimitAbuse, previewIp, blockCache, alertThrottle, notifThrottle, BLOCK_THRESHOLD
 * DEPENDENCIES: crypto, jose
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const crypto = require('crypto');
const { adminClient } = require('../config/database');
const logService = require('./logService');

/* Verified-admin cache — see isVerifiedAdmin() below. */
const adminCheckCache = new Map(); // tokenHash → { isAdmin, checkedAt }
const ADMIN_CHECK_TTL_MS = 5 * 60 * 1000;

/* ── Detection rules ──────────────────────────────────────
   Kept deliberately tight: only patterns that essentially never
   appear in legitimate traffic. Each rule maps to a severity —
   high/critical deny the request immediately, medium is recorded
   (strike-worthy only in aggregate) and the request continues. */
const RULES = [
  // SQL injection
  { id: 'sqli_union',     re: /union[\s+/*]+(?:all[\s+/*]+)?select/i, sev: 'high' },
  { id: 'sqli_tautology', re: /(?:\bor\b|\band\b)\s+['"`]?\w+['"`]?\s*=\s*['"`]?\w+['"`]?\s*(?:--|#|\/\*)/i, sev: 'high' },
  { id: 'sqli_drop',      re: /;\s*(?:drop|truncate)\s+table/i, sev: 'critical' },
  // (?<![\w.]) so time.sleep( / asyncio.sleep( / Thread.sleep( in student code is NOT an attack
  { id: 'sqli_sleep',     re: /(?<![\w.])(?:sleep|pg_sleep|benchmark|waitfor\s+delay)\s*\(/i, sev: 'high' },
  { id: 'sqli_schema',    re: /information_schema\.(?:tables|columns)/i, sev: 'high' },
  { id: 'sqli_quote',     re: /'\s*(?:or|and)\s*'[^']*'\s*=\s*'/i, sev: 'medium' },
  // XSS
  { id: 'xss_script',     re: /<\s*script\b|<\s*\/\s*script/i, sev: 'high' },
  { id: 'xss_event',      re: /\son(?:error|load|click|mouseover|focus)\s*=\s*["'(`]?/i, sev: 'high' },
  { id: 'xss_js_uri',     re: /javascript\s*:/i, sev: 'medium' },
  { id: 'xss_iframe',     re: /<\s*iframe\b/i, sev: 'medium' },
  { id: 'xss_cookie',     re: /document\s*\.\s*cookie/i, sev: 'medium' },
  // Path traversal + probing
  { id: 'trav_dotdot',    re: /(?:\.\.[\/\\]){2,}/, sev: 'high' },
  { id: 'trav_etc',       re: /etc\/(?:passwd|shadow)|proc\/self\/environ/i, sev: 'critical' },
  { id: 'probe_dotenv',   re: /\/\.(?:env|git)(?:\/|$)|\.git\/config|\.aws\/credentials/i, sev: 'high' },
  { id: 'probe_cms',      re: /wp-(?:admin|login|content\/plugins)|phpmyadmin|xmlrpc\.php/i, sev: 'medium' },
  // Command injection / RCE probes
  { id: 'rce_cmd',        re: /\b(?:cat|wget|curl|nc|bash)\b\s+[^\s]{0,40}(?:\/etc\/|\/bin\/|\|\||&&)/i, sev: 'high' },
  { id: 'rce_exec',       re: /\$\(\s*(?:cat|ls|id|whoami|curl|wget)\b|`[^`]{0,40}\b(?:cat|id|whoami)\b/i, sev: 'high' },
  { id: 'rce_shell',      re: /\/bin\/(?:ba|z)?sh\b|nc\s+-e\b/i, sev: 'high' },
  // SSRF / local file / SSTI
  { id: 'ssrf_meta',      re: /169\.254\.169\.254|metadata\.google\.internal|file:\/\//i, sev: 'high' },
  { id: 'php_incl',       re: /php:\/\/(?:filter|input)/i, sev: 'high' },
  { id: 'ssti',           re: /\{\{\s*\d+\s*[*+]\s*\d+\s*\}\}|\$\{jndi:/i, sev: 'high' },
  // PostgREST/DB filter injection beyond the sanitized fields
  { id: 'postgrest_inj',  re: /id=in\.\(|\bor=\(|->>/i, sev: 'medium' },
];

/* User-authored code fields: these legitimately contain <script>, quotes,
   $() etc. (lab submissions, playgrounds, AI review requests). They run in
   the browser sandbox or the external sandboxed compiler — never on this
   server — so their VALUES are not attack vectors against us. Keys are
   still scanned for weirdness; only these values are exempt. */
const CODE_FIELD_EXEMPT = new Set([
  'code', 'html', 'css', 'js', 'source', 'solution', 'content',
  'html_code', 'css_code', 'js_code', 'markdown', 'script',
  // Lesson text and learner answers legitimately contain SQL/shell/<script> examples
  // (SQL, Linux and security courses) — they were being 403'd and earning IP strikes.
  'content_md', 'sql', 'query', 'answer', 'answers', 'command', 'commands',
  'transcript', 'terminal', 'explanation', 'output', 'stdout'
]);

/* ── In-memory state ──────────────────────────────────────── */
const blockCache = new Map();     // ipHash → { blockedUntil:number|null, checkedAt:number }
const strikeMemory = new Map();   // ipHash → { strikes:number, blockedUntil:number|null } (works even if DB is down)
const alertThrottle = new Map();  // `${type}:${ipHash}` → last alert ts (10-min dedup)
const notifThrottle = new Map();  // userId → last notification ts (30-min dedup)
const RATE_ABUSE_WINDOW = new Map(); // ipHash → { count, windowStart } for 429 storms

const ALERT_DEDUP_MS = 10 * 60 * 1000;
const NOTIF_DEDUP_MS = 30 * 60 * 1000;
const CACHE_TTL_MS = 30 * 1000;
const BLOCK_THRESHOLD = parseInt(process.env.SECURITY_BLOCK_THRESHOLD || '5', 10);

/* ── Strike decay + per-rule dedup ──────────────────────────
   Strikes used to be FOREVER: a single noisy rule (a lesson about XSS
   matching the xss scanner, a school NAT behind one shared IP, a
   security course itself tripping the payload rules) could walk any
   visitor — including the site owner — into a 1h→6h→24h block that
   never healed. That was the "I open the site and see the hack page"
   bug. Two fixes:
   • TIME DECAY — strikes older than STRIKE_DECAY_MS stop counting.
     Real attackers probing continuously re-earn their strikes within
     the window; a user who clicked something odd once is clean an
     hour later.
   • PER-RULE DEDUP — the same pattern (e.g. every request to a
     WordPress-probing path, or a URL containing "wp-admin") counted
     once per HIT, so one shared link could rack up 5 strikes in 5
     page loads. Now repeated hits of the SAME rule count once per
     window; only genuinely varied attack patterns escalate. */
const STRIKE_DECAY_MS = parseInt(process.env.SECURITY_STRIKE_DECAY_MS || String(60 * 60 * 1000), 10);
const RULE_STRIKE_WINDOW_MS = 10 * 60 * 1000;
const MAX_STRIKE_AGE_MS = 24 * 60 * 60 * 1000; // strike log per IP never exceeds a day

function addStrike(ipHash, ipPreview, reason, ruleId = null) {
  const now = Date.now();
  const cur = strikeMemory.get(ipHash) || { strikes: 0, blockedUntil: null, recentRules: new Map() };

  // Time-decay: drop strikes older than the decay window.
  if (!Array.isArray(cur.strikeLog)) cur.strikeLog = [];
  cur.strikeLog = cur.strikeLog.filter(ts => now - ts < MAX_STRIKE_AGE_MS);
  const liveStrikes = cur.strikeLog.filter(ts => now - ts < STRIKE_DECAY_MS).length;

  // Per-rule dedup: one strike per distinct rule per window.
  if (ruleId) {
    if (!(cur.recentRules instanceof Map)) cur.recentRules = new Map();
    const lastHit = cur.recentRules.get(ruleId) || 0;
    if (now - lastHit < RULE_STRIKE_WINDOW_MS) {
      strikeMemory.set(ipHash, cur);
      return false; // same rule already counted — no new strike
    }
    cur.recentRules.set(ruleId, now);
  }

  cur.strikeLog.push(now);
  cur.strikes = liveStrikes + 1;
  strikeMemory.set(ipHash, cur);

  if (cur.strikes >= BLOCK_THRESHOLD && (!cur.blockedUntil || cur.blockedUntil < now)) {
    const until = now + blockDurationMs(cur.strikes);
    memoryBlock(ipHash, until, reason);
    persistBlock(ipHash, ipPreview, reason, until);
    return true; // newly blocked
  }
  return false;
}

let warnedTableMissing = false;

/* ── Helpers ──────────────────────────────────────────────── */
function previewIp(ip) {
  if (!ip) return null;
  const s = String(ip);
  if (s.includes(':')) return s.split(':').slice(0, 2).join(':') + '::*'; // IPv6-ish
  const parts = s.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return s.slice(0, 8) + '…';
}

function cleanSnippet(v, max = 200) {
  return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

/* ── Verified attacker identification ───────────────────────
   Only a CRYPTOGRAPHICALLY VERIFIED token earns identification (and
   therefore a notification) — a forged user_id in the body must never
   point our security response at an innocent user. */
let remoteJWKS = null;
function getJWKS() {
  if (!remoteJWKS && process.env.SUPABASE_URL) {
    try {
      const { createRemoteJWKSet } = require('jose');
      remoteJWKS = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
    } catch { /* jose unavailable — identification disabled */ }
  }
  return remoteJWKS;
}

async function identifyAttacker(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token.length > 2048) return null;
  const JWKS = getJWKS();
  if (!JWKS) return null;
  try {
    const { jwtVerify } = require('jose');
    const { payload } = await jwtVerify(token, JWKS, { expiresIn: '7d' });
    return payload?.sub ? { id: payload.sub, email: payload.email || null } : null;
  } catch {
    return null; // invalid/forged token → anonymous attacker
  }
}

/* ── Payload scanning ─────────────────────────────────────── */
function scanString(value) {
  if (typeof value !== 'string' || value.length < 4 || value.length > 20000) return null;
  for (const rule of RULES) {
    const m = value.match(rule.re);
    if (m) return { rule: rule.id, severity: rule.sev, match: cleanSnippet(m[0], 60), sample: value };
  }
  return null;
}

/* Recursively scan JSON bodies (keys always, values except code fields). */
function scanObject(obj, depth = 0) {
  if (depth > 6 || obj == null) return null;
  if (typeof obj === 'string') return scanString(obj);
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 50)) {
      const hit = scanObject(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj).slice(0, 50)) {
      const keyHit = scanString(key);
      if (keyHit) return keyHit;
      if (typeof value === 'string' && CODE_FIELD_EXEMPT.has(key.toLowerCase())) continue;
      const hit = scanObject(value, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

/* Full request scan: path, query, auth header, referer, JSON body. */
function scanRequest(req) {
  const hits = [];

  const push = (hit, where) => { if (hit) hits.push({ ...hit, where }); };

  // Path + query string (raw URL catches encoded probes like ..%2f —
  // try both raw and decoded)
  const raw = `${req.originalUrl || req.url}`;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* malformed encoding IS suspicious */ }
  push(scanString(raw), 'url');
  if (decoded !== raw) push(scanString(decoded), 'url');

  if (req.query) {
    for (const [k, v] of Object.entries(req.query).slice(0, 30)) {
      const val = Array.isArray(v) ? v.join(' ') : String(v ?? '');
      push(scanString(val), 'query');
      push(scanString(k), 'query');
    }
  }

  const auth = req.headers.authorization;
  if (auth) push(scanString(auth.slice(0, 500)), 'auth-header');
  const referer = req.headers.referer;
  if (referer) push(scanString(referer.slice(0, 300)), 'referer');

  if (req.body && typeof req.body === 'object') push(scanObject(req.body), 'body');

  return hits;
}

/* ── Verified-admin escape hatch ────────────────────────────
   A block on a shared/office/NAT IP can lock the ADMIN out of the very
   panel that lifts blocks — and since blocks persist in the DB, the
   lockout outlives restarts. A CRYPTOGRAPHICALLY VERIFIED admin JWT
   (signature checked against Supabase's JWKS + role re-checked in the
   DB, same standard as requireAdmin) is exempt from the blocklist.
   Forgery is useless: a forged token fails verification and stays
   blocked. Cached 5 min so the hot path stays cheap. */
async function isVerifiedAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token.length > 2048) return false;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const cached = adminCheckCache.get(tokenHash);
  if (cached && Date.now() - cached.checkedAt < ADMIN_CHECK_TTL_MS) return cached.isAdmin;

  let isAdmin = false;
  try {
    const user = await identifyAttacker(req);
    if (user?.id && adminClient) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }
  } catch { /* verification failed → treat as non-admin */ }

  adminCheckCache.set(tokenHash, { isAdmin, checkedAt: Date.now() });
  if (adminCheckCache.size > 500) {
    const cutoff = Date.now() - ADMIN_CHECK_TTL_MS;
    for (const [k, v] of adminCheckCache) if (v.checkedAt < cutoff) adminCheckCache.delete(k);
  }
  return isAdmin;
}

/* ── Blocking ─────────────────────────────────────────────── */
function blockDurationMs(strikeCount) {
  // 1st block: 1h, 2nd: 6h, 3+: 24h
  const hours = strikeCount <= BLOCK_THRESHOLD ? 1 : strikeCount <= BLOCK_THRESHOLD * 2 ? 6 : 24;
  return hours * 3600 * 1000;
}

function memoryBlock(ipHash, untilMs, reason) {
  const cur = strikeMemory.get(ipHash) || { strikes: 0, blockedUntil: null };
  cur.blockedUntil = untilMs;
  strikeMemory.set(ipHash, cur);
  blockCache.set(ipHash, { blockedUntil: untilMs, checkedAt: Date.now() });
  console.warn(`[SECURITY] IP ${ipHash.slice(0, 8)}… blocked until ${new Date(untilMs).toISOString()} — ${reason}`);
}

async function persistBlock(ipHash, ipPreview, reason, blockedUntil) {
  if (!adminClient) return;
  try {
    const { error } = await adminClient.from('ip_blocklist').upsert({
      ip_hash: ipHash,
      ip_preview: ipPreview,
      reason,
      blocked_until: new Date(blockedUntil).toISOString()
    }, { onConflict: 'ip_hash' });
    if (error && !warnedTableMissing) {
      warnedTableMissing = true;
      console.warn(`[SECURITY] ip_blocklist unavailable (${error.message}) — in-memory blocking only`);
    }
  } catch (e) {
    if (!warnedTableMissing) { warnedTableMissing = true; console.warn(`[SECURITY] blocklist persist failed: ${e.message}`); }
  }
}

/* Is this IP currently blocked? Memory first (0 cost), DB cache 30s. */
async function isBlocked(ipHash) {
  if (!ipHash) return false;
  const mem = blockCache.get(ipHash);
  const now = Date.now();
  if (mem && now - mem.checkedAt < CACHE_TTL_MS) {
    return !!mem.blockedUntil && mem.blockedUntil > now;
  }
  let blockedUntil = null;
  if (adminClient) {
    try {
      const { data } = await adminClient.from('ip_blocklist')
        .select('blocked_until')
        .eq('ip_hash', ipHash)
        .gt('blocked_until', new Date().toISOString())
        .maybeSingle();
      blockedUntil = data ? new Date(data.blocked_until).getTime() : null;
    } catch { /* table missing — memory only */ }
  }
  blockCache.set(ipHash, { blockedUntil, checkedAt: now });
  return !!blockedUntil && blockedUntil > now;
}



/* ── Alerts + attacker notification ───────────────────────── */
async function alertAdmins(event) {
  const key = `${event.event_type}:${event.ip_hash || 'anon'}`;
  const last = alertThrottle.get(key) || 0;
  if (Date.now() - last < ALERT_DEDUP_MS) return; // flood guard
  alertThrottle.set(key, Date.now());

  await logService.createAdminAlert({
    title: `🚨 ${event.event_type.replace(/_/g, ' ')} (${event.severity})`,
    message: event.blocked
      ? `Blocked. ${event.ip_preview || 'unknown IP'} → ${event.method} ${event.path} — matched ${event.matched_pattern}`
      : `Detected. ${event.ip_preview || 'unknown IP'} → ${event.method} ${event.path} — matched ${event.matched_pattern}`,
    type: 'security',
    severity: event.severity,
    link: event.path,
    source: 'security-monitor',
    metadata: {
      event_type: event.event_type,
      ip_preview: event.ip_preview,
      user_id: event.user_id || null,
      user_email_masked: event.user_email_masked || null,
      matched_pattern: event.matched_pattern,
      snippet: event.snippet,
      blocked: event.blocked,
      request_id: event.request_id
    }
  });
}

/* Notify the attacker IF they are a verified logged-in user. */
async function notifyAttackerUser(user, event) {
  if (!user || !user.id) return;
  const key = user.id;
  if (Date.now() - (notifThrottle.get(key) || 0) < NOTIF_DEDUP_MS) return;
  notifThrottle.set(key, Date.now());

  try {
    const notificationService = require('./notificationService');
    await notificationService.createNotification({
      user_id: user.id,
      title: '⚠️ Security alert on your account',
      message: event.blocked
        ? 'Suspicious activity was detected from your session and the request was blocked. If this was you (e.g. pasting unusual content), no action is needed. If not, change your password immediately.'
        : 'Suspicious activity was detected from your session. If this was you, no action is needed. If not, change your password immediately.',
      type: 'warning',
      link: '/learn/settings'
    });
  } catch (e) {
    console.warn('[SECURITY] attacker notification failed:', e.message);
  }
}

/* ── Main entry: record an attack ─────────────────────────── */
async function recordAttack(req, hit) {
  try {
    const ip = logService.clientIp(req);
    const ipHash = logService.hashIp(ip);
    const user = await identifyAttacker(req);

    const event = {
      event_type: hit.event_type || 'payload_suspicious',
      severity: hit.severity || 'medium',
      ip_hash: ipHash,
      ip_preview: previewIp(ip),
      user_id: user?.id || null,
      user_email_masked: user?.email ? logService.maskEmail(user.email) : null,
      path: (req.originalUrl || req.url || '').slice(0, 300),
      method: req.method,
      matched_pattern: hit.rule || hit.matched_pattern || null,
      snippet: hit.sample ? cleanSnippet(hit.sample) : null,
      user_agent: (req.headers['user-agent'] || '').slice(0, 200),
      request_id: req.id || req.headers['x-request-id'] || null,
      blocked: false
    };

    // Block decision: high/critical deny immediately; medium earns a strike.
    const denyNow = event.severity === 'high' || event.severity === 'critical';
    if (denyNow || event.severity === 'medium') {
      const reason = `${event.matched_pattern} on ${event.method} ${event.path}`;
      const newlyBlocked = await addStrike(ipHash, event.ip_preview, reason, event.matched_pattern);
      event.blocked = denyNow || newlyBlocked;
    }

    // Persist the event (best-effort — detection still works if DB is down)
    if (adminClient) {
      const { error } = await adminClient.from('security_events').insert({
        event_type: event.event_type,
        severity: event.severity,
        ip_hash: event.ip_hash,
        ip_preview: event.ip_preview,
        user_id: event.user_id,
        user_email_masked: event.user_email_masked,
        path: event.path,
        method: event.method,
        matched_pattern: event.matched_pattern,
        snippet: event.snippet,
        user_agent: event.user_agent,
        request_id: event.request_id,
        blocked: event.blocked
      });
      if (error && !warnedTableMissing) {
        warnedTableMissing = true;
        console.warn(`[SECURITY] security_events unavailable (${error.message}) — run migrations/add_security_events.sql`);
      }
    } else if (!warnedTableMissing) {
      warnedTableMissing = true;
      console.warn('[SECURITY] no DB client — security events kept in memory only');
    }

    await Promise.all([
      alertAdmins(event),
      event.user_id ? notifyAttackerUser(user, event) : Promise.resolve()
    ]);

    return event;
  } catch (e) {
    console.warn('[SECURITY] recordAttack failed:', e.message);
    return null;
  }
}

/* ── Rate-limit abuse tracking (called by rateLimit.js on 429) ── */
async function recordRateLimitAbuse(req) {
  try {
    const ip = logService.clientIp(req);
    const ipHash = logService.hashIp(ip);
    const now = Date.now();
    const cur = RATE_ABUSE_WINDOW.get(ipHash) || { count: 0, windowStart: now };
    if (now - cur.windowStart > 15 * 60 * 1000) { cur.count = 0; cur.windowStart = now; }
    cur.count += 1;
    RATE_ABUSE_WINDOW.set(ipHash, cur);

    // Only surface a real storm (40+ throttled hits in the window) —
    // individual 429s are normal traffic shaping, not attacks.
    if (cur.count === 40) {
      await recordAttack(req, {
        event_type: 'rate_limit_abuse',
        severity: 'medium',
        rule: 'rate_limit_storm',
        sample: `${cur.count} throttled requests in 15 min`
      });
    }
  } catch { /* never break the rate limiter */ }
}

/* Whitelisted IPs (proxy health checks, office IP…) — hashed like everything else. */
const WHITELIST = new Set(
  (process.env.SECURITY_WHITELIST_IPS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(ip => logService.hashIp(ip))
);
function isWhitelisted(ipHash) { return WHITELIST.has(ipHash); }

/* ── Block management (admin API + CLI) ────────────────────
   The strike system previously had no unblock path: an admin who
   tripped the alarm (or a school NAT that ate one) stayed locked out
   for up to 24h with no recourse. These helpers clear blocks in BOTH
   stores — memory first (hot path reads it for 30s), then the DB. */

/** All currently-blocked IPs: DB rows + any newer memory-only blocks. */
async function listBlocks() {
  const now = Date.now();
  const blocks = [];

  // In-memory strikes/blocks (covers DB being down or a block that is
  // newer than the last DB write)
  for (const [ipHash, s] of strikeMemory) {
    const blockedUntil = s.blockedUntil && s.blockedUntil > now ? s.blockedUntil : null;
    blocks.push({ ip_hash: ipHash, blocked_until: blockedUntil ? new Date(blockedUntil).toISOString() : null, strikes: s.strikes, source: 'memory' });
  }

  if (adminClient) {
    try {
      const { data, error } = await adminClient.from('ip_blocklist')
        .select('ip_hash, ip_preview, reason, blocked_until')
        .gt('blocked_until', new Date().toISOString());
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const mem = blocks.find(b => b.ip_hash === row.ip_hash);
          if (mem) { mem.ip_preview = row.ip_preview; mem.reason = row.reason; mem.source = 'db+memory'; }
          else blocks.push({ ip_hash: row.ip_hash, ip_preview: row.ip_preview, reason: row.reason, blocked_until: row.blocked_until, strikes: null, source: 'db' });
        }
      }
    } catch (e) {
      console.warn('[SECURITY] listBlocks DB query failed:', e.message);
    }
  }

  return blocks;
}

/**
 * Lift a block. `ipPlain` is the RAW IP (IPv4/IPv6) — we hash it the same
 * way the monitor does. When called from the HTTP API the raw IP never
 * leaves the server; the CLI passes it locally.
 * Returns { found, cleared } so the caller can tell "nothing to clear".
 */
async function unblockIp(ipPlain) {
  const ipHash = logService.hashIp(String(ipPlain || '').trim());
  if (!ipHash) return { found: false, cleared: false };

  let found = false;

  // Memory: clear the block AND the strike count (otherwise the next
  // single strike re-blocks immediately at the escalated duration).
  if (strikeMemory.has(ipHash)) {
    const cur = strikeMemory.get(ipHash);
    found = found || !!cur.blockedUntil;
    strikeMemory.set(ipHash, { strikes: 0, blockedUntil: null, strikeLog: [], recentRules: new Map() });
  }
  if (blockCache.has(ipHash)) {
    blockCache.set(ipHash, { blockedUntil: null, checkedAt: Date.now() });
  }

  // DB row (persisted blocks survive restarts)
  if (adminClient) {
    try {
      const { data, error } = await adminClient.from('ip_blocklist')
        .delete()
        .eq('ip_hash', ipHash)
        .select();
      if (!error && Array.isArray(data)) found = found || data.length > 0;
    } catch (e) {
      console.warn('[SECURITY] unblockIp DB delete failed:', e.message);
    }
  }

  return { found, cleared: true };
}

module.exports = {
  RULES,
  scanRequest,
  scanString,
  identifyAttacker,
  isBlocked,
  isWhitelisted,
  isVerifiedAdmin,
  recordAttack,
  recordRateLimitAbuse,
  previewIp,
  listBlocks,
  unblockIp,
  // exposed for tests
  _internals: { strikeMemory, blockCache, alertThrottle, notifThrottle, BLOCK_THRESHOLD, STRIKE_DECAY_MS }
};
