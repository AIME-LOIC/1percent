-- ============================================================
-- 1% Digital Solutions — Error Logging, System Logs & Admin Alerts
-- ============================================================
-- Run this in the Supabase SQL Editor (or `psql`) to bootstrap the
-- error/observability tables used by the backend.
--
-- PURPOSE
--   * error_logs   -> every application error (backend, frontend, worker)
--                     so support/admin can see what a user hit.
--   * system_logs  -> general system activity/events (signups, payments,
--                     cron runs, migrations…) for auditing + debugging.
--   * admin_alerts -> system-wide notifications for admins ("things
--                     happening on the system") with read/unread state.
--
-- The backend writes to these tables through the service-role Supabase
-- client (bypasses RLS). Admins read them through RLS-protected queries.
-- ============================================================

-- 0. Extensions
-- ============================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================
-- 1. ERROR LOGS
-- ============================================================
-- One row per occurrence. `fingerprint` groups repeated errors so the
-- admin UI can collapse "the same bug hit 240 users" into one item.
create table if not exists public.error_logs (
  id              uuid primary key default gen_random_uuid(),

  -- Who hit the issue (nullable: anonymous / server-side errors)
  user_id         uuid references auth.users(id) on delete set null,
  user_email      text,
  -- support contact so an admin can reach out about this specific report
  contact_email   text,

  -- Classification
  level           text not null default 'error'
                    check (level in ('debug', 'info', 'warning', 'error', 'fatal', 'critical')),
  source          text not null default 'backend'
                    check (source in ('backend', 'frontend', 'worker', 'database', 'cli', 'vscode')),
  error_code      text,                          -- app code, e.g. 'AUTH_401', 'PAYMENT_FAILED'
  status_code     int,                           -- HTTP status if applicable

  -- What happened
  message         text not null,
  stack           text,
  fingerprint     text,                          -- stable hash used for grouping
  context         jsonb not null default '{}'::jsonb,  -- arbitrary extra payload

  -- Request metadata (so support can reproduce)
  method          text,
  path            text,
  url             text,
  user_agent      text,
  ip_address      inet,
  request_id      text,

  -- Lifecycle / triage
  is_resolved     boolean not null default false,
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,

  -- Counting + timestamps
  occurrence_count int not null default 1,
  is_client_reported boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

-- Query paths used by the admin dashboard
create index if not exists idx_error_logs_created_at
  on public.error_logs (created_at desc);
create index if not exists idx_error_logs_level
  on public.error_logs (level, created_at desc);
create index if not exists idx_error_logs_unresolved
  on public.error_logs (is_resolved, created_at desc) where is_resolved = false;
create index if not exists idx_error_logs_user
  on public.error_logs (user_id, created_at desc);
create index if not exists idx_error_logs_fingerprint
  on public.error_logs (fingerprint, last_seen_at desc);
create index if not exists idx_error_logs_source
  on public.error_logs (source, created_at desc);

-- ============================================================
-- 2. SYSTEM LOGS (activity / events)
-- ============================================================
-- Append-only audit trail of "things happening on the system".
create table if not exists public.system_logs (
  id          uuid primary key default gen_random_uuid(),
  level       text not null default 'info'
                check (level in ('debug', 'info', 'warn', 'error')),
  event       text not null,                  -- e.g. 'user.signup', 'payment.completed'
  message     text,
  source      text not null default 'backend',
  user_id     uuid references auth.users(id) on delete set null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_system_logs_created_at
  on public.system_logs (created_at desc);
create index if not exists idx_system_logs_event
  on public.system_logs (event, created_at desc);
create index if not exists idx_system_logs_level
  on public.system_logs (level, created_at desc);
create index if not exists idx_system_logs_user
  on public.system_logs (user_id, created_at desc);

-- ============================================================
-- 3. ADMIN ALERTS (system-wide notifications for admins)
-- ============================================================
create table if not exists public.admin_alerts (
  id           uuid primary key default gen_random_uuid(),
  type         text not null default 'error'
                 check (type in ('error', 'warning', 'info', 'security', 'payment', 'system')),
  severity     text not null default 'medium'
                 check (severity in ('low', 'medium', 'high', 'critical')),
  title        text not null,
  message      text not null default '',
  link         text,                          -- deep link into the admin UI
  source       text not null default 'backend',
  error_log_id uuid references public.error_logs(id) on delete set null,
  metadata     jsonb not null default '{}'::jsonb,
  is_read      boolean not null default false,
  read_by      uuid references auth.users(id) on delete set null,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_admin_alerts_created_at
  on public.admin_alerts (created_at desc);
create index if not exists idx_admin_alerts_unread
  on public.admin_alerts (is_read, created_at desc) where is_read = false;
create index if not exists idx_admin_alerts_severity
  on public.admin_alerts (severity, created_at desc);

-- ============================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists error_logs_touch_updated_at on public.error_logs;
create trigger error_logs_touch_updated_at
  before update on public.error_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists admin_alerts_touch_updated_at on public.admin_alerts;
create trigger admin_alerts_touch_updated_at
  before update on public.admin_alerts
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 5. DEDUPE HELPER — upsert an error by fingerprint
-- ============================================================
-- If the same fingerprint (same bug) was seen in the last `window_minutes`,
-- bump its counter instead of inserting a brand-new row. Keeps the log
-- table small and lets admins see "how many times did this happen".
create or replace function public.record_error(
  p_fingerprint   text,
  p_level         text,
  p_source        text,
  p_message       text,
  p_stack         text default null,
  p_error_code    text default null,
  p_status_code   int  default null,
  p_method        text default null,
  p_path          text default null,
  p_url           text default null,
  p_user_agent    text default null,
  p_ip_address    inet default null,
  p_request_id    text default null,
  p_user_id       uuid default null,
  p_user_email    text default null,
  p_contact_email text default null,
  p_context       jsonb default '{}'::jsonb,
  p_is_client     boolean default false,
  p_window_minutes int default 60
)
returns public.error_logs
language plpgsql
security definer
as $$
declare
  existing public.error_logs;
  inserted public.error_logs;
begin
  -- Only dedupe when we have a fingerprint
  if p_fingerprint is not null and not p_is_client then
    select * into existing
    from public.error_logs
    where fingerprint = p_fingerprint
      and is_resolved = false
      and last_seen_at > now() - make_interval(mins => greatest(p_window_minutes, 1))
    order by last_seen_at desc
    limit 1;

    if existing.id is not null then
      update public.error_logs
         set occurrence_count = occurrence_count + 1,
             last_seen_at      = now(),
             status_code       = coalesce(p_status_code, status_code),
             context           = coalesce(p_context, context)
       where id = existing.id
       returning * into existing;
      return existing;
    end if;
  end if;

  insert into public.error_logs (
    user_id, user_email, contact_email,
    level, source, error_code, status_code,
    message, stack, fingerprint, context,
    method, path, url, user_agent, ip_address, request_id,
    occurrence_count, is_client_reported
  ) values (
    p_user_id, p_user_email, p_contact_email,
    coalesce(p_level, 'error'), coalesce(p_source, 'backend'), p_error_code, p_status_code,
    p_message, p_stack, p_fingerprint, coalesce(p_context, '{}'::jsonb),
    p_method, p_path, p_url, p_user_agent, p_ip_address, p_request_id,
    1, coalesce(p_is_client, false)
  )
  returning * into inserted;

  return inserted;
end;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table public.error_logs  enable row level security;
alter table public.system_logs enable row level security;
alter table public.admin_alerts enable row level security;

-- error_logs: admins can read/update; anyone can report an error.
drop policy if exists "Admins can view error logs" on public.error_logs;
create policy "Admins can view error logs" on public.error_logs
  for select using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update error logs" on public.error_logs;
create policy "Admins can update error logs" on public.error_logs
  for update using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete error logs" on public.error_logs;
create policy "Admins can delete error logs" on public.error_logs
  for delete using (public.is_admin(auth.uid()));

drop policy if exists "Anyone can report an error" on public.error_logs;
create policy "Anyone can report an error" on public.error_logs
  for insert with check (true);

-- system_logs: admin-readable only (writes go through the service role).
drop policy if exists "Admins can view system logs" on public.system_logs;
create policy "Admins can view system logs" on public.system_logs
  for select using (public.is_admin(auth.uid()));

-- admin_alerts: admin-readable only (writes go through the service role).
drop policy if exists "Admins can view admin alerts" on public.admin_alerts;
create policy "Admins can view admin alerts" on public.admin_alerts
  for select using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update admin alerts" on public.admin_alerts;
create policy "Admins can update admin alerts" on public.admin_alerts
  for update using (public.is_admin(auth.uid()));

-- ============================================================
-- 7. GRANTS
-- ============================================================
-- Allow the record_error() helper to be called by the backend role.
grant execute on function public.record_error(
  text, text, text, text, text, text, int, text, text, text, text, inet, text,
  uuid, text, text, jsonb, boolean, int
) to service_role;

-- ============================================================
-- 8. ADMIN VIEWS (handy for the dashboard / SQL editor)
-- ============================================================

-- Unresolved errors grouped by fingerprint, most recent first.
create or replace view public.unresolved_error_summary as
select
  fingerprint,
  max(message)              as sample_message,
  max(level)                as level,
  max(source)               as source,
  max(path)                 as path,
  sum(occurrence_count)     as total_occurrences,
  count(*)                  as distinct_reports,
  min(created_at)           as first_seen_at,
  max(last_seen_at)         as last_seen_at
from public.error_logs
where is_resolved = false
group by fingerprint
order by max(last_seen_at) desc;

-- Unread admin alerts count per severity.
create or replace view public.unread_admin_alerts as
select severity, type, count(*) as total
from public.admin_alerts
where is_read = false
group by severity, type
order by total desc;
