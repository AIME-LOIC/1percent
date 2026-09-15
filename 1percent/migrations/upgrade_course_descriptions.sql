-- ============================================================
-- COURSE DESCRIPTION UPGRADE — professional, outcome-led copy
-- ============================================================
-- Rewrites the short marketing blurbs on each course card into
-- professional descriptions grounded in what the course actually
-- teaches and what expert practitioners do (mirrors the Expert
-- Layer content in upgrade_course_expertise.sql).
--
-- RE-RUNNABLE: every statement is an UPDATE keyed by slug.
-- Run in the Supabase SQL Editor.
-- ============================================================

UPDATE public.courses SET description =
  'Write code that teams can live with. This course builds the habits professionals actually use: naming things from the caller''s perspective, functions that do exactly one thing, designing failure modes before success paths, and enforcing invariants so whole classes of bugs disappear. You will practise the measure-don''t-guess discipline (profile before optimising), learn when duplication beats premature abstraction, and finish able to read, change, and delete code confidently — the skills that make seniors say "keep this one".'
WHERE slug = 'programming-fundamentals';

UPDATE public.courses SET description =
  'Version control as a story for the next reader, not a backup. Go beyond memorised commands to the object model underneath: why almost nothing is ever truly lost (reflog), how bisect turns "it broke sometime in the last 300 commits" into a 9-step hunt, and how professionals shape history before sharing but never after. You will write commit messages that become changelogs, resolve conflicts as conversations rather than coin flips, and practise trunk-based development with small, reviewable, single-purpose PRs.'
WHERE slug = 'git-github';

UPDATE public.courses SET description =
  'The terminal as a programmable toolkit, not a slower file explorer. Compose small commands into pipelines that answer real questions in seconds, snapshot a server''s health in 30 seconds before touching anything, and harden SSH the way production demands. You will build the professional safety reflexes — dry-run before you destroy, narrowest-access permissions, runbooks instead of memory — and automate anything you have done twice into scripts that fail loudly instead of silently.'
WHERE slug = 'command-line-linux';

UPDATE public.courses SET description =
  'Build APIs for the world as it is: every input hostile until validated, every request a possible duplicate, every dependency eventually failing. This course teaches the professional backend stack — thin controllers, business logic in services, structured JSON logs with request IDs — plus the patterns that separate production from tutorials: idempotency keys on payments, timeouts and jittered backoff on outbound calls, object-level authorisation on every request, and OpenAPI contracts designed before code. Grounded in the OWASP Top 10:2025 and Stripe-grade API practice.'
WHERE slug = 'backend-development';

UPDATE public.courses SET description =
  'Optimise what users feel, not what demos show. Build the loading, empty, error, and offline states before the happy path; derive state instead of duplicating it; and put anything shareable in the URL. You will ship the performance wins that actually move users — explicit image dimensions (no layout jump), virtualised lists, optimistic updates — and pass the accessibility baseline pros treat as law: semantic HTML first, keyboard-navigable everything, focus restored on close. Measured with Lighthouse and real-user metrics, not vibes.'
WHERE slug = 'frontend-development';

UPDATE public.courses SET description =
  'The database as the most optimised software on your server, not a dumb box your ORM talks to. Learn the professional measurement loop — pg_stat_statements to find the worst query, EXPLAIN (ANALYZE, BUFFERS) to see the real plan, fix, re-measure — and encode truth as constraints so impossible states are unrepresentable. Design composite indexes for actual WHERE + ORDER BY pairs, paginate with keyset instead of OFFSET, move money as NUMERIC or integer cents, and ship schema changes as reviewed, reversible migrations using the expand-migrate-contract pattern.'
WHERE slug = 'databases';

UPDATE public.courses SET description =
  'Security as a property of defaults, not a feature you bolt on before launch. Hash passwords with argon2/bcrypt, put sessions in HttpOnly SameSite cookies, check authorisation on the object level for every request, and rate-limit by account and IP separately. You will threat-model features before building them, handle the incidents that matter — the "I didn''t change my password" report, the critical CVE in a transitive dependency — and design account recovery as carefully as login. Aligned to the OWASP Top 10:2025, where Broken Access Control is still #1.'
WHERE slug = 'auth-security';

UPDATE public.courses SET description =
  'Design from requirements and numbers, not from buzzwords. Start every system with the back-of-envelope that reframes the problem (100k reads/day is 1.2/second average — is this even a scaling problem?), ship the boring architecture first, and buy complexity only when a measured bottleneck demands it. You will practise the professional trade-off habit — naming what each choice costs — and build the patterns that carry real products: caching with TTLs, queues between the bursty and the slow, idempotent consumers, graceful degradation, and runbooks written before the failure.'
WHERE slug = 'system-design';

UPDATE public.courses SET description =
  'Tests as a thinking tool and debugging as science. Write the failing test first, make it pass with the simplest code, and refactor with a safety net — and when a bug arrives from the outside world, reproduce it before theorising, then keep the failing test forever as a tombstone for that bug class. You will build suite trust that lasts: quarantine flaky tests the same day, mock the network not your own code, and test boundaries (0, 1, empty, max, weird Unicode) on instinct. Includes the discipline that saves incidents: mitigate first, diagnose second.'
WHERE slug = 'testing-debugging';

UPDATE public.courses SET description =
  'DevOps is shortening the loop between "I changed something" and "I know it works in production" — with small, frequent, reversible changes. Build immutable images tagged by commit SHA (never "latest"), ship with canaries and instant rollbacks, and monitor what users feel: latency percentiles and error rates, not CPU wallpaper. You will write multi-stage Dockerfiles, deploy with zero-downtime grace, rehearse rollbacks until they take minutes, and run blameless postmortems that turn every incident into a systems fix instead of a person to blame.'
WHERE slug = 'devops-basics';

UPDATE public.courses SET description =
  'Get leverage from AI without surrendering ownership. Treat models like talented junior teammates: spec first, prompt with real context (files, errors, failing tests), then review every diff like it came from a stranger. You will build the verification habits that catch plausible-and-wrong code — tests after every change, unfamiliar APIs checked against docs, AI-suggested dependencies audited like supply-chain attacks — and learn where AI is weak: novel architecture, security-critical code, and anything where a subtle bug is expensive. The judgement stays yours; that is precisely what you are hired for.'
WHERE slug = 'ai-coding-tools';

UPDATE public.courses SET description =
  'Finish — because finishing is the skill being tested. Scope by completion rather than ambition: one core loop built end-to-end and deployed on day one beats nine half-built features. You will demo weekly to force integration, deploy from the first commit so "deployment week" never exists, write the README while decisions are fresh, and keep a decision log that becomes your interview prep. Cut features, never quality; manage risk with containment (alerts, runbooks, rollbacks) instead of all-nighters; and ship a portfolio piece with stories — scope, obstacle, resolution — that interviewers remember.'
WHERE slug = 'capstone-project';

UPDATE public.courses SET description =
  'Read code like a detective, not a novel. Navigate unfamiliar codebases by execution path instead of scrolling, use git history as the primary source (every weird line has a story — find it before "fixing" it), and read a module''s tests first: they are executable documentation of intent. You will characterise untested code before changing it, keep refactors and behaviour changes in separate PRs, follow the Boy Scout rule with discipline, and make your first open-source contribution — the full cycle from issue to merged PR.'
WHERE slug = 'reading-codebases';

UPDATE public.courses SET description =
  'Write to move a specific reader to a specific action. Lead with the bottom line (BLUF), match depth to audience — the same change becomes a changelog line, a design doc, and an exec paragraph — and price trade-offs as options instead of saying "no". You will write PR descriptions reviewers thank you for, READMEs whose quickstart survives copy-paste into a clean VM, and incident updates that are themselves part of the fix: what happened, what is affected, what we are doing, next update at a promised time. Includes ADRs and RFC culture for async decision-making.'
WHERE slug = 'technical-communication';

UPDATE public.courses SET description =
  'Triage before you grind. Separate deadline from importance, get the Must-list agreed in writing (half of deadline crises are scope disputes in disguise), and reach for the professional levers in order: cut scope, buy time, add resources last — because adding people to a late project makes it later. You will timebox risky bets with a pre-agreed plan B, announce slips the day you know them (early bad news is a plan; late bad news is an apology), and learn the 45-minute rule for being stuck: timebox, then ask a precise question, switch approach, or change the problem.'
WHERE slug = 'problem-solving';

UPDATE public.courses SET description =
  'Write Python that reads like Python: comprehensions where clarity survives, stdlib first (Counter, itertools, pathlib), and virtual environments from minute one — because reproducibility is a deliverable, not a courtesy. You will learn the environment discipline that ends "works on my machine": pinned requirements, python -m pip inside venvs, READMEs verified from a clean install. Master the habits that compound daily: f-string debugging, tracebacks read bottom-up and fully, timeit before optimising, and scripts structured importable-and-runnable from day one.'
WHERE slug = 'python-foundations';

UPDATE public.courses SET description =
  'Technology as a routine, not a toy collection. Run your business on one source of truth updated daily — every sale, expense, and stock movement — and build the reflexes that protect it: every payment verified in the official app (never by SMS alone), the 3-question protocol that kills refund scams, and photographs that end delivery disputes in seconds. You will reconcile weekly, price from margin data instead of fear, answer "how did you find us?" until your marketing is evidence-based, and know your profit by the 5th of every month.'
WHERE slug = 'tech-in-business';

UPDATE public.courses SET description =
  'Respect the two invisible forces: power and time. Wire separate supplies with a common ground, add capacitors where motors kick, and never power them from the Arduino 5V pin — then make your code worthy of the electronics: millis() state machines instead of delay(), medians instead of single readings, watchdogs for recovery, calibration as named constants re-measured on the day. You will debug by signal (state-tracing LEDs, Serial logs with markers) and finish robots that survive contact with the floor, not just the desk.'
WHERE slug = 'robotics';
