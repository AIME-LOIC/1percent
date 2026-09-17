# Changelog

All notable changes to the 1% Expert Programme platform.
Format: `## [version] — date`. The **latest entry at the top is what the
in-app "What's New" banner shows** — add a new entry whenever you deploy
meaningful changes.

### Fixed
- **"Connect to Claude" now recognizes admin accounts**: the OAuth flow grants a server-side `admin` scope when the account approving consent has `profiles.role = 'admin'` (role is checked at approval AND at token issue; the consent page shows an explicit admin-access disclosure via `GET /mcp/oauth/me`). Admin tokens can call the full platform toolset — create/update/delete courses, lessons, challenges, and `platform_stats` — through the same `/mcp/student` connector, while students remain read-only no matter what their client requests. Role re-verification means a demoted admin's next token is student-only.
- Rich results validation: pricing page BreadcrumbList now has an `@id` anchor, so `WebPage.breadcrumb` resolves and Google no longer reports "Missing field itemListElement". All 9 public pages' JSON-LD audited — dangling `#website` node references anchored by adding the shared `WebSite` node to each graph.
- **"Connect to Claude" auto-registration**: implemented RFC 7591 Dynamic Client Registration (`POST /mcp/oauth/register`) and advertised `registration_endpoint` in both `/.well-known/oauth-authorization-server` documents, so claude.ai no longer shows "Automatic client registration isn't supported — add an OAuth Client ID". Registered clients get exact-match redirect_uri enforcement at authorize; unknown client_ids fail closed. Also fixed the PKCE S256 verifier comparison (it hashed to hex instead of base64url, so every token exchange would have failed with `invalid_grant`). Run `migrations/add_mcp_oauth_clients.sql` in Supabase.
- **Disconnect button didn't revoke legacy paste tokens**: the Settings revoke handler only fell back to the token DELETE when the OAuth revoke returned 404 — which never happens (the route exists), so students connected via a legacy `sk-mcp-` token stayed connected with a stuck Revoke button. It now revokes both the OAuth connection and the paste token in parallel, treats one-sided failures as success, and surfaces a real error only when both fail.
- **Consent page stuck on "Checking your sign-in…"**: the consent page is generated from a JS template literal, and a single-quoted `you\'ll` in the login hint collapsed to a bare apostrophe in the served HTML — `Uncaught SyntaxError: Unexpected identifier 'll'` killed the whole init script. Escape doubled; regression test now renders the page and parses the inline script the browser receives.
- **"Connect to Claude" approval silently discarded**: after approving on the consent page, users returned to `/settings?claude=connected&code=…` but nothing exchanged the code — the PKCE verifier sat unused in sessionStorage and the connection row was never created, so the status pill stayed "Not connected". Settings now completes the same-origin connect by exchanging the code at `/mcp/oauth/token` (URL cleaned first so a refresh can't re-submit the single-use code).
- **Grader wrongly rejected real solutions that print a required banner**: the anti-echo guard rejected ANY verbatim appearance of the expected output in the code, so a genuine polling-app implementation that also printed its required `// Polling app` header was flagged as a cheat — and output-graded challenges had no other judging path, making them unpassable. The guard is now line-aware: it rejects pure echo (expected lines ≥70% of output echoed with no real logic), but allows a single echoed banner line when the rest of the code is a real implementation, and still hard-rejects multi-line echoes. Regression tests cover the exact rejected submission shape and all cheat patterns.

### Added
- **Lesson Quick Quiz (fast-track completion)**: every unfinished lesson now shows a ⚡ Quick Quiz button next to Mark Complete — passing a short per-lesson quiz (4–6 questions from the course bank, ≥80% to pass, unlimited retries, server-side grading) completes the lesson instantly instead of waiting out the 10-minute study timer. A pass waives the study gate for 30 days (`migrations/add_lesson_quiz_passes.sql`).
- **Quiz questions for every lesson**: `node generate_lesson_quizzes.js` fetches all published lessons and emits `migrations/generate_lesson_quizzes.sql` — 3 deterministic, content-grounded multiple-choice questions per lesson (proper-noun + frequency concept extraction from `lessons.content_md`), linked via `quiz_questions.lesson_id`, plus a published course quiz where missing. Idempotent and re-runnable; hand-authored questions are never touched (skip unless `--force`). Alternatives: `--dry-run` previews, `--apply` writes directly. Run the generator once Supabase API keys are valid (legacy keys currently disabled in the dashboard — same prerequisite as `fix_challenge_hints.js --apply`).
- **Challenge-specific hints**: every active challenge's generic filler hints ("re-read the task…") are replaced by 3 progressive hints generated from the challenge's own data — core concept nudge, technique + concrete objects (element ids, table/column names, function names), and a type-aware next action for python/js-DOM/sql/git/docker/html/css challenges. Hand-authored hints are preserved. Run `node fix_challenge_hints.js` (emits `migrations/fix_challenge_hints.sql`) or `--apply` once API keys are valid.

## [1.5.0] — 2026-09-15

### Added
- **Expert Layer** on every lesson of all 18 published courses: what professional practitioners do differently, insider moves not found in tutorials, real field scenarios (beginner vs expert handling), expert confessions, a day in the life, the hiring manager's lens, first-job reality, expert-level exercises, and curated go-deeper resources.
- Course content grounded in current practitioner sources: OWASP Top 10:2025, NIST SP 800-63B, Google SRE/DORA, State of JS 2025, pg_stat_statements workflows, Diátaxis docs framework, and East African mobile-money fraud patterns for Tech in Business.
- Re-runnable migration `migrations/upgrade_course_expertise.sql` (appends without touching existing lesson content) generated from editable sources in `courses/expert-upgrades/`.

## [1.4.0] — 2026-09-15

### Fixed
- Course page: content no longer hides behind the top navigation bar.
- Quiz button text is now readable on Pro/Pro+ (gold) themes, including disabled states.
- Leaderboard now shows green ▲ / red ▼ arrows for rank movement vs yesterday.
- Quiz integrity: tab-switch detection, attempt limits with 24h cooldown, and a countdown timer.
- Login flow: email confirmation gate, magic-link sign-in, and a working Student Login button.

### Added
- "Download Full Course" button on the course page (PDF).
- Mentor Hub at /mentors with learner progress and weekly shares.

## [1.3.0] — 2026-09-12

### Fixed
- Grading engine: trivial/echo submissions no longer pass; SQL challenges are graded semantically.
- Playground: removed duplicate scrollbars.

### Added
- MCP: "Connect to Claude" from Settings with PKCE.
