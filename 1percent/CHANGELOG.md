# Changelog

All notable changes to the 1% Expert Programme platform.
Format: `## [version] — date`. The **latest entry at the top is what the
in-app "What's New" banner shows** — add a new entry whenever you deploy
meaningful changes.

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
