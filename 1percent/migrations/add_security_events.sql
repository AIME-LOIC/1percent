-- ============================================================
-- Security monitoring: attack detection + IP tracking + blocking
-- ============================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,              -- payload_suspicious | xss_attempt | sqli_attempt | path_probe | rate_limit_abuse | host_spoof | auth_abuse
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_hash TEXT,                          -- HMAC-SHA256 (peppered), 32 hex chars — never raw IPs
  ip_preview TEXT,                       -- e.g. '102.89.*.*' — enough to eyeball, not enough to identify
  user_id UUID,                          -- set when the attacker IS a logged-in user
  user_email_masked TEXT,                -- 'a***@gmail.com'
  path TEXT,
  method TEXT,
  matched_pattern TEXT,                  -- which rule fired
  snippet TEXT,                          -- truncated evidence (sanitized, 200 chars)
  user_agent TEXT,
  request_id TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_hash);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- ============================================================
-- IP blocklist (auto-block on repeat abuse)
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_blocklist (
  ip_hash TEXT PRIMARY KEY,
  ip_preview TEXT,
  reason TEXT NOT NULL,
  strikes INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMPTZ NOT NULL,     -- expiry keeps the table self-cleaning
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS: nobody touches these via anon/authenticated keys.
-- Only the server (service role) and admins read them.
-- ============================================================
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;

-- Admin alert goes through admin_alerts (already exists). No grants needed
-- for anon/authenticated on these two tables (default deny with RLS on).
