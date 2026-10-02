-- ============================================================
-- PROJECT SYSTEM — businesses, projects, requirements, milestones,
-- tasks, teams, repositories, activities, webhooks
-- ============================================================
-- Adds the development/project-management ecosystem on top of the
-- EXISTING learn schema (profiles, auth.users, mentor_assignments,
-- notifications…). Nothing existing is dropped or rewritten.
--
-- Students are the developers: student dashboard shows the project
-- they build; mentors review; businesses request and monitor;
-- admins manage. GitHub App webhooks normalize into
-- project_activities (evidence — never automatic progress).
--
-- Idempotent — safe to run more than once.
-- Run AFTER database_consolidated.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Allow the new 'business' role on profiles.
--    The existing CHECK constraint has an unknown auto-name
--    (profiles_role_check / profiles_role_check1 / …), so find it
--    dynamically and replace it if it does not already allow
--    'business'.
-- ------------------------------------------------------------
do $$
declare
  con record;
begin
  select c.conname into con
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'profiles'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%role%'
    and pg_get_constraintdef(c.oid) not like '%business%';

  if found then
    execute format('alter table public.profiles drop constraint %I', con.conname);
  end if;
end $$;

-- (Re)create the constraint including 'business'. IF NOT EXISTS-style:
-- only added when missing (after the drop above, it always is missing
-- when a restrictive version existed).
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%business%'
  ) then
    alter table public.profiles
      add constraint profiles_role_with_business_check
      check (role in ('student', 'mentor', 'admin', 'business'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 1. COMPANIES (business accounts) — one per auth user signup
-- ------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  email         text not null default '',
  phone         text default '',
  website       text default '',
  industry      text default '',
  country       text default 'Rwanda',
  city          text default '',
  company_size  text default '' check (company_size in ('1-2','3-10','10-50','50-200','200+') or company_size = ''),
  contact_person text default '',
  contact_role  text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id)
);

create index if not exists idx_companies_owner on public.companies(owner_id);

drop trigger if exists update_companies_updated_at on public.companies;
create trigger update_companies_updated_at before update on public.companies
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 2. PROJECTS — core engine object
-- ------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  business_id   uuid references public.companies(id) on delete set null,
  owner_id      uuid references public.profiles(id) on delete set null,  -- admin/mentor owner
  status        text not null default 'REQUESTED'
                check (status in ('REQUESTED','REVIEW','APPROVED','PLANNING','IN_DEVELOPMENT',
                                  'TESTING','DEPLOYMENT','DELIVERED','ARCHIVED','BLOCKED')),
  priority      text not null default 'MEDIUM'
                check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  start_date    date,
  target_date   date,
  -- dimension weights for the progress view (percent each dimension shows);
  -- overall progress stays requirement-driven regardless of these.
  dev_dimension_weight    int not null default 30 check (dev_dimension_weight between 0 and 100),
  testing_dimension_weight int not null default 25 check (testing_dimension_weight between 0 and 100),
  docs_dimension_weight    int not null default 20 check (docs_dimension_weight between 0 and 100),
  deploy_dimension_weight  int not null default 25 check (deploy_dimension_weight between 0 and 100),
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_projects_business on public.projects(business_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_owner on public.projects(owner_id);

drop trigger if exists update_projects_updated_at on public.projects;
create trigger update_projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 3. PROJECT REQUESTS (business intake → REQUESTED → review)
-- ------------------------------------------------------------
create table if not exists public.project_requests (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.companies(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  name           text not null,
  problem        text not null,
  desired_solution text default '',
  requirements   text default '',          -- free-form business requirements
  target_users   text default '',
  priority       text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  timeline       text default '',
  budget_range   text default '',
  attachments    jsonb not null default '[]'::jsonb,   -- [{label,url}]
  notes          text default '',
  status         text not null default 'REQUESTED'
                 check (status in ('REQUESTED','REVIEW','APPROVED','REJECTED')),
  admin_note     text default '',
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_project_requests_business on public.project_requests(business_id);
create index if not exists idx_project_requests_status on public.project_requests(status);

drop trigger if exists update_project_requests_updated_at on public.project_requests;
create trigger update_project_requests_updated_at before update on public.project_requests
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 4. TEAMS + MEMBERS
-- ------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  description text default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_teams_project on public.teams(project_id);

create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'developer'
             check (role in ('developer','backend','frontend','fullstack','qa','designer','lead')),
  joined_at  timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_team on public.team_members(team_id);

-- ------------------------------------------------------------
-- 5. MILESTONES + REQUIREMENTS (weighted)
--    Milestones first: requirements reference them.
-- ------------------------------------------------------------
create table if not exists public.project_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  description  text default '',
  due_date     date,
  status       text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','COMPLETED')),
  completed_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_milestones_project on public.project_milestones(project_id);

create table if not exists public.project_requirements (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  name         text not null,
  description  text default '',
  weight       int not null default 10 check (weight between 0 and 100),
  status       text not null default 'TODO'
               check (status in ('TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE')),
  priority     text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  acceptance_criteria text default '',
  manually_completed boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_requirements_project on public.project_requirements(project_id);

drop trigger if exists update_requirements_updated_at on public.project_requirements;
create trigger update_requirements_updated_at before update on public.project_requirements
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 6. TASKS
-- ------------------------------------------------------------
create table if not exists public.project_tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid references public.project_requirements(id) on delete set null,
  milestone_id   uuid references public.project_milestones(id) on delete set null,
  title          text not null,
  description    text default '',
  status         text not null default 'TODO'
                 check (status in ('TODO','IN_PROGRESS','BLOCKED','IN_REVIEW','TESTING','DONE')),
  priority       text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  assignee_id    uuid references public.profiles(id) on delete set null,
  estimate_hours numeric(5,1),
  due_date       date,
  github_issue_url text default '',
  github_pr_url    text default '',
  completed_at   timestamptz,
  blocked_reason text default '',
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.project_tasks(project_id);
create index if not exists idx_tasks_assignee on public.project_tasks(assignee_id);
create index if not exists idx_tasks_status on public.project_tasks(project_id, status);

drop trigger if exists update_tasks_updated_at on public.project_tasks;
create trigger update_tasks_updated_at before update on public.project_tasks
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 7. REPOSITORIES (GitHub App) + PROJECT LINK
--    github repo id is the stable external identifier — never the name.
-- ------------------------------------------------------------
create table if not exists public.repositories (
  id              uuid primary key default gen_random_uuid(),
  github_repo_id  bigint not null unique,          -- GitHub's stable repository ID
  owner           text not null,
  name            text not null,
  full_name       text not null,
  url             text not null default '',
  default_branch  text default 'main',
  installation_id bigint,
  is_private      boolean not null default false,
  sync_status     text not null default 'ACTIVE'
                  check (sync_status in ('ACTIVE','STALE','SUSPENDED','REMOVED')),
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_repositories_full_name on public.repositories(full_name);

drop trigger if exists update_repositories_updated_at on public.repositories;
create trigger update_repositories_updated_at before update on public.repositories
  for each row execute function public.update_updated_at();

create table if not exists public.project_repositories (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.repositories(id) on delete cascade,
  connected_by  uuid references public.profiles(id) on delete set null,
  connected_at  timestamptz not null default now(),
  unique (project_id, repository_id)
);

create index if not exists idx_project_repositories_repo on public.project_repositories(repository_id);

-- ------------------------------------------------------------
-- 8. ACTIVITIES (normalized GitHub + platform events)
-- ------------------------------------------------------------
create table if not exists public.project_activities (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,   -- matched 1percent user, may be null
  type        text not null,
              -- COMMIT_PUSHED, PR_OPENED, PR_MERGED, REVIEW_SUBMITTED, ISSUE_OPENED,
              -- ISSUE_CLOSED, TEST_PASSED, TEST_FAILED, DEPLOYMENT_COMPLETED,
              -- TASK_COMPLETED, MENTOR_FEEDBACK, MILESTONE_COMPLETED, PROJECT_STATUS_CHANGED,
              -- DOC_UPDATED, REPO_CONNECTED
  actor       text not null default '',        -- GitHub login or display name
  title       text not null default '',
  metadata    jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists idx_activities_project_time on public.project_activities(project_id, occurred_at desc);
create index if not exists idx_activities_user_time on public.project_activities(user_id, occurred_at desc);

-- ------------------------------------------------------------
-- 9. PULL REQUESTS + REVIEWS + DEPLOYMENTS (evidence caches)
-- ------------------------------------------------------------
create table if not exists public.pull_requests (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  repository_id   uuid references public.repositories(id) on delete cascade,
  github_pr_id    bigint not null,
  number          int not null,
  title           text not null default '',
  author          text not null default '',
  state           text not null default 'open' check (state in ('open','closed','merged')),
  url             text not null default '',
  additions       int,
  deletions       int,
  opened_at       timestamptz,
  merged_at       timestamptz,
  updated_at      timestamptz not null default now(),
  unique (repository_id, github_pr_id)
);

create index if not exists idx_pull_requests_project on public.pull_requests(project_id, updated_at desc);

drop trigger if exists update_pull_requests_updated_at on public.pull_requests;
create trigger update_pull_requests_updated_at before update on public.pull_requests
  for each row execute function public.update_updated_at();

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  pull_request_id uuid not null references public.pull_requests(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  reviewer     text not null default '',
  state        text not null default 'COMMENTED'
               check (state in ('APPROVED','CHANGES_REQUESTED','COMMENTED')),
  body         text default '',
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_reviews_project on public.reviews(project_id, submitted_at desc);

create table if not exists public.deployments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  repository_id  uuid references public.repositories(id) on delete cascade,
  github_deployment_id bigint,
  environment    text not null default 'production',
  status         text not null default 'PENDING',
  url            text default '',
  ref            text default '',
  deployed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_deployments_project on public.deployments(project_id, deployed_at desc);

-- ------------------------------------------------------------
-- 10. DOCUMENTS + FEEDBACK
-- ------------------------------------------------------------
create table if not exists public.project_documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title      text not null,
  content_md text not null default '',
  kind       text not null default 'documentation'
             check (kind in ('documentation','spec','meeting_notes','deliverable')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_project on public.project_documents(project_id);

drop trigger if exists update_documents_updated_at on public.project_documents;
create trigger update_documents_updated_at before update on public.project_documents
  for each row execute function public.update_updated_at();

create table if not exists public.project_feedback (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  from_role  text not null default 'business' check (from_role in ('business','mentor','admin')),
  rating     int check (rating between 1 and 5),
  body       text not null,
  is_private boolean not null default false,   -- business feedback visible to team; private = admins only
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_project on public.project_feedback(project_id, created_at desc);

-- ------------------------------------------------------------
-- 11. PROJECT ASSIGNMENTS (student ↔ project, historical)
-- ------------------------------------------------------------
create table if not exists public.project_assignments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'developer',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at   timestamptz,
  unique (project_id, user_id)
);

create index if not exists idx_project_assignments_user on public.project_assignments(user_id);

-- ------------------------------------------------------------
-- 12. GITHUB WEBHOOK EVENTS (idempotency + audit)
-- ------------------------------------------------------------
create table if not exists public.github_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  delivery_id   text not null unique,            -- X-GitHub-Delivery
  event         text not null,                   -- X-GitHub-Event
  action        text default '',
  repository_id bigint,
  processed     boolean not null default false,
  processed_at  timestamptz,
  error         text default '',
  payload       jsonb not null default '{}'::jsonb,  -- trimmed, secret-free subset
  created_at    timestamptz not null default now()
);

create index if not exists idx_github_webhook_events_unprocessed
  on public.github_webhook_events (processed, created_at)
  where processed = false;
create index if not exists idx_github_webhook_events_repo
  on public.github_webhook_events (repository_id, created_at desc);

-- ------------------------------------------------------------
-- 13. MCP: allow the project token type
--     (student_mcp_tokens rows with label/type 'project')
-- ------------------------------------------------------------
alter table public.student_mcp_tokens
  add column if not exists token_type text not null default 'student';

-- ------------------------------------------------------------
-- 14. ROW LEVEL SECURITY
--     Browser clients never query these tables directly — the backend
--     (service role) enforces ownership scoping. RLS ON + no policies
--     = default deny, the established pattern for backend-only tables.
-- ------------------------------------------------------------
alter table public.companies            enable row level security;
alter table public.projects             enable row level security;
alter table public.project_requests     enable row level security;
alter table public.teams                enable row level security;
alter table public.team_members         enable row level security;
alter table public.project_requirements enable row level security;
alter table public.project_milestones   enable row level security;
alter table public.project_tasks        enable row level security;
alter table public.repositories         enable row level security;
alter table public.project_repositories enable row level security;
alter table public.project_activities   enable row level security;
alter table public.pull_requests        enable row level security;
alter table public.reviews              enable row level security;
alter table public.deployments          enable row level security;
alter table public.project_documents    enable row level security;
alter table public.project_feedback     enable row level security;
alter table public.project_assignments  enable row level security;
alter table public.github_webhook_events enable row level security;

-- Companies: owners may read their own company row (business dashboard needs it).
drop policy if exists "Companies view own" on public.companies;
create policy "Companies view own"
  on public.companies for select
  using (auth.uid() = owner_id);

-- Everything else: default deny for browser clients; all access flows
-- through backend endpoints using the service-role client, which enforces:
--   student  → own tasks + own teams' projects
--   mentor   → assigned students/teams/projects
--   business → own company's projects (delivery-safe fields)
--   admin    → full access
