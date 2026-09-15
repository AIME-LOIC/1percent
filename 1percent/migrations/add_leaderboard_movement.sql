-- ============================================================
-- Leaderboard movement (green ▲ / red ▼ vs previous day)
-- One row per user per board_type per UTC day, written by the
-- leaderboard endpoint as a side effect. Movement = current
-- rank minus the most recent snapshot from a PREVIOUS day.
-- ============================================================

create table if not exists leaderboard_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_type text not null default 'coins'
    check (board_type in ('coins', 'streak')),
  rank int not null,
  score bigint not null default 0,
  snapshot_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),

  -- one snapshot per user per board per day (overwrites on re-rank)
  unique (user_id, board_type, snapshot_date)
);

create index if not exists idx_lbrs_lookup
  on leaderboard_rank_snapshots (board_type, snapshot_date desc);
create index if not exists idx_lbrs_user
  on leaderboard_rank_snapshots (user_id, board_type, snapshot_date desc);

alter table leaderboard_rank_snapshots enable row level security;

-- Reads go through the service-role backend; keep it default-deny like
-- the other feature tables. Add a SELECT policy here if you ever want
-- clients to query it directly.
