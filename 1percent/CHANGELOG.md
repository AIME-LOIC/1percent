# Changelog

All notable changes to the 1% Expert Programme platform.
Format: `## [version] — date`. The **latest entry at the top is what the
in-app "What's New" banner shows** — add a new entry whenever you deploy
meaningful changes.

### Fixed
- Rich results validation: pricing page BreadcrumbList now has an `@id` anchor, so `WebPage.breadcrumb` resolves and Google no longer reports "Missing field itemListElement". All 9 public pages' JSON-LD audited — dangling `#website` node references anchored by adding the shared `WebSite` node to each graph.
- **"Connect to Claude" auto-registration**: implemented RFC 7591 Dynamic Client Registration (`POST /mcp/oauth/register`) and advertised `registration_endpoint` in both `/.well-known/oauth-authorization-server` documents, so claude.ai no longer shows "Automatic client registration isn't supported — add an OAuth Client ID". Registered clients get exact-match redirect_uri enforcement at authorize; unknown client_ids fail closed. Also fixed the PKCE S256 verifier comparison (it hashed to hex instead of base64url, so every token exchange would have failed with `invalid_grant`). Run `migrations/add_mcp_oauth_clients.sql` in Supabase.
- **Disconnect button didn't revoke legacy paste tokens**: the Settings revoke handler only fell back to the token DELETE when the OAuth revoke returned 404 — which never happens (the route exists), so students connected via a legacy `sk-mcp-` token stayed connected with a stuck Revoke button. It now revokes both the OAuth connection and the paste token in parallel, treats one-sided failures as success, and surfaces a real error only when both fail.

### Added
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
