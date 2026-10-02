# 1percent Project System — Architecture

> Status: implemented on branch `github-app-integration-20261001` (based on `learn`).
> Backup branch before this work: `backup/learn-before-project-system-20261001`.
> This document covers BOTH the pre-existing architecture (audited, untouched where noted)
> and the project engine added on top of it.

## 1. Pre-existing architecture (discovered — DO NOT REBUILD)

### Runtime
- **Single Express app** (`backend/index.js`) serves the API, the static `frontend/`, SEO pages
  (`sitemapRoutes`), and the SPA/HTML route maps. `server.js` boots `app` + socket.io + cron workers
  (`backend/workers/*`: AI retrain, streak, keep-alive).
- Middleware order in `backend/index.js` is load-bearing:
  1. HTTPS/host gate → `securityMonitor` → helmet (CSP) → conditional HSTS → CORS → compression
  2. **`express.json({limit:'5mb'})` + `express.urlencoded`** ← the GitHub webhook router is mounted
     BEFORE these so its raw-body signature check still works
  3. `securityBodyScan` → no-cache for `/api` → global `rateLimit` → `requestLogger`
  4. sitemapRoutes → static frontend → API routes → MCP mounts → HTML route maps → catch-all → error handler

### Database
- **Supabase (Postgres + RLS)**. Two clients in `backend/config/database.js`:
  - `adminClient` — service role, bypasses RLS, backend-only
  - `anonClient` — RLS applies (implicit flow for email links)
- Consolidated schema: `database_consolidated.sql` (+ per-feature `migrations/*.sql`, idempotent style:
  `IF NOT EXISTS`, guarded policies, RLS on for every table).

### Existing tables (relevant to this work)
| Domain | Tables |
|---|---|
| Identity | `profiles` (extends `auth.users`; `role ∈ student\|mentor\|admin`; coins/streak) |
| Learning | `courses, modules, lessons, enrollments, lesson_progress, lesson_quiz_passes, quizzes, quiz_questions, quiz_attempts, certificates, signatures, lesson_locks` |
| Practice | `challenges, challenge_submissions, coin_transactions, challenge_hints_unlocked, hint_allowance` |
| Files/Lab | `lab_files` |
| Monetization | `user_subscriptions, parent_payments` (payment gateway currently disabled by policy) |
| Community | `notifications, ratings, student_testimonials, leaderboard_rank_snapshots` |
| Mentor program | `mentor_assignments, mentor_weekly_shares, mentor_weekly_share_recipients` |
| Robotics club | `club_schools, club_members` |
| Observability | `error_logs, system_logs, admin_alerts, security_events, ip_blocklist` |
| MCP | `student_mcp_tokens, mcp_oauth_clients, mcp_oauth_codes, mcp_oauth_tokens` |
| Marketing | `services, service_requests` (lead capture — NOT a PM system) |

### Authentication & RBAC (existing, reused)
- Supabase JWT via `Authorization: Bearer`. `backend/middlewares/auth.js`:
  - `authenticate` — verifies via `auth.getUser` with a 30s verified-token cache; 503 on transient failures
  - `optionalAuth` — local JWKS verification, continues without a user
  - `requireRole(...roles)` / `requireAdmin` — re-read `profiles.role` from the DB each call
- Roles: `student | mentor | admin` (+ `business` **added by this work**). There is no separate
  "developer" role — **students are the developers** in this ecosystem.

### MCP (existing, preserved)
- `backend/mcp/core.js` — admin toolset (13 course/challenge tools), mounted at `/mcp/:token?`
- `backend/mcp/studentCore.js` — student read-only toolset (7 tools), mounted at `/mcp/student/:token?`
- `backend/routes/mcpOAuthRoutes.js` — OAuth 2.0 (RFC 9728 metadata, dynamic client registration, PKCE)
- Tokens: hashed at rest (`token_hash`), scopes `read | grade | admin`. **Extended** with project tools
  (see §4).

### CLI (existing, preserved)
- `cli/` — `onepercent-learn-cli` (commander, conf, node-fetch). Commands: login, whoami, ls, upload,
  download, rm, pull, project, premium. Auth token stored via `conf` (OS keychain-backed store).
- **Extended** with `1p status / task list / task start / task done / activity / progress`.

### VS Code extension (existing, preserved)
- `vscode-extension/` — TypeScript, challenges + courses tree views, submit, lab sync.
  **Extended** with a Project tree view (current project, tasks, progress).

### Frontend (existing, preserved)
- Static HTML + vanilla JS (`frontend/js/*.js` shared modules: auth, toast, nav, icons, modal…),
  CSS in `frontend/css/`. Student dashboard = `frontend/dashboard.html`; admin panel = `admin.html`.
- **Upgraded, not replaced**: dashboard.html gained a Developer Workspace section; new standalone pages
  were added for project/business views.

## 2. Project engine (new)

Relationship enforced end to end:

```
Business → Company → Project request → 1percent review → Project (APPROVED → PLANNING → …)
Project → Requirements (weights sum 100%) → Milestones → Tasks → Team assignment
Project ↔ GitHub repositories (installation-scoped GitHub App)
Webhooks → activity normalization → activities → progress evidence → dashboards
```

### Statuses
- **Project**: `REQUESTED, REVIEW, APPROVED, PLANNING, IN_DEVELOPMENT, TESTING, DEPLOYMENT, DELIVERED, ARCHIVED, BLOCKED`
- **Task**: `TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, TESTING, DONE`
- **Requirement**: `TODO, IN_PROGRESS, IN_REVIEW, TESTING, DONE`
- **Request**: `REQUESTED, REVIEW, APPROVED, REJECTED`

### Weighted progress (Phase 4 — core principle)
- Every requirement has a `weight` (integer %). All weights of a project must sum to 100.
- `requirement_contribution = weight × requirement_completion%` where completion is derived from
  its tasks: `DONE=1.0, TESTING=0.8, IN_REVIEW=0.6, IN_PROGRESS=0.3, BLOCKED=0.15, TODO=0`; a
  requirement with no tasks is 0 unless manually marked DONE by mentor/admin.
- `project.overall_percent = Σ contributions`. GitHub activity is **evidence, never proof** — commits
  do not move progress directly.
- Progress dimensions returned by `GET /api/projects/:id/progress`: `overall, requirements,
  development, testing, documentation, deployment` (dimension weights are per-project config stored
  on the project row, defaulting to requirement-driven for overall and task-type based for others).

### GitHub ↔ Project mapping (Phase 22)
`repositories` stores the **GitHub repository ID** (stable external identifier), owner, name, URL,
default branch, installation id, sync status. `project_repositories` maps project ↔ repository
(a project may have several). Never keyed by name.

## 3. GitHub App integration (new, server-only)

- Files: `backend/services/github/` — `app.js` (JWT as App, installation token cache), `repositories.js`,
  `issues.js`, `pullRequests.js`, `activity.js`, `index.js` (facade + webhook signature verify).
- Env (server only, never frontend, never committed): `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`,
  `GITHUB_PRIVATE_KEY` (PEM, literal or base64), `GITHUB_WEBHOOK_SECRET`.
- Capabilities used: repo metadata/contents/issues/PRs read+write, statuses, checks, actions,
  deployments read; org members read, projects read/write (per the App's configured permissions).
- Node 18+ global `fetch` is used — **no new runtime dependency** was added.

### Webhooks (Phase 2)
- Public endpoint: `POST /webhooks/github` (works on `https://learn.1percent.rw/webhooks/github`).
- HMAC-SHA256 over the **raw request body** (`X-Hub-Signature-256`); invalid signatures → 401 and a
  security event. Mounted before the global `express.json()` parser (see §1 middleware order).
- Idempotency: delivery id (`X-GitHub-Delivery`) stored in `github_webhook_events` with processing
  status; duplicate deliveries are acknowledged (200) but not reprocessed.
- Events handled: `push, pull_request, pull_request_review, issues, issue_comment, check_run,
  workflow_run, deployment, deployment_status, installation, installation_repositories,
  repository (created/renamed/archived)` — normalized by the **activity engine**
  (`backend/services/projectService/activity.js`) into `project_activities` rows
  (COMMIT_PUSHED, PR_OPENED, PR_MERGED, REVIEW_SUBMITTED, ISSUE_OPENED, TEST_PASSED,
  DEPLOYMENT_COMPLETED, …) linked to the project through `project_repositories`.

## 4. API surface (new — follows existing conventions)

All routes are mounted in `backend/index.js` **before** `courseRoutes` (the `/api/:slug` catcher) and
protected server-side by `authenticate` + `requireRole` + row-level ownership checks.

| Area | Endpoints |
|---|---|
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `GET /api/projects/:id/progress`, `…/tasks`, `…/requirements`, `…/milestones`, `…/activity`, `…/repositories`, `…/team`, `…/documents`, `…/feedback` |
| Tasks | `GET/POST /api/tasks`, `GET/PUT /api/tasks/:id`, `POST /api/tasks/:id/transition` (Start/Pause/Submit/Ready-for-review with permission + evidence rules) |
| GitHub | `GET /api/github/repositories`, `POST /api/github/repositories/:id/connect`, `GET /api/github/activity`, `GET /api/github/health` |
| Business | `POST /api/business/auth/signup`, `GET/PUT /api/business/profile`, `GET /api/business/projects`, `POST /api/business/projects/request`, `GET /api/business/projects/:id` (delivery-safe view) |
| Student | `GET /api/student/dev-workspace` (current project, tasks, 14-day activity, progress), `GET /api/student/activity/14d` |
| Mentor | `GET /api/mentor/projects`, `GET /api/mentor/projects/:id`, `POST /api/mentor/tasks`, `PUT /api/mentor/tasks/:id`, `POST /api/mentor/tasks/:id/review`, `POST /api/mentor/requirements/:id/status`, `POST /api/mentor/milestones/:id/complete`, `POST /api/mentor/tasks/:id/block` |
| Admin | `GET /api/admin/projects/overview`, full project/team/repo/requirement management under `/api/admin/projects/...`, webhook health |
| Webhooks | `POST /webhooks/github` |

RBAC enforcement is **server-side everywhere**:
- Student: only tasks assigned to them; only projects of their teams; cannot mark requirements DONE.
- Mentor: only students/teams/projects assigned to them (`mentor_assignments` + `team_members`).
- Business: only their own company's projects; never sees private student info, internal notes,
  evaluations, other companies' projects.
- Admin: full management access.

## 5. MCP extension (new tools, same auth model)

`backend/mcp/projectCore.js` — mounted at `/mcp/projects/:token?` **before** the admin catch-all.
Token type `project` in `student_mcp_tokens`, scope-limited, owner-scoped queries only:
- `my_project_context` — current project, milestone, highest-priority assigned task, requirement,
  repository (answers "what am I supposed to build next?")
- `my_project_tasks`, `my_project_activity`, `my_project_progress`, `my_project_requirements`

## 6. Frontend (new pages / upgrades)

- `/projects/:id` → `frontend/project.html` (Overview, Tasks, Activity, Commits, PRs, Team,
  Milestones, Requirements, Documentation, Deployments tabs; responsive 12-col grid, max-width 1440px)
- `/business/signup` → `frontend/business-signup.html`; `/business` → `frontend/business.html`
  (dashboard); `/business/projects/request` → `frontend/business-request.html`
- `dashboard.html` upgraded with a **Developer Workspace** section: profile/role strip, current project
  card, progress, current tasks, GitHub-style 14-day activity heatmap (`frontend/js/dev-activity.js`),
  team info. Learning content untouched.
- `admin.html` gains a Projects panel (counts, statuses, requests, webhook health) wired to the admin
  APIs — existing admin functionality untouched.
- Design states (loading/empty/error/unauthorized) implemented for every new component; no fake data.

## 7. Database changes (migration `migrations/add_project_system.sql`)

New tables: `companies, projects, project_requirements, project_milestones, project_tasks, teams,
team_members, repositories, project_repositories, project_activities, pull_requests, reviews,
deployments, project_documents, project_feedback, project_requests, github_webhook_events`.

Changed: `profiles.role` CHECK widened to include `business` (DO-block finds the existing constraint).
Existing tables/columns are **never dropped or rewritten**; the migration is idempotent.

## 8. Security notes

- GitHub App private key / webhook secret / Supabase service key / JWT secret: server env only.
  The webhook route verifies HMAC over the raw body before any parsing; duplicates are dropped;
  secret material never enters logs (`logService` masks IPs/emails, webhook logging stores event
  type + delivery id + repository, never headers).
- New tables: RLS enabled; browser-visible reads go through backend endpoints that scope queries by
  `req.user.id` (service-role) — same pattern as the mentor/robotics services.
- `github_webhook_events` doubles as the replay/audit log (payload trimmed, secret-free).

## 9. Known limitations / remaining work

- Progress dimensions other than `requirements` are heuristic (task-type based) until mentors set
  dimension weights explicitly per project.
- Business file attachments for project requests accept URLs only (no new storage bucket was created
  in this migration to avoid touching Storage config).
- The GitHub App must be installed on the org/repositories by an org admin before repos can be
  connected; `GET /api/github/health` reports installation status.
- Tests run offline (no network in this environment): webhook signature/idempotency, progress math,
  RBAC scoping logic, activity normalization are covered by unit tests that stub the GitHub fetch layer.
