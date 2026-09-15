# Changelog

All notable changes to the 1% Expert Programme platform.
Format: `## [version] — date`. The **latest entry at the top is what the
in-app "What's New" banner shows** — add a new entry whenever you deploy
meaningful changes.

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
