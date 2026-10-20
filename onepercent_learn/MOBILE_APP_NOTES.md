# 1percent Learn - Flutter mobile client

Wireframe of learn.1percent.rw for Android first (iOS later). A Flutter
(null-safe) client reusing the EXISTING 1% backend at
`https://learn.1percent.rw/api` - no endpoints were invented; see the missing
list at the bottom.

## Run

```bash
cd ~/1percent/onepercent_learn
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # drift codegen (already generated)
flutter run --dart-define=API_BASE=https://learn.1percent.rw/api
```

Release Android build:

```bash
flutter build apk --release --dart-define=API_BASE=https://learn.1percent.rw/api
# output: build/app/outputs/flutter-apk/app-release.apk
```

On this machine (JDK 25 only) set `org.gradle.java.home` to a JDK 17-21
install in `android/gradle.properties`, or run with `JAVA_HOME` pointed at
JDK 17 - the Kotlin Gradle plugin crashes parsing "25.0.3" (KT-83610).

## Stack

Riverpod (flutter_riverpod 3) - state - go_router - navigation,
dio - HTTP, flutter_secure_storage - tokens, drift + sqlite3 - offline
database, google_fonts (Space Grotesk + JetBrains Mono), flutter_markdown +
a built-in dependency-free syntax highlighter, connectivity_plus.

Theme: white background, #F1F9ED surfaces, #DCEBD6 borders, primary buttons
#8FDB7E on ink text #12261A, accents #2E7D32, progress #5CB85C, muted
#5B6E60. 16px cards, 48px buttons, >= 44px touch targets. Labels are 11px
JetBrains Mono uppercase letterspaced; numbers are mono. NO emoji. The Code
screen stays dark: #0B0D0C background, #151917 surface, lime #C6F432.

Navigation: HOME / LEARN / CODE / ME bottom bar with text labels (active =
green text + 2px green top line). Auth, Lesson, Course detail and
Notifications are fullscreen.

## API usage (endpoints that already exist)

- `POST /api/auth/login` -> `{user, session:{access_token, refresh_token}}`
  - tokens kept in flutter_secure_storage; `POST /api/auth/refresh`
    singles-flight on 401 and retries the request once.
- `POST /api/auth/signup`, `POST /api/auth/reset-password`,
  `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/profile`.
- `GET /api/courses`, `GET /api/courses/:slug` (lessons metadata),
  `POST /api/courses/:courseId/enroll` (called silently when you open
  progress/download), `GET /api/courses/:courseId/progress`,
  `GET /api/courses/lessons/:lessonId/content` (`content_md`),
  `GET/POST /api/courses/progress/:lessonId/quick-quiz`
  (answers format `{ [questionId]: optionId }`),
  `POST /api/courses/progress/:lessonId/complete`
  (409 previous-incomplete, 422 STUDY_TIME_REQUIRED handled, both surfaced
  with the remaining-minutes message).
- `GET /api/coins/balance`, `GET /api/coins/challenges/daily`,
  `POST /api/coins/challenges/:challengeId/submit {code, is_daily}`
  (PASS result, coins, reject reason).
- `GET /api/streak`, `GET /api/streak/history?days=7` (7-day bars).
- `GET /api/notifications`, `PUT /api/notifications/:id/read`,
  `PUT /api/notifications/read-all`.
- `GET /api/certificates/mine` (Profile > certificates with number).

## Offline design (no PDFs)

On "Download for offline": each lesson's markdown (`content_md`) AND its
quick quiz JSON are fetched and stored in the drift/sqlite3 DB
(`onepercent_learn`). Reads go local DB first, then network. Quick quizzes
run offline and, because grading is server-side with hidden answers,
answers + the completion are written to a `pending_ops` queue and replayed
by `syncPending()` when connectivity returns (also fired automatically by
the connectivity watcher, and from splash). "Manage" in Profile lists
downloaded courses (with MB used from the stored content sizes) and lets
you delete a course's downloads. Download progress + per-lesson failures
are surfaced on the Course detail card.

## What to test on a real phone (airplane mode)

1. Open the app online, open a course, tap "Download for offline".
   Watch the progress bar; then switch ON airplane mode.
2. Lessons of the downloaded course must still open instantly (content from
   the local DB) and the lesson shows the SAVED chip.
3. Take a quick quiz offline: choose answers, finish - the sheet shows the
   QUEUED state ("verified when online"). Reconnect: the op syncs, the
   lesson is completed server-side and coins arrive.
4. Mark a lesson complete offline: it is queued; snake the connection and
   allow 422 STUDY_TIME_REQUIRED to resolve itself on replay (server keeps
   its gate; the op is retried up to you passing the quiz or waiting out) - check the
   rejected op shows in the home banner note.
5. Kill the connection mid-download: failures are listed on the download
   card; press Retry once back online.
6. Sign out, sign back in - tokens round-trip through secure storage and
   refresh path (log in with expired access token to watch the 401
   single-flight refresh work; check in logs).
7. Pull-to-refresh on Home and Learn then airplane mode: skeletons turn
   into error states with a "Try again" button.

## Missing backend endpoints / fields (do NOT exist today)

1. Google sign-in for native clients: `GET /api/auth/callback` is a
   browser-redirect flow; the app needs `POST /api/auth/google/start`
   returning an authorize URL + deep-link callback handle (or Google
   ID-token sign-in endpoint).
2. Lesson/criteria-less ask for the per-course quiz answer key for offline
   grading: without answers the app can only queue offline quiz grading.
   `GET /api/courses/progress/:lessonId/quick-quiz` hides `correct_answer` -
   an offline-gradingsigned endpoint (or a per-user signed "answer key"
   bundle on download) is needed for instant offline verification.
   (Current behavior: queue and verify later.)
3. Course category: the `courses` table has no category column, so the
   DSA/Web filter chips match on title/slug/description keywords. A
   `category` (or `tags`) column on `courses` would make the filters exact.
4. Lesson count on `GET /api/courses`: the list endpoint does not include
   lesson totals (only detail). Cards show level only, or every card would
   need a per-course lessons query (bunchy). Add `lesson_count` to the
   list response.
5. XP / level: there is no XP endpoint; Level shown in Profile is derived
   locally (1 level per 5 lessons) as a placeholder.
6. Badges: no badges endpoint; Profile shows derived lesson milestones.
7. Per-test-case results for challenges: the grader returns
   `{passed, coins, total, reason}` - the Code screen renders one PASS/WAIT
   row plus the reject reason. A `test_results[]` array in the submit
   response would let the Code screen show PASS/FAIL per test.
8. Offline storage quota endpoint: MB used is computed from the local
   content sizes; fine for now.
