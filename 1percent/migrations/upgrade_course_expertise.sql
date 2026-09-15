-- ============================================================
-- EXPERT LAYER UPGRADE — auto-generated; do not edit by hand.
-- Source: courses/expert-upgrades/*.js
-- Generate: node courses/expert-upgrades/generate-expert-sql.js
-- Generated at: 2026-09-15T12:38:21.079Z
--
-- Appends "The Expert Layer" to every published lesson of the
-- courses below: what professionals do differently, how they
-- actually work, insider moves, field scenarios, expert mistakes,
-- a day in the life, the hiring-manager's lens, first-job reality,
-- expert exercises, and go-deeper resources.
--
-- RE-RUNNABLE: an existing expert layer is replaced, not duplicated.
-- Existing lesson content is never modified, only appended to.
-- Run in the Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- Course: ai-coding-tools  (source: ai-coding-tools.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_ai_coding_tools$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners prompt AI like a vending machine ("write me a login page") and accept whatever comes back. Experts treat AI like a **talented junior teammate**: astonishingly fast, needs clear specs, must be reviewed, and never gets the final word on architecture. The professional loop is: write the spec (or let AI draft it and *you* edit it), let the AI implement, then **review the diff like it came from a stranger** — because the failure mode is never "the code is bad", it is "the code is plausible and subtly wrong". The second expert discipline: context is everything. A prompt with the relevant file, the error message, the test that fails, and the constraint you care about produces 10x better output than a one-liner prompt, no matter which model you use.

### How Professionals Actually Work

They keep AI on a short leash with verification at every step: small tasks, tests after every change, a `git diff` read before any commit, and hard stops when the model starts hallucinating APIs (the tell: confidently inventing a method that does not exist — experts verify unfamiliar APIs against docs, always). They also know where AI is *weak*: novel architecture, security-critical auth code, and anything where the cost of a subtle bug is high. There, AI is the reviewer and rubber duck, and the human writes the code. And they invest in their context assets: a good CLAUDE.md/AGENTS.md-style project file (conventions, commands, gotchas) pays off on every single interaction.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Spec-first prompting | Describe behaviour, constraints, and tests *before* asking for code | The model implements your intent instead of guessing it |
| AGENTS.md / project rules file | A repo file (AGENTS.md) with conventions, commands, and pitfalls read by AI tools | Every AI session inherits your standards automatically |
| Small-diff workflow | One task per AI session; review and test between each | Reviews stay possible; errors get caught at birth, not harvest |
| Test-first with AI | You write the failing test; AI makes it pass | Tests define "done" objectively — hallucinations cannot pass a real test suite |
| Docs-in-the-loop | Verifying unfamiliar APIs against official docs before use | The #1 expert filter for plausible-but-invented code |

### Insider Moves You Won't Find in Tutorials

1. Paste the *failing test output* before pasting code. Error messages contain the model's best leverage; vague vibes in, vague code out.
2. Ask for options, not answers: "give me three approaches with trade-offs" — then you choose. This keeps architectural judgement yours and turns AI into a design partner.
3. Never let AI commit directly to main. Expert rule: AI writes the branch, you review the diff, CI runs the suite — the same trust chain as any junior hire, and for the same reasons.
4. When the model is stuck in a loop, start a fresh session with a clean summary instead of arguing with it. Context rot is real; a new session with the *right* three files beats a 50-message thread.
5. Ask AI to critique its own output: "what edge cases does this miss? what would a senior reviewer flag?" The self-review pass catches a shocking share of bugs for free.
6. Audit AI-suggested dependencies like supply-chain attacks: that npm package it confidently imported may be real, abandoned, or a typo-squat. `npm view` before you `install`.

### Field Scenarios: How Experts Handle Real Situations

**AI generated 200 lines that pass all tests on the first try.**

- *What a beginner does:* Merges it — tests pass, ship it.
- *What an expert does:* Reads all 200 lines anyway and asks: is the error handling real or performative? Are there invented APIs? Is the code *understandable* to the team? Then checks the tests: do they test behaviour, or do they test the implementation the model happened to choose?
- *Why it matters:* Plausible-and-wrong is the expensive failure mode; tests can pass while the edge cases burn.

**A refactor "works" but the diff is 40 files.**

- *What a beginner does:* Accepts it — the model said it is done.
- *What an expert does:* Splits it: one mechanical rename PR (reviewable, safe), one logic PR (small, tested). Or rejects and re-prompts with tighter scope. A diff no human can review is a diff nobody vouches for.
- *Why it matters:* Unreviewable code is how teams quietly lose ownership of their own codebase.

**The model keeps forgetting the project convention (your error format, your folder layout).**

- *What a beginner does:* Repeats the convention in every prompt, gets annoyed.
- *What an expert does:* Writes it once in the project rules file (AGENTS.md / system prompt / saved snippet) with a tiny example. The convention stops being a prompt and becomes infrastructure.
- *Why it matters:* Context you repeat is a process bug; context you persist is a system.


### Expert Confessions: Mistakes Even Pros Make

- Letting skills atrophy: accepting every suggestion without asking "would I have written this, and do I *understand* it?" Experts use AI to skip typing, never to skip understanding — in the interview, the code you cannot explain is code you did not write.
- Prompting security-sensitive code (auth, payments, crypto) and shipping it. AI reproduces training-data averages; attackers read the *tails*. Human-written, human-reviewed, or both.
- Vibe-debugging: pasting errors until something compiles. It works eventually and teaches nothing; the fix that lands may be cargo-cult, and the next bug will be worse.
- Assuming newer model = correct model. Model quality changes nothing about the review step; experts' trust is a function of tests and diff-reading, not of model version.

### A Day in the Life

An engineer starts with a feature ticket. They write a 6-line spec in the issue (behaviour, edge cases, done-when), then ask the AI tool to draft an implementation plan — they edit two points (the model missed the rate limit and the offline case). Implementation happens in three small sessions: session one generates the service function against a failing test; they run the suite (green), read the diff line by line, and catch an invented `retryWithBackoff` helper that does not exist in their utils — replaced with the real one after checking docs. Session two does the endpoint; session three the UI. Between each, a commit with a human-reviewed diff. In the afternoon they flip roles: AI implements a boring CRUD screen while they review, and they spend saved energy on the hard part — deciding the API shape. Before leaving, they update AGENTS.md with the convention the model kept missing: "all money in integer cents".

### The Hiring Manager's Lens

Interviews have changed: take-homes increasingly allow AI, and the differentiator is what happens around it. Interviewers ask "you used AI for this — walk me through what you reviewed and what you changed" and can smell the difference between a candidate who verified and one who pasted. New screens appear: "how do you prevent an AI tool from suggesting a malicious dependency?", "when would you *not* use AI?" (security-critical code, novel architecture, learning-critical tasks). The uncomfortable truth: juniors are now judged on judgement — because the typing is free for everyone.

### Your First Job, In Reality

Paradox of the AI era: your first job expects AI fluency *and* distrusts AI output. The winning posture: be the fastest implementer on the team *and* the person whose AI-assisted PRs get approved without re-work — because you read the diff, ran the tests, and caught the invented API. Also: the questions you can still answer without AI (why this architecture, what breaks at scale, how would you attack this) are exactly the questions interviews and promotions run on. Keep those muscles fed.

### Expert-Level Exercises

1. Take a feature you built manually. Rebuild it with AI using spec-first prompting: write the spec and failing tests first, then let the model implement. Compare quality, time, and how much of the code you actually understand.
2. Write an AGENTS.md for your repo: conventions, common commands, three gotchas, and one thing the AI must never do. Use it for a week and note every repeated correction it saves.
3. Red-team an AI output: generate a piece of code, then spend 20 minutes deliberately hunting for hallucinated APIs, wrong error handling, and edge cases. Keep a list — this is your personal review checklist now.
4. Do one full day coding without AI (or with it muted). Notice where it was genuinely faster and where you were — sharpen the boundary; that line is your career.

### Go Deeper

- Anthropic's prompting and agentic-coding guides — the clearest practitioner documentation of context engineering.
- OWASP "Software Supply Chain Failures" (Top 10:2025) — dependency vigilance applies double when AI suggests packages.
- Simon Willison's blog — the longest-running honest practitioner log of what LLMs can and cannot do in real work.
- "Software Engineering at Google" ch. on code review — the review discipline AI workflows are built on.

---

> **The 1% difference:** experts get leverage from AI without surrendering ownership: they spec before prompting, review every diff like a stranger wrote it, verify every unfamiliar API, and keep the judgement — architecture, security, taste — firmly human.
$exp_ai_coding_tools$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'ai-coding-tools'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: auth-security  (source: auth-security.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_auth_security$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners add security *features* (a login form, a token). Experts add security *properties*: the system stays safe even when a component fails, a developer errs, or a user picks "password123". That means secure defaults everywhere (HTTPS-only cookies with HttpOnly and SameSite, argon2/bcrypt password hashing, CSRF tokens on state-changing routes), authorisation checked at the object level on **every** request, and secrets that live in a manager — never in git, never in logs. They also read the OWASP Top 10 as a checklist of *what attackers actually try first*: the 2025 edition keeps Broken Access Control at #1 and adds Software Supply Chain Failures — meaning attackers increasingly come in through your dependencies, not your code.

### How Professionals Actually Work

They threat-model before building: for each feature, ask "who would abuse this, what do they want, and what is the cheapest thing I can do to make it not worth it?" Login flows follow NIST SP 800-63B in spirit: allow long passwords and passphrases, check against breached-password lists, rate-limit by account *and* IP, and give generic errors ("wrong username or password") that do not confirm which half was right. Passwords are hashed with argon2id or bcrypt — never encrypted (reversible = wrong), never MD5/SHA. Sessions default to HttpOnly SameSite cookies; JWTs are used where statelessness pays (service-to-service), with short lifetimes and refresh rotation, because "the token is signed" does not mean "the token is valid right now" — revocation and expiry still have to be designed.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| argon2id / bcrypt | Modern password-hashing functions with tunable cost | Computationally expensive by design, so stolen hashes are worthless at scale |
| HttpOnly + SameSite cookies | Session cookies unreadable by JS, not sent cross-site | XSS cannot steal the session; CSRF is structurally blunted |
| Object-level authorisation checks | owner_id checked per request (or enforced by RLS) | Kills the OWASP #1: IDOR/access-control bugs that UI hiding never does |
| Dependency scanning (npm audit, Dependabot) | Flags known-vulnerable packages automatically in CI | Defends the supply-chain layer attackers now prefer |
| Security headers | CSP, HSTS, X-Content-Type-Options, frame-ancestors | Cheap, passive mitigation for XSS, clickjacking, and downgrade attacks |

### Insider Moves You Won't Find in Tutorials

1. Authorise the object, not the route: `404` instead of `403` when a user asks for someone else's resource — do not confirm the resource exists to people who cannot see it.
2. Rate-limit login by *account* and by *IP* separately — IP limits annoy offices and universities; account limits stop credential stuffing of one poor user.
3. Rotate every secret that has ever appeared in a commit, even a "deleted" one — git history keeps it. Prevention: a pre-commit secret scanner from day one.
4. Set a strict Content-Security-Policy in report-only mode first, watch the violations, then enforce. CSP is the single highest-value XSS mitigation, and report-only is how it ships without breaking.
5. Never log tokens, passwords, or full card numbers — not even "temporarily". Log lines end up in aggregators, tickets, and screenshots; redact at the source.
6. Design account recovery as carefully as login: recovery is login. Email-based reset links expire in 15 minutes, are single-use, and invalidate old sessions on password change.

### Field Scenarios: How Experts Handle Real Situations

**A user reports: "I got an email saying my password changed, but I didn't change it."**

- *What a beginner does:* Tells them to ignore it.
- *What an expert does:* Treats it as an active takeover attempt: invalidate sessions, force reset, check the reset-token log for who requested the change, and add the breached-password check if missing. Then fix the root cause (often: no rate limit on the reset endpoint).
- *Why it matters:* Account takeover is an emergency with a paper trail; the alert email is the smoke alarm, not the fire.

**npm audit finds a critical CVE in a transitive dependency.**

- *What a beginner does:* Panic-updates everything at 6pm Friday.
- *What an expert does:* Checks the actual exploitability (is the vulnerable code path used?), updates or pins with a patch, runs the test suite, and ships in hours — with a `renovate`/Dependabot config so the next CVE arrives as a ready PR.
- *Why it matters:* Supply-chain response is a process, not a scramble; automation makes it routine.

**A junior suggests storing sessions in localStorage "because it's simpler".**

- *What a beginner does:* Agrees — any XSS now silently exfiltrates every user's session.
- *What an expert does:* Explains the trade-off aloud: localStorage is readable by any injected script; HttpOnly cookies are not. Simplicity that adds a whole attack class is not simplicity.
- *Why it matters:* Security review is a teaching moment; "simpler" defaults decide your breach history.


### Expert Confessions: Mistakes Even Pros Make

- Hand-rolling crypto or auth. "I'll write my own encryption" has ended more careers than any technical skill gap; experts compose vetted primitives and buy auth when they can.
- Security through obscurity: hiding endpoints, renaming /admin to /super-secret-panel, trusting that attackers will not read your JS bundle. They read your JS bundle.
- Skipping security headers because "we have HTTPS". HTTPS protects the pipe; CSP/HSTS/frames protect the app at both ends of it.
- Testing only the happy path in auth flows: expired tokens, reused reset links, mismatched hosts, and Unicode edge cases in emails are where real sessions leak.

### A Day in the Life

A security-minded engineer starts with the weekend report: 412 failed logins on 3 accounts from 60 IPs — a credential-stuffing run. They confirm the breached-password check caught nothing new, tighten the account-level rate limit, and add the three targeted accounts to a watchlist; total, 40 minutes, because the monitoring was already there. Mid-morning: a code review on a payments PR — they flag password confirmation missing on the "change payout account" action, and note the new webhook endpoint trusts a header they verify manually instead of verifying the signature. After lunch they open a Dependabot PR (a moderate in a JSON parser), check exploitability, and merge it with tests green. The day ends writing one paragraph in the security runbook: how the stuffing run was detected, and what the next engineer should do in the first 10 minutes.

### The Hiring Manager's Lens

Security screens are judgement tests: "You find a stored XSS in a comment field — what do you do in the first hour?" (listening for: assess blast radius, fix + sanitise at render, rotate nothing *yet*, document, then check every other render path); "JWT or sessions?" (listening for: statelessness vs revocation trade-off, not a religion); "How do you store passwords?" (argon2/bcrypt — a one-word answer that gates seniority). Candidates who mention OWASP Top 10 2025 *categories by name* and supply-chain risk signal current, real-world practice.

### Your First Job, In Reality

You will not be pen-testing in month one — you will be adding a missing authorisation check, fixing an unvalidated redirect, and writing rate-limit middleware. Those unglamorous tickets are the actual job: the OWASP list is mostly *ordinary code with one missing check*. The habit that gets you noticed: when you touch any endpoint, ask out loud "who is allowed to do this, and how do we know?" — reviewers remember engineers who make them think about the right things.

### Expert-Level Exercises

1. Attack your own app: as a normal user, try to view, edit, and delete another user's records by changing IDs in URLs and API bodies. Every 200 you get back is a P0 finding — fix with object-level checks.
2. Add rate limiting to one login endpoint (account + IP dimensions) and write a test that proves 6 rapid failures from one IP get throttled.
3. Turn on a strict CSP in report-only mode, collect a week of violation reports, then write the enforcement policy. Document what surprised you.
4. Audit your dependencies: run npm audit, triage every finding by exploitability (used path? severity? fix available?), and ship the fixes as one reviewed PR with a summary table.

### Go Deeper

- OWASP Top 10:2025 (top10.owasp.org) and the OWASP Cheat Sheet Series (cheatsheetseries.owasp.org) — the pro reference for auth, sessions, and XSS.
- NIST SP 800-63B "Digital Identity Guidelines" — why length beats complexity rules; skim the Authenticator section.
- Google SRE book + "Postmortem Culture" — incident habits that pair with security response.
- PortSwigger Web Security Academy (free) — the best hands-on labs for XSS, CSRF, and access control on the internet.

---

> **The 1% difference:** experts design for the day things go wrong: stolen hashes that are useless, XSS that cannot steal a session, a missing check that the database itself catches — security is a property of defaults, not a feature you bolt on before launch.
$exp_auth_security$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'auth-security'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: backend-development  (source: backend-development.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_backend_development$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners build endpoints and think about the happy path. Experts build endpoints where **every input is a lie until validated, every request may arrive twice, and every dependency will fail**. That triple assumption changes everything: validation at the boundary, idempotency keys on payments and POSTs, timeouts and retries with backoff on every outbound call. It is why broken access control has sat at the top of the OWASP Top 10 (the 2025 edition still ranks it #1): amateurs check "is the user logged in?", professionals check "is this user allowed to touch *this object*?" on every single request.

### How Professionals Actually Work

A professional API is designed before it is coded: the OpenAPI spec (or a README contract) defines routes, status codes, and error shapes — so frontend and backend can work in parallel and tests have a target. In the code, the controller layer stays thin (parse, validate, delegate, respond) while the business logic lives in services that know nothing about HTTP. Experts log **structured** JSON (timestamp, request id, user id, route, duration) rather than prose, so logs are queryable during an incident. And they version breaking changes (/v2/) instead of breaking clients — because someone, somewhere, is calling the endpoint you want to change.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Idempotency keys | A client-supplied key so retried requests are deduplicated server-side | The difference between one charge and five on a flaky mobile connection |
| Structured logging + request IDs | JSON logs with a request id propagated through every service | Incident diagnosis in minutes instead of hours; logs become databases |
| OpenAPI/Swagger | A machine-readable contract for the API | Generated docs, mocks, and client SDKs; frontend never blocked on backend |
| Rate limiting | Per-user/per-IP request ceilings (token bucket) | Protects the database from bugs, scrapers, and storms — cheap insurance |
| Feature flags | Shipping code disabled, enabling gradually per user/percentage | Deploys become non-events; risky changes can be turned off in seconds |

### Insider Moves You Won't Find in Tutorials

1. Return the *right* status code, always: 400 (client sent garbage), 401 (who are you?), 403 (not allowed), 404 (hide existence), 409 (conflict), 422 (valid JSON, invalid semantics). Frontends build error handling on these; mixing them up is how mobile apps "randomly" fail.
2. Never trust `Content-Length` or client-side validation — re-validate size and type server-side. The 10MB image limit that lives only in the browser is not a limit.
3. Paginate everything from day one, even "small" lists. Every API has one endpoint that grows silently until it takes down the server the day a customer with 50,000 records logs in.
4. Wrap outbound HTTP calls with a timeout *and* a retry cap *and* jittered backoff. The default "wait forever" is how one slow dependency freezes your whole service.
5. Return error responses in one consistent shape (`{error: {code, message, details}}`) — and log the details server-side, not to the client. Clients get helpful, safe messages; you get forensic detail.
6. Test one thing the docs promise but the code does not do: send a duplicate request, an expired token, a 10MB payload. Experts break their own APIs before strangers do.

### Field Scenarios: How Experts Handle Real Situations

**A customer was charged twice during a network retry.**

- *What a beginner does:* Adds a "duplicate detection" check after the fact and apologises.
- *What an expert does:* Had made the endpoint idempotent from day one — the retry with the same idempotency key returns the original result. Now they add the key to the failing endpoint and refund, with a log query showing exactly who was affected.
- *Why it matters:* Retries are not exceptional on mobile networks; they are the normal case that must be designed for.

**Users can see other tenants' data by changing an ID in the URL.**

- *What a beginner does:* Hides the field in the UI and considers it fixed.
- *What an expert does:* Treats it as P0 broken access control: authorisation checked in the service layer for every object access (`if (invoice.ownerId !== user.id) return 404`), plus an automated test per role. Then checks every other endpoint for the same class of bug.
- *Why it matters:* OWASP #1 for a reason — UI hiding is not authorisation, and attackers read APIs directly.

**The database is at 100% CPU every evening.**

- *What a beginner does:* Upsizes the database instance (more money, same problem).
- *What an expert does:* Finds the actual queries (pg_stat_statements / slow query log), adds the missing index or fixes the N+1 loop, and adds a load test so the regression cannot return unnoticed.
- *Why it matters:* Money hides symptoms; a query fix deletes the problem permanently.


### Expert Confessions: Mistakes Even Pros Make

- Storing secrets in code or config committed to git. Every leaked AWS key in a public repo is found by bots within minutes; experts use env vars/secret managers and rotate anything that ever touched a repo.
- Returning raw database errors (with table names) to clients. That is free reconnaissance for attackers; map internal errors to safe messages.
- Building "temporary" auth with plaintext or MD5 passwords "until we add hashing". bcrypt/argon2 from day one — migration later means forcing every user to reset.
- Skipping migrations discipline: editing the live schema by hand. Experts treat schema like code — versioned, reviewed, reversible, applied the same way on every environment.

### A Day in the Life

A backend engineer starts by checking overnight alerts: one 5xx spike at 02:14. With a request id from the alert, they filter structured logs and see the timeout to a payment provider — they raise that provider's timeout budget, add a retry with backoff, and leave a comment in the incident doc. Mid-morning is a new endpoint: they write the OpenAPI snippet first, get a 👍 from the frontend dev, then implement validation → service → route. After lunch, code review: they question a PR that queries the DB inside a loop, and suggest the batched version with a benchmark. Before signing off they add one more test — a duplicate POST with the same idempotency key — because they have been burned before.

### The Hiring Manager's Lens

Backend interviews probe judgement, not syntax: "Design a payment endpoint for flaky mobile networks" (listening for: idempotency, retries, timeouts), "A client sends a request for another user's data — what happens in your API?" (listening for: object-level authorisation, 404 not 403 leaks), "How do you know your API is healthy in production?" (listening for: structured logs, latency percentiles, error rates). Candidates who answer with *defaults* ("I'd add validation") score junior; candidates who answer with *mechanisms* ("Zod schema at the boundary, 422 with a stable error code") score senior.

### Your First Job, In Reality

Your first backend ticket will likely be "add a field to this response" — and the real skill is tracing where the response is built across middleware, controller, and service in a codebase you have never seen. You will break staging at least once (everyone does); what matters is that you *said so immediately* in the team channel with the deploy you suspect. The engineers trusted fastest are not the ones who never break staging — they are the ones whose breakage is visible, owned, and fixed within the hour.

### Expert-Level Exercises

1. Take any API you have built. Write a 15-line "abuse script" (curl loop) that sends malformed, duplicate, oversized, and unauthorised requests. Fix every 500 it finds.
2. Add idempotency-key handling to one write endpoint (store the key + response, return the stored response on retry). Write the test that proves a double-submit is charged once.
3. Convert console.log debugging to structured JSON logs with a request id middleware. Then answer: "how many requests took >2s in the last 24h?" with one grep/jq pipeline.
4. Write the OpenAPI spec for one existing endpoint *afterwards* and compare what the spec says to what the code does — every mismatch is a real bug or a real doc.

### Go Deeper

- OWASP Top 10:2025 (top10.owasp.org) — read the actual list, especially Broken Access Control and the new Software Supply Chain Failures category.
- "Designing Data-Intensive Applications" ch. 1-3 — reliability and data models explained by a practitioner.
- Google SRE book, "Service Level Objectives" and error budgets (free at sre.google) — how professionals trade reliability against shipping speed.
- Stripe's API docs and changelog — the public gold standard for API design, versioning, and idempotency keys in the wild.

---

> **The 1% difference:** experts assume every input is hostile, every request is a duplicate, and every dependency will fail — then design systems where those assumptions cost nothing, because they validated at the boundary, deduplicated with keys, and added timeouts everywhere.
$exp_backend_development$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'backend-development'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: capstone-project  (source: capstone-project.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_capstone_project$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners scope capstones by maximum ambition — "a marketplace with AI chat, payments, and mobile apps" — and abandon them at 70%. Experts scope by **completion**: they would rather ship three finished, deployed, documented features than nine half-built ones, because recruiters cannot click a half-built feature. The second discipline: a professional "done" is not "works on my laptop" — it is **deployed, with a URL, a README that sells the work, tests that protect it, and a short demo video or screenshots**. That definition of done is why some portfolios get interviews and identical-skill portfolios do not.

### How Professionals Actually Work

They cut scope on purpose using the "core loop" test: what is the *single* user journey that proves the product's value? For a booking app it is "see availability → book → get confirmation" — everything else (admin panels, reviews, analytics) is v2. They build that loop end-to-end first — walking skeleton — then harden it (tests, error states, deployment), then polish, then *stop*. They timebox in one-week increments with a demo at the end of each, because a weekly demo forces integration and kills the "it all comes together at the end" fantasy that kills most projects. And they write the README *while building*, capturing decisions when they are fresh — the README is the interview before the interview.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Walking skeleton | The thinnest end-to-end version of the core loop, deployed on day one | You are never further than one small step from "working product" |
| One-page product spec | Users, core loop, non-goals (what you are NOT building) | Non-goals prevent the scope creep that kills capstones |
| Decision log | A running file: "chose X over Y because Z" | Interviewers ask "why did you choose X?" — the answer must be rehearsed and real |
| Deployed-from-day-one | CI/CD set up in week one; every merge ships | No "deployment week" horror at the end; the product is always live |
| Demo assets | Screenshots, GIFs, or a 90-second video | Hiring managers spend 90 seconds, not 30 minutes, on your repo |

### Insider Moves You Won't Find in Tutorials

1. Write the README headline first: "X for Y — [one sentence]". If you cannot write it before building, the scope is not decided; the headline is the scope test.
2. Deploy the empty app on day one. The psychological difference between "someday deployed" and "live at a URL, getting better weekly" decides most projects' survival.
3. Seed realistic data. A portfolio with 3 demo users looks dead; write a seed script with believable names, images, and history — reviewers judge the product they *see*, not the schema.
4. Add one "signature detail" — a delightful interaction, a thoughtful empty state, a performance number in the README ("p95 under 200ms"). It gives interviewers something to remember you by.
5. Handle the failure modes visibly: show your loading skeletons, your error states, your form validation. Senior reviewers look there first — that is where amateurs never look.
6. Prepare the three questions every interviewer asks: "Why this project? What was the hardest bug? What would you do differently?" — rehearse the answers out loud with real stories.

### Field Scenarios: How Experts Handle Real Situations

**Week 6 of 8, and half the planned features are not started.**

- *What a beginner does:* Cuts sleep and quality, ships everything half-broken.
- *What an expert does:* Cuts features, not quality: re-scopes to the core loop plus one polish item, updates the README's roadmap ("planned next"), and ships something finished. A smaller done product beats a bigger broken one in every review.
- *Why it matters:* Finishing is the skill being tested; the feature list was never the point.

**A "small" feature (notifications) is swallowing week three.**

- *What a beginner does:* Keeps grinding — it is "almost done".
- *What an expert does:* Timeboxes it: one more day, then it ships as v0 (email only) or gets deferred with a note in the decision log. The capstone's goal is a *finished portfolio piece*, not a feature checklist.
- *Why it matters:* Timeboxes convert sunk-cost spirals into decisions; deferral is a professional tool, not failure.

**The interviewer opens the repo and the README is one line.**

- *What a beginner does:* Says "the code explains itself".
- *What an expert does:* Has a README with: one-line pitch, live link, screenshots, stack and why, "getting started" commands, architecture sketch, and known limitations. The limitations section is a secret weapon — naming your own weaknesses is a senior signal.
- *Why it matters:* The README is how the project speaks when you are not in the room — and in hiring, you are usually not.


### Expert Confessions: Mistakes Even Pros Make

- Building tutorial-clone number five (another todo/Netflix clone). Experts add a twist that creates a story: real users (even 5), a local integration (MoMo payments sandbox, SMS), or a performance budget hit.
- Hidden work: great architecture with zero README, no screenshots, no deploy. If a reviewer cannot see it in 90 seconds, it does not exist.
- No tests at all, or 100%-coverage theatre. The professional middle: tests on the core loop and the tricky logic, honest about the rest.
- Undeployed "final project" syndrome — works locally, never shipped. Deployment is where you learn env vars, migrations, and HTTPS; skipping it skips the last 20% of the education.

### A Day in the Life

A capstone builder starts week 5 with the weekly demo: the core loop works live — booking, paying (sandbox), confirmation email. They cut the planned "admin dashboard" (defer to v2 in the decision log) and spend the day on error states for the payment flow: expired session, declined card, retry — because that is what the demo *video* will show. Mid-week they hit the hardest bug yet: webhook arrives before the transaction commits, so confirmations randomly fail. They solve it with an idempotency key + retry queue, and write it up in the decision log — knowing it will be their best interview story. Friday: seed data refreshed, 90-second screen recording captured, README updated with a new screenshot and the limitation ("webhook ordering handled via retry queue; see DECISIONS.md").

### The Hiring Manager's Lens

Reviewers spend ~90 seconds per portfolio project. The scan order is honest and brutal: live link (works?) → screenshots (looks professional?) → README first paragraph (clear?) → code (organised? tested?) → commit history (human, incremental?). Projects with a *story* — a problem, a user, a hard bug defeated — outperform technically superior projects with no narrative. And "why did you build this?" has a right answer: a real annoyance, a real user, a real constraint. "It was on the list of portfolio ideas" quietly ends interviews.

### Your First Job, In Reality

The capstone's real product is not the app — it is your ability to say: "I scoped it, shipped it weekly, hit a webhook-ordering bug I solved with idempotency keys, and documented the trade-offs." That sentence pattern (scope → process → obstacle → resolution) is the architecture of every good interview answer you will give in your first two years. Build the project to *have the stories*, and record them while fresh — your future self in interviews is depending on the notes you keep now.

### Expert-Level Exercises

1. Write the one-page spec for your capstone: users, core loop, and — the hard part — at least 5 explicit non-goals. Post it somewhere and let one experienced person red-pen it before you build.
2. Deploy the empty walking skeleton this week: a placeholder page at a real HTTPS URL with CI auto-deploying on push. The project now cannot "not exist".
3. Start a DECISIONS.md today. Every time you choose between two approaches, add one line: chose X over Y because Z. This file becomes your interview prep for free.
4. Record a 90-second demo video of the current state — warts and all. Repeat monthly. The final one doubles as portfolio content; the series is your progress audit.

### Go Deeper

- "The Mom Test" (Rob Fitzpatrick) — short book on validating that people actually want the thing; useful even for portfolio projects.
- Google SRE book's production-readiness thinking — the checklist mindset that separates shipped from shippable.
- readme.so or "Make a README" — templates for the README structure reviewers expect.
- Any "build in public" thread on X/LinkedIn — study how strong builders narrate weekly demos; steal the cadence, not the content.

---

> **The 1% difference:** experts finish — by scoping ruthlessly, demoing weekly, deploying from day one, and documenting decisions while fresh — because the capstone's true product is proof that they can take something all the way to done.
$exp_capstone_project$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'capstone-project'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: command-line-linux  (source: command-line-linux.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_command_line_linux$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners use the terminal as a slower file explorer. Experts use it as a **programmable toolkit**: every command reads stdin and writes stdout, so any command can feed any other — and that composability is the whole philosophy. `cat access.log | grep 500 | awk '{print $1}' | sort | uniq -c | sort -rn | head` answers "which IPs hit us with server errors most?" in five seconds, no script required. The second difference: experts treat the shell's history as a *shared, auditable record* — on servers they know every keystroke may matter later, so destructive commands are written carefully, never with wildcards typed in haste, and always after a `pwd` glance to confirm where they are.

### How Professionals Actually Work

Before touching a production server, experts do a "state snapshot": `df -h` (disk), `free -m` (memory), `uptime` (load), `ss -tulpn` (what is listening) — 30 seconds that tells them if this machine is *normal* before they change anything. Changes are made through runbooks — checked, versioned step lists — not memory. And they automate anything done twice: a task done three times manually gets a script with argument checking and a log line, because manual steps are where outages are born. Permission changes follow the same conservatism: grant the narrowest access that works (a user, a group, a directory), and `sudo` is for single commands, never a shell they live in.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| pipes & filters | Composing small commands (grep/awk/sed/sort/uniq) into data pipelines | One-line answers to questions that would be a day of clicking |
| tmux / screen | Terminal sessions that survive disconnects | Long jobs keep running over flaky connections; sessions are resumable and shareable for pair work |
| ssh keys + config | ~/.ssh/config with per-host users, keys, and ports | Passwordless, correct-by-default connections; no more "which port was it?" |
| rsync | Delta-copying files locally and over ssh, with --dry-run | Safe, resumable transfers; the --dry-run preview prevents disasters |
| journalctl / logs | Structured querying of service logs (journalctl -u nginx --since "1 hour ago") | Experts query logs; they do not scroll them |

### Insider Moves You Won't Find in Tutorials

1. Press Ctrl+R and type a fragment to search history — then make aliases for the top 10 commands you retype. Experts bend the shell to their hands.
2. `mkdir -p a/b/c`, `cp file{,.bak}`, `cd -` (previous dir), `!!` (repeat last), `Alt+.` (last argument): five expansions that save hundreds of keystrokes a day.
3. Before any rm with a wildcard, run the identical command with `ls` instead of `rm`. The output is exactly what would be deleted — this one habit has saved entire companies.
4. Use `less +F` (or `tail -f`) on a log while reproducing a bug in another terminal: live cause-and-effect instead of guesswork.
5. `ssh -L 5432:localhost:5432 user@server` tunnels a production database port to your laptop safely — the standard way to inspect data without opening the DB to the internet.
6. Write every fix as a runbook entry immediately: symptom, diagnosis commands, fix, verification. The next incident at 3am will be handled by someone (maybe you) who was not there for this one.

### Field Scenarios: How Experts Handle Real Situations

**The server is slow at 9am every day.**

- *What a beginner does:* Restarts it and hopes.
- *What an expert does:* Snapshots load (`uptime`, `top`), finds which resource is exhausted (CPU? RAM? disk I/O?), identifies the process with `ps aux --sort=-%cpu | head`, and correlates with logs — then fixes the cause, not the symptom.
- *Why it matters:* Restarts hide the diagnosis; the same slowness returns tomorrow, worse.

**You need to give a freelancer access to deploy one app.**

- *What a beginner does:* Shares the root password "temporarily".
- *What an expert does:* Creates a dedicated user, adds only the needed sudo commands, installs their ssh key, sets an expiry date, and removes access in writing when the contract ends.
- *Why it matters:* Root passwords are forever until rotated; scoped access expires cleanly.

**Disk full alert at 2am.**

- *What a beginner does:* Deletes random big files until it stops alerting.
- *What an expert does:* `df -h` to find the full filesystem, `du -xh --max-depth=2 /var | sort -rh | head` to find what grew, and almost always finds logs — then fixes rotation, not just the files.
- *Why it matters:* The full disk is a symptom; unrotated logs, orphaned dumps, and tmp buildup are the disease.


### Expert Confessions: Mistakes Even Pros Make

- Running as root by habit. One wrong keystroke with root privileges can end the machine; experts stay a normal user and sudo individual commands.
- chmod 777 "to make it work". It works by making the file world-writable — experts chmod the *minimum* (often just the owner or group) and chown correctly instead.
- Piping curl straight into bash from the internet without reading it. Even experts get phished by convenience; download, read, then run.
- Editing production configs without a backup copy in the same command (`sudo cp nginx.conf nginx.conf.bak-$(date +%F)` first) and without `nginx -t` (or equivalent) before reload.

### A Day in the Life

A DevOps engineer in Kigali starts by ssh-ing into three servers and running the same 30-second health snapshot on each — muscle memory. An alert fires: API latency up. They tail the app log with `less +F` while watching `top` in a split tmux pane; the culprit is a backup job scheduled at peak hours. They reschedule it, write four lines in the runbook ("symptom → diagnosis → fix → prevention"), and post the runbook link in the incident channel. Before lunch they have also reviewed a teammate's shell script for a missing `set -euo pipefail` — the difference between a script that fails loudly and one that silently corrupts data.

### The Hiring Manager's Lens

Terminal skill is tested in interviews more than candidates expect: "find the 5 largest files under /var", "show me which process is listening on port 3000", "grep this log for errors from today only". Interviewers watch for fluency (do your fingers hesitate?), safety (did you dry-run the destructive thing?), and whether you compose commands instead of inventing scripts. A candidate who says "I would check `ss -tulpn`" over one who says "I would restart it" is telling you who survives production.

### Your First Job, In Reality

On your first week, someone will ask you to "just check the logs on the server". That moment is the interview. If you ssh in, snapshot the state, query with journalctl/grep with time bounds, and report *what you ruled out* — you will be the person asked again, and again, until you are the person who owns the servers. Nobody is impressed by GUI confidence on a server; there is no GUI.

### Expert-Level Exercises

1. Health-snapshot drill: on any Linux machine (or WSL), run df -h, free -m, uptime, ss -tulpn and write two sentences on what each says about the machine. Repeat weekly until it takes under a minute.
2. Log autopsy: take any access log and answer, with one pipeline (no editor): top 5 client IPs, top 5 requested paths, and how many 4xx vs 5xx responses. Time yourself.
3. Write a backup script with `set -euo pipefail`, argument checking, a dated output folder, and one log line per run. Schedule it with cron. This is the "professional hello world".
4. Harden an ssh server: key-only auth, disabled root login, changed port, and a ~/.ssh/config entry with a friendly name. Verify each change and write down how you would roll it back.

### Go Deeper

- "The Linux Command Line" by William Shotts — free at linuxcommand.org; the single best terminal book.
- Google's SRE book, "Emergency Response" chapter — how professionals behave during incidents (free at sre.google).
- Julia Evans' zines (wizardzines.com) —Networking! Ack!, and Bh shamelessly effective debugging primers.
- MIT's "Missing Semester of Your CS Education" — lectures 1-2 (shell, dotfiles) are the expert terminal course.

---

> **The 1% difference:** experts are not people who know 500 commands — they are people who compose the 30 they know into pipelines, snapshot before they touch, dry-run before they destroy, and write down what they fixed so the next person inherits a runbook instead of a mystery.
$exp_command_line_linux$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'command-line-linux'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: databases  (source: databases.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_databases$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners treat the database as a dumb storage box the ORM talks to. Experts know it is the most *optimised software on the server* — a query planner that makes thousands of decisions per second, and the professional's job is to give it good data (types, constraints, indexes) and then **measure** instead of guessing. The workflow is always the same: find the worst query with `pg_stat_statements` (ordered by total time, not mean time — total is what users feel), read its `EXPLAIN (ANALYZE, BUFFERS)` plan, and look for the three crimes: a Seq Scan on a big table, rows estimated vs rows actual diverging wildly, or a sort that spills to disk. Fix the query or add the index, then re-measure. Intuition loses to that loop every time.

### How Professionals Actually Work

They push truth into the schema: NOT NULL, UNIQUE, CHECK, and FOREIGN KEY constraints so that *impossible states are unrepresentable* — the application layer can have bugs, the database cannot be polite about them. They design indexes for actual queries (leading-column rule for composites, e.g. (tenant_id, created_at) serves "recent rows per tenant"), never blindly on every column, because every index taxes every write. Transactions wrap every multi-step mutation; and schema changes go through **versioned migrations** that are reviewed like code, tested on production-sized data, and written to be reversible (or at least backward-compatible: expand → migrate → contract, never a one-step column rename with downtime).

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| pg_stat_statements | Postgres extension ranking queries by total execution time | Tells you what to optimise first — no more tuning by vibes |
| EXPLAIN (ANALYZE, BUFFERS) | Executes the query and shows the *real* plan with timings and I/O | Turns "slow query" into "Seq Scan on orders, 1.2M rows, spilling 80MB to disk" |
| Composite indexes | Multi-column indexes ordered by filter-then-sort | One index serves both the WHERE and the ORDER BY — the difference between 40ms and 400ms at scale |
| Versioned migrations | Schema changes as reviewed, ordered, re-runnable files | Every environment identical; deploys boring; rollbacks possible |
| RLS / row-level authorisation | Database-enforced per-row access (Supabase default tooling) | The authorisation bug that ships because a route forgot its check cannot exist |

### Insider Moves You Won't Find in Tutorials

1. Index for your WHERE + ORDER BY together: a composite (tenant_id, created_at DESC) answers "latest orders per tenant" with an index scan, no sort step. Single-column indexes are usually a waste by comparison.
2. Pagination done right: keyset (`WHERE created_at < $last_seen ORDER BY created_at DESC LIMIT 20`), not OFFSET — OFFSET 100000 makes the database read and throw away 100,000 rows; keyset is constant-time.
3. Count nothing you can avoid: COUNT(*) over a huge filtered set is a real cost; for UI badges, keep approximate counts in a summary table updated by trigger — professionals denormalise *deliberately*, with a reason written down.
4. Batch deletes and updates (`DELETE ... WHERE id IN (...) LIMIT 10000` in a loop) — a single 50M-row delete in one transaction will lock, bloat, and possibly take down the table.
5. Use `EXPLAIN (ANALYZE, BUFFERS)` in a transaction you can ROLL BACK, so an accidental UPDATE in the plan touches nothing.
6. Name constraints explicitly (`CONSTRAINT orders_user_fk FOREIGN KEY ...`). When the day comes that one blocks a migration, "orders_user_fk" is actionable and "_fk_12345" is archaeology.

### Field Scenarios: How Experts Handle Real Situations

**The product page got slow after six months of growth.**

- *What a beginner does:* Adds Redis "to cache everything".
- *What an expert does:* Opens pg_stat_statements, finds one query eating 40% of total time, reads its plan (Seq Scan + spill), adds the composite index it was begging for — 900ms to 12ms — and only then decides whether caching is still needed (it usually is not).
- *Why it matters:* Caching a slow query memorises the problem; indexes delete it.

**Two support agents update the same customer record; one update silently disappears.**

- *What a beginner does:* Blames "a sync bug" and adds a delay.
- *What an expert does:* Recognises lost update: adds a `version` column and optimistic locking (`UPDATE ... WHERE id=$1 AND version=$2`), so the second writer gets a conflict to resolve instead of a silent overwrite.
- *Why it matters:* Concurrency is normal; silent data loss is not a bug you find, it is one your users find.

**A migration must rename a column used by the mobile app in production.**

- *What a beginner does:* Runs the rename in one step Friday evening; old app versions break instantly.
- *What an expert does:* Expands: add the new column, dual-write from the app; migrate: backfill in batches; contract: switch reads, ship app updates, drop the old column weeks later. Zero downtime, reversible at every step.
- *Why it matters:* Live systems cannot pause; migrations must be compatible with the versions already in users' hands.


### Expert Confessions: Mistakes Even Pros Make

- SELECT * in application code. It breaks the moment a column is added, drags a TOASTed 2MB JSON blob into memory for a list view, and defeats covering indexes. Select the columns you use.
- Storing money as FLOAT. 0.1 + 0.2 ≠ 0.3; experts use integer cents or NUMERIC — every floating-money bug in history is this one.
- N+1 queries dressed up by an ORM: 1 query for orders, then 1 per order for its customer. The ORM hides it; pg_stat_statements (or the query count in dev toolbar) exposes it; `JOIN` or eager-loading kills it.
- Trusting the ORM's default indexes. ORMs index primary keys, not your queries — the composite index for the query your dashboard runs 10,000 times a day is on you.
- Deleting without soft-delete or archive strategy when the data has value (audits, recovery, "did we ever invoice this?"). Experts design deletion as carefully as creation.

### A Day in the Life

A backend/database engineer starts with the weekly query report (pg_stat_statements top-10 by total time). One query doubled its mean time — they grab its plan with EXPLAIN (ANALYZE, BUFFERS), see a Seq Scan over 2M rows caused by a function wrapped around an indexed column (non-sargable: the index became useless). They rewrite the predicate index-side, verify the plan on staging with production-scale data, and ship it as a reviewed migration. Mid-morning: a teammate's PR adds a CHECK constraint (price > 0) — they approve and ask for the constraint name. After lunch, they batch-delete 30M expired session rows in 10k chunks, monitoring locks between batches, then update the runbook. Final act: they catch a SELECT * in review and leave the exact column list.

### The Hiring Manager's Lens

Database interviews are workflow tests: "This query is slow — walk me through what you do" (listening for: measure first, pg_stat_statements → EXPLAIN → index/query fix → re-measure, *in that order*); "How would you design orders and order_items?" (listening for: FKs, constraints, money as NUMERIC/cents, indexes for the real access pattern); "Tell me about a migration you were scared of" (listening for: expand/contract, batching, rollback plan). Anyone can write a JOIN; seniors narrate a measurement loop.

### Your First Job, In Reality

In your first months, the database will be "already designed" — your job becomes not breaking it and making it faster. The ticket that changes your reputation: "reports page is slow". If you answer with a measured plan and one index (with the before/after ms), you have done something many mid-level engineers still cannot. Also true: your first migration mistake (a missing WHERE on UPDATE, caught in staging or not) will teach you more than any tutorial — which is why professionals always write the WHERE clause first, count the rows it will hit, *then* run it.

### Expert-Level Exercises

1. Enable pg_stat_statements on any Postgres you own (Supabase has it). Rank by total_exec_time, take the top query, capture EXPLAIN (ANALYZE, BUFFERS) before and after your fix. Keep the two plans side by side.
2. Take a list endpoint with OFFSET pagination, convert it to keyset pagination, and benchmark both at OFFSET 100,000. Write down the ratio — you will never use OFFSET again.
3. Add one composite index that serves a real WHERE+ORDER BY pair from your app. Verify with EXPLAIN that the sort step disappeared.
4. Write a migration that adds a CHECK constraint on existing data *without* downtime: add NOT VALID, clean the bad rows, VALIDATE. This pattern is a professional signature.

### Go Deeper

- Postgres docs: "Performance Tips" chapter + EXPLAIN reference — dense but the actual source of truth.
- pganalyze blog and "Postgres explain" guides — the clearest practitioner explanations of plans and buffers.
- "Use The Index, Luke" (use-the-index-luke.com) — free book on indexing by Markus Winand; the composite-index chapter is the expert core.
- Supabase docs on Row Level Security — how policy-enforced authorisation works at the database layer.

---

> **The 1% difference:** experts measure before they optimise (pg_stat_statements → EXPLAIN → fix → re-measure), encode truth as constraints, design indexes for real queries, and treat migrations as code — reversible, reviewed, and compatible with the world already running.
$exp_databases$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'databases'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: devops-basics  (source: devops-basics.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_devops_basics$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners think DevOps means tools — "I installed Docker, I do DevOps". Experts know it means **shortening the loop between "I changed something" and "I know it works in production"** — and that the loop is shortened by small, frequent, reversible changes. The DORA research programme has shown for years that elite performers deploy *more* often *and* fail less, because a small deploy is easy to review, easy to roll back, and easy to reason about. The second mindset: production is not a shrine, it is a laboratory — experts watch every deploy with real metrics, and an incident is never someone's fault; it is a systems gap whose fix gets written down.

### How Professionals Actually Work

Every service ships with three observability pillars from day one: **metrics** (error rate, latency percentiles p50/p95/p99 — never just the average, averages hide suffering), **logs** (structured, with request ids), and a way to tell *what the user is experiencing* (uptime check on the real endpoint, not on /health). Deploys are automated and boring: CI runs tests, builds an immutable image tagged with the commit SHA (never "latest"), and pushes the same artifact through staging to production. Risky changes ride behind a **canary**: 5% of traffic first, watched, then promoted. And the skill that separates juniors from seniors on-call: **mitigate first, diagnose second** — roll back in five minutes, understand at leisure.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Immutable images + SHA tags | One image per commit, identical through every environment | "Works on staging" becomes a guarantee, not a hope |
| Health checks + graceful shutdown | Readiness/liveness endpoints and SIGTERM handling | Zero-downtime deploys and honest restarts |
| Latency percentiles | p50/p95/p99 instead of averages | Averages lie; p99 is where your users actually live |
| Canary + instant rollback | Traffic shifting to the new version with automated health gating | Blast radius of a bad deploy shrinks from "everyone" to "5% for two minutes" |
| Blameless postmortems | Written incident analysis focused on systems, not people | The same outage never happens twice — institutional memory you can search |

### Insider Moves You Won't Find in Tutorials

1. Write multi-stage Dockerfiles: build with compilers and dev deps in stage one, copy *only* the artifacts to a clean runtime stage. 300MB images become 60MB, start faster, and carry fewer CVEs.
2. Never use "latest" in a deployment manifest. Pin by digest or SHA tag — "latest" is how Friday deploys become weekend incidents.
3. Run `docker run --rm -it image sh` locally and actually look inside: what is in this image that does not need to be? Every unused package is attack surface and pull time.
4. Add a 10-minute rollback drill to your calendar: pick a service, roll back to the previous version in production, roll forward again. If a rollback has never been rehearsed, it does not exist.
5. Configure graceful shutdown (finish in-flight requests on SIGTERM, then exit) — it turns every deploy from "some users saw errors" into "nobody noticed".
6. Alert on symptoms users feel (error rate, latency, queue age), not causes (CPU 80%). CPU alerts at 3am train engineers to ignore 3am alerts.

### Field Scenarios: How Experts Handle Real Situations

**The new deploy doubles the error rate.**

- *What a beginner does:* Starts reading the new code and logs to "understand what happened" while users suffer.
- *What an expert does:* Rolls back first (the previous version is one command away because deploys are reversible by design), confirms recovery, *then* debugs on a branch with no pressure. Files a short postmortem: what detected it, what contained it, what prevents it.
- *Why it matters:* Mitigation and diagnosis use different mental modes; mixing them wastes both.

**Disk fills on the production host at 3am, again.**

- *What a beginner does:* Logs in, deletes some logs, goes back to sleep.
- *What an expert does:* Fixes the *system*: log rotation config, image cleanup policy (docker system prune on a timer), and a disk-usage alert at 70% that pages *before* the 3am. Then writes the postmortem so the next engineer inherits prevention, not folklore.
- *Why it matters:* Every repeated incident is a missing piece of automation; experts automate instead of heroically repeating.

**A teammate says the staging deploy "just hangs".**

- *What a beginner does:* Restarts everything until it works.
- *What an expert does:* Checks the readiness probe — the app is healthy but listening on 127.0.0.1 inside the container, so the probe (and traffic) never reaches it. One config line, twenty minutes saved, and the habit of "read what the platform is telling you" spreads.
- *Why it matters:* Most "mysterious" infra failures are the platform reporting a misconfiguration nobody read.


### Expert Confessions: Mistakes Even Pros Make

- Big-bang deploys. A 6-week release is undeployable, unreviewable, and unrevertable; experts deploy daily (or more) precisely so that every change is small enough to be understood by one person.
- Hand-configuring servers. The server you fixed by hand at 2am is now different from every other server and from the image — experts change the image/config, redeploy, and let servers be cattle, not pets.
- Storing state in containers (uploads, sessions, SQLite files). Containers die without warning; anything that must survive gets a volume or an external store (S3/RDS/managed Postgres).
- Monitoring that only you can read. Dashboards with 40 panels and no owner are wallpaper; experts keep one dashboard per service with the four golden signals and one alert that means "user is being hurt".

### A Day in the Life

A DevOps engineer starts with the daily scan: error budget burned 12% this week (fine), p99 latency crept up 40ms since Tuesday (worth a look). They bisect by deploy: the Tuesday image added a logging middleware doing a synchronous external call — they make it async and fire-and-forget, watch p99 recover in the canary, and promote. Mid-morning: a PR review on a Dockerfile — they suggest a multi-stage build, and the image drops 240MB. After lunch, an incident: connection pool exhausted on one API pod, 5% error rate. They restart the pod (mitigation, 2 minutes), then find the real bug — a route that leaked connections on early returns — and add the fix plus a pool-exhaustion alert. The day ends writing the postmortem: timeline, contributing factors, three action items, no names.

### The Hiring Manager's Lens

DevOps screens test incident instincts: " deploys and errors double — walk me through it" (listening for: rollback *first*, then diagnosis; canary would have caught it), "how do you know your service is healthy?" (listening for: percentiles, error rate, saturation — not "CPU looks fine"), "tell me about a postmortem you wrote" (listening for: contributing factors, action items, blamelessness). Candidates who say "we never rolled back because we were careful" are describing risk, not safety — seniors know the rollback path is the product.

### Your First Job, In Reality

In your first months you will not architect Kubernetes clusters — you will add a health check, fix a flaky pipeline step, and write deployment logs that others can follow. Do these extremely well. The reputation accelerant: be the person whose changes are *boring* — small PRs, real test coverage, images that shrink, and a runbook line for every manual step you were forced to do. When the next on-call rotation comes, you will be the one who sleeps through the night.

### Expert-Level Exercises

1. Containerise one of your apps with a multi-stage Dockerfile. Compare image size and startup time before/after. Then run as a non-root user (USER node) — production does.
2. Set up a CI pipeline that: tests, builds an image tagged with the commit SHA, pushes, and deploys to a free host. Prove the same SHA that passed tests is what runs in "production".
3. Break it on purpose: deploy a version that throws 500s on one route, then practise your rollback until it takes under five minutes. Time yourself — that number is your real SLA.
4. Write a blameless postmortem for any past incident you remember (even a personal project): timeline, detection, contributing factors, 3 action items. Notice how much you learn from writing, not fixing.

### Go Deeper

- Google SRE book + SRE Workbook (free at sre.google) — the canon: SLOs, canaries, postmortems, on-call health.
- DORA "State of DevOps" reports (dora.dev) — the research linking small deploys and CI to organisational performance.
- Docker docs: "Multi-stage builds" and "Best practices" — 30 minutes that permanently improve your images.
- "The Phoenix Project" — a novel, but the DevOps mental model (bottlenecks, work in progress, feedback loops) sticks for life.

---

> **The 1% difference:** experts make production safe by making change small, observable, and reversible — deploy fearlessly because rollback is one command, and treat every incident as a systems lesson written down, not a person to blame.
$exp_devops_basics$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'devops-basics'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: frontend-development  (source: frontend-development.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_frontend_development$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners ask "does it look right on my machine?" Experts ask three harder questions: **"How fast does it *feel*?"** (a 1.9s load that paints content immediately feels faster than a 1.5s load that shows a spinner), **"Can everyone use it?"** (accessibility is not a feature, it is the legal baseline — the European Accessibility Act enforced from mid-2025 makes WCAG conformance a requirement for many products, and it is simply correct engineering everywhere), and **"What happens when it fails?"** (offline, slow 3G, expired token, empty data, 10,000 rows — the states tutorials never draw).

### How Professionals Actually Work

They hold UI to a simple discipline: **derive, don't duplicate** — if "cart total" can be computed from items, it is not state, it is a calculation; every duplicated value is a future desync bug. Server data lives in a cache (React Query/SWR) with loading/error states per query; *UI* state (open dropdowns, current tab) lives locally; the URL holds anything a user should be able to share or refresh (filters, page, selected row). They build the empty, loading, and error states *before* the happy path, and treat a component that takes 10 props as a smell — 10 props is usually two components wearing one trench coat.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Lighthouse + DevTools throttling | Audits and "Slow 4G" simulation | Performance is measured, not guessed; experts test on the user's network, not theirs |
| React Query / SWR | Server-state caching with loading/error/refetch handling | Deletes 80% of hand-rolled state code and its bugs |
| ARIA + keyboard pass | Semantic HTML first, ARIA only to fill gaps; unplug the mouse and tab the page | The fastest accessibility audit is a keyboard and a clear head |
| List virtualisation | Render only visible rows (react-window/virtua) for long lists | The difference between a 10,000-row table that flies and one that freezes the phone |
| Error boundaries + Sentry | Catching render crashes and reporting them with stack + user context | Users see a retry button instead of a white screen; you see the crash in minutes |

### Insider Moves You Won't Find in Tutorials

1. Set explicit width/height (or aspect-ratio) on every image and reserve skeleton space for lists — cumulative layout shift is the cheap, huge win: the page stops jumping as it loads.
2. Debounce search inputs (250-300ms) and abort stale fetches with AbortController — the classic "results arrive out of order" bug disappears.
3. Optimistic updates for small actions (like/save): update the UI immediately, roll back on failure with a toast. Perceived speed doubles without touching the backend.
4. Use content-visibility: auto on below-the-fold sections — the one-line lazy render most teams never ship.
5. Put anything shareable in the URL (?page=3&sort=price). Users share links; a UI state that survives refresh is a feature, one that dies is a bug.
6. Test with the keyboard only: Tab through the whole page. If focus disappears, a modal trap is broken or a custom control is not focusable — that is a real user locked out.

### Field Scenarios: How Experts Handle Real Situations

**The app "works" but users complain it feels slow.**

- *What a beginner does:* Adds more spinners and blames the server.
- *What an expert does:* Measures with real-user metrics: LCP (is the main content visible fast?), INP (does it respond to taps under 200ms?), CLS (does the layout jump?). Paints content progressively, inlines critical CSS, defers the 200KB analytics script — feels twice as fast with zero backend change.
- *Why it matters:* Perceived performance is a frontend lever; waiting on the backend is giving away control.

**A screen renders 5,000 rows and the phone freezes.**

- *What a beginner does:* Adds "please use a laptop" to the README.
- *What an expert does:* Virtualises the list (renders ~20 visible rows regardless of data size), paginates the API, and adds a performance test to CI so the regression is caught before the user with 5,000 rows finds it.
- *Why it matters:* Real data is big data; the demo dataset lied.

**A modal closes and keyboard focus is lost to the page behind.**

- *What a beginner does:* Never notices; mouse users are fine.
- *What an expert does:* Moves focus into the modal on open, traps Tab inside it, and restores focus to the trigger on close — 20 lines that decide whether a blind or motor-impaired user can use the product at all.
- *Why it matters:* Accessibility bugs are silent until someone disabled depends on the product.


### Expert Confessions: Mistakes Even Pros Make

- Reaching for useState for everything — including server data. That is how duplicate caches, race conditions, and "stale after save" bugs are born; cache libraries exist precisely for this.
- Div soup and div buttons. A <button> gets focus, keyboard activation, and screen-reader semantics for free; a <div onClick> gets none and needs ARIA to half-work. Semantic HTML is the cheapest performance and a11y feature there is.
- Optimising before measuring. Lighthouse before hunches: the biggest win is usually an uncompressed 800KB hero image, not the React.memo everyone reaches for.
- Shipping a form without handling *offline submit* — on flaky mobile networks, the queue-and-retry pattern (save to localStorage, sync later) is the difference between a trusted app and a lost customer.

### A Day in the Life

A frontend engineer starts with Sentry: three new crashes overnight, all on the checkout page for users on Android 9. They add an error boundary around checkout (so users see "retry" instead of white screen), then reproduce on a throttled connection and find the real bug — an unguarded optional chain on an old API shape. Mid-morning, a new feature: they build loading/empty/error states first, get design sign-off on those states (not just the happy one), then build the happy path. After lunch is a perf pass: Lighthouse says LCP 3.1s; the 900KB unoptimised hero image becomes a 90KB WebP with explicit dimensions, and CLS drops to near zero. They finish by tab-testing the new modal, restoring focus, and filing two a11y tickets they found on themselves.

### The Hiring Manager's Lens

Frontend interviews increasingly test the states, not the happy path: "Build a searchable list" — the senior candidate asks "what do you want to show while loading? when empty? on error? what about 10,000 results?" and that question alone signals experience. Accessibility questions ("how would a keyboard-only user close your modal?") and Core Web Vitals vocabulary (LCP/INP/CLS and their thresholds) are now standard screens at product companies. Portfolios with a performance or a11y case study ("I cut LCP from 4s to 1.6s") outperform portfolios with five clone apps.

### Your First Job, In Reality

Your first tickets will be CSS alignment and a dropdown bug — and how you handle them is the interview. The seniors' tell: you open DevTools on a real phone (or the device emulator *with CPU throttling*), you check the empty state, and you ask which browsers/devices are actually supported *before* fixing. Within a month you will be handed the "list page is slow" ticket; virtualisation plus a paginated endpoint is the answer that gets your name mentioned in the next standup for the right reasons.

### Expert-Level Exercises

1. Audit one page you built with a keyboard only (no mouse). Fix every place focus is lost or a control is unreachable. Time before/after to complete the page without the mouse.
2. Run Lighthouse on mobile throttling against your app and fix the top three findings (usually: image sizes, script deferral, layout shift). Record the before/after LCP and CLS numbers.
3. Take a list component and add all four states: loading skeletons, empty with a call to action, error with retry, and success. Then virtualise it and test with 10,000 fake rows.
4. Add an offline queue to one form: on submit failure, save to localStorage, show a pending indicator, retry on reconnect. You have just built the feature that wins users on African mobile networks.

### Go Deeper

- web.dev (Google) — Core Web Vitals thresholds and fixes, straight from the source; the "Learn Performance" course is free.
- MDN Accessibility guide + WebAIM's WCAG checklist — the practical, legal-baseline reference.
- TanStack Query docs — read "Queries" and "Mutations" end to end; it is a masterclass in server-state thinking.
- "Refactoring UI" (Wathan & Schoger) — the design details that separate amateur-looking UIs from professional ones, without needing to be a designer.

---

> **The 1% difference:** experts optimise what users *feel* — instant feedback, no layout jumps, real content painted fast — and they build the loading, empty, error, and offline states before the happy path, because that is where the product actually lives.
$exp_frontend_development$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'frontend-development'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: git-github  (source: git-github.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_git_github$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners memorise git commands and hope. Experts understand the **object model** underneath — every commit is a snapshot addressed by a hash, every branch is just a 41-byte file pointing at a commit, and a merge conflict is not git breaking, it is git honestly telling you two people expressed different intents. That mental model is why experts seem calm when git "loses" work: almost nothing is ever truly lost, it is just unreferenced — and `git reflog` is the expert's recovery tool of first resort. They also know when *not* to use git's sharpest tools: rebasing shared branches or force-pushing to main are the fastest ways to lose a teammate's trust.

### How Professionals Actually Work

The Linux kernel — the largest collaborative software project in history — runs on patches reviewed as diffs in email, not on git platforms. The lesson experts take from it: **history is a story for the next reader, not a backup**. So they commit small, single-purpose units, write commit messages explaining the *why* ("Return 409 on duplicate emails so signup retries don't create ghosts"), and rewrite history freely *before sharing* and almost never after. On teams, they default to short-lived branches merged to a trunk (trunk-based development) — because long-lived feature branches hide integration pain until the merge, when it is most expensive.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| git reflog | A log of every position HEAD has ever pointed to | The reliable undo: recovers "deleted" commits and botched rebases |
| git bisect | Binary search through history to find the commit that introduced a bug | Turns "it broke somewhere in the last 300 commits" into a 9-step hunt |
| git add -p / rebase -i | Stage or rewrite changes hunk-by-hunk, interactively | Lets experts craft clean, reviewable, single-purpose commits from messy work |
| Conventional Commits | A commit format (feat:, fix:, docs:, chore:) parsed by release tools | History becomes machine-readable changelogs and version bumps |
| Stash with intent | git stash push -m "wip: cart totals" | Named stashes prevent the "what was in stash@{2}?" mystery |

### Insider Moves You Won't Find in Tutorials

1. Never resolve a conflict by picking "ours" or "theirs" blindly. Experts read the third, combined version line-by-line — the conflict markers show both intents, and the correct resolution is usually a *conversation*, not a choice.
2. Use `git log --oneline --graph --all` as your map. Experts orient themselves in an unfamiliar repo with this single command before touching anything.
3. Amend or fixup freely in your own unpushed branch, never on a shared one. The rule that keeps teams fast: "history is mutable until someone else has seen it."
4. When a PR grows beyond ~400 changed lines, experts stop adding to it and split it. Review quality collapses with size — most reviewers approve large diffs with a glance, which is worse than not reviewing.
5. Commit messages that start with a verb in the imperative mood ("Add rate limiter", not "Added") read like a changelog, and changelogs can then be generated automatically.
6. Tag every production release (`git tag -a v1.4.0`). When an incident happens at 2am, "what exactly is running in production?" must be a one-command answer.

### Field Scenarios: How Experts Handle Real Situations

**You committed to main by mistake and already pushed.**

- *What a beginner does:* Force-pushes main back, deleting teammates' commits from the remote.
- *What an expert does:* Never rewrites shared history — creates a new commit that undoes the mistake (`git revert`), then moves the real work to a branch properly. Force-push to main is a fireable-level mistake in most teams.
- *Why it matters:* Everyone else has built on the pushed history; rewriting it poisons every clone.

**A teammate's branch conflicts with yours on the same lines.**

- *What a beginner does:* Resolves alone, picks a side, merges.
- *What an expert does:* Resolves with both authors present (or clearly proposes a resolution in the PR), because a conflict is proof two people made overlapping decisions that need aligning — technically and socially.
- *Why it matters:* Silent conflict resolution is how duplicated logic and lost fixes enter production.

**A bug appeared "some time in the last two weeks".**

- *What a beginner does:* Reads hundreds of lines of diffs hunting by eye.
- *What an expert does:* Runs `git bisect start`, marks good/bad endpoints, and lets git binary-search the history — usually finds the culprit commit in under ten automated steps.
- *Why it matters:* Finding the *commit* that introduced a bug reveals the *reason* the bug exists.


### Expert Confessions: Mistakes Even Pros Make

- Keeping private keys, .env files, or dumps in commits. Once pushed, a secret must be treated as burned and rotated — history rewriting (filter-repo) is expensive and imperfect. Experts prevent with .gitignore on day one.
- Giant "I did lots of stuff" commits. Everyone does it; experts have just learned to break the habit by committing at natural checkpoints — every green test suite is a commit point.
- Using merge when rebase would keep history readable (or vice versa) dogmatically. The actual expert rule: rebase *your own* unshared work onto the trunk; merge to *integrate reviewed* work.
- Treating the PR description as optional. The diff shows what changed; only the description can say what should be reviewed carefully, how it was tested, and what it breaks.

### A Day in the Life

A senior engineer starts by reviewing two small PRs with precise comments ("this early return hides the validation error — can we surface it?"). Mid-morning, CI fails on main; they use `git log --oneline` on the failing step, identify the suspect commit from its message, and revert it with `git revert` — four minutes to restore a green build. After lunch, feature work: three small commits on a branch ("extract validator", "add failing test for discount edge", "fix: apply discount before tax"). Before opening the PR they rebase onto main and re-run tests locally, so the reviewer sees a clean, conflict-free, single-purpose diff.

### The Hiring Manager's Lens

Interviewers routinely probe git with scenario questions: "You pushed a bug to main — walk me through your next 10 minutes." They are listening for the instincts: revert not rewrite, reflog not panic, bisect not eyeball. "Tell me about a conflict you resolved" checks whether the candidate treats git as a collaboration tool or a personal save button. Candidates who talk about *the team's history* (small PRs, clear messages, green main) signal seniority far beyond their years.

### Your First Job, In Reality

Your first week on a real team will involve rebasing your branch after review comments, and possibly a squash-merge etiquette question. Nobody will quiz you on the rebase-vs-merge debate; they will judge you on whether your second PR is easier to review than your first. The fastest way to earn trust: when CI fails on your branch, fix it within minutes and say so in the PR — "failed on lint, fixed in commit abc" — that reliability is worth more than any algorithm.

### Expert-Level Exercises

1. Break your repo on purpose: make a commit, "lose" it with `git reset --hard HEAD~1`, then recover it using only `git reflog`. You are building the calm that comes from knowing undo exists.
2. Take a messy branch with 8 "wip" commits and use `git rebase -i` (squash/fixup/reword) to shape it into 2 clean commits with real messages. This one skill separates professionals from hobbyists.
3. Plant a bug in a friend's repo and hand it back. They must find the guilty commit with `git bisect run` against your test script in under 10 steps.
4. Audit your last 20 commit messages. Rewrite the habit: each one starts with a capitalised imperative verb, fits in 50 chars, and the body (if any) explains *why*, not *what*.

### Go Deeper

- "Pro Git" by Chacon & Straub — free at git-scm.com/book; chapters 3 (branching) and 7 (internals) are the expert material.
- Conventional Commits spec (conventionalcommits.org) — 15 minutes to read, immediately useful in any team.
- git-scm.com "Git Tools — Interactive Staging" — the add -p / rebase -i workflow demonstrated properly.
- Read how the Linux kernel accepts patches (kernel.org docs) to see history-as-story at civilization scale.

---

> **The 1% difference:** experts are calm in git because they know the model underneath, ruthless about history *before* sharing, and conservative after — and they treat every commit message as a message to a future teammate having a hard day.
$exp_git_github$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'git-github'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: problem-solving  (source: problem-solving.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_problem_solving$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners attack problems in the order they arrive. Experts **triage**: they separate the problem's *deadline* from its *importance*, then attack in the order that protects the user, the deadline, or the data — whichever is truly most at risk. Under pressure they reach for the same three levers, always in the same order: **cut scope** (what can we ship without?), **buy time** (flag it now, re-plan, never silently slip), **add resources** (only after the first two — adding people to a late project makes it later, as Brooks' Law has said for fifty years). And the deepest habit: experts say **"I don't know — I'll find out by 3pm"** out loud, early, instead of disappearing into heroic silence and emerging either a legend or too late.

### How Professionals Actually Work

Given a deadline, they run a quiet MoSCoW pass: Must / Should / Could / Won't — and they get the *Must* list agreed in writing by the stakeholder, because half of all deadline crises are scope disputes wearing a technical costume. They build with **boring technology** under pressure (the product should be new; the plumbing should be old) and isolate every risky bet behind a timebox: "spike: two days to prove the API works; if not, we use plan B". When stuck, the escalation is a move, not a failure: timebox → ask → change approach → escalate — each step timed, never skipped. The Warren Buffett two-list story is the culture: 25 goals, circle the top 5, and treat list B (the other 20) as *avoid at all cost* — because they are the things that feel productive while killing the deadline.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| MoSCoW + written Must-list | Prioritisation with stakeholder sign-off on the minimum | Converts deadline panics into scope conversations before they start |
| Timeboxed spikes | Fixed-size experiments (max 2 days) with a written plan-B | Risky unknowns get contained; sunk cost gets capped by design |
| The two-list discipline | Top-5 goals vs the avoid-at-all-cost rest | Focus is subtraction; the B-list is where deadlines die |
| Early-slip rule | Flag delays the moment predicted vs actual diverges | A slip announced early is a plan; a slip announced late is an apology |
| Post-ship retro | 30 minutes: what did the pressure teach us about estimates? | Turns every crunch into calibration data instead of trauma |

### Insider Moves You Won't Find in Tutorials

1. When everything is urgent, ask the killer question: "what happens if this slips by one week?" The answers are never equal — that asymmetry *is* the priority order, and stakeholders reveal it instantly.
2. Under deadline, always allocate 20% to the "unknown unknowns" buffer *out loud*: "I plan for 8 days, which includes buffer." Hiding the buffer inside optimism is how late happens.
3. Make the plan-B decision *before* the spike: "if we can't prove X in two days, we ship the 80% solution." Deciding in advance turns a potential crisis into a pre-agreed switch.
4. When blocked on a person, escalate *with* a draft: "I need Alice's decision on the API shape; here are the two options and my recommendation." Escalations that arrive pre-thought get answered same-day.
5. Learn the "knight move" under pressure: change the *problem* when the *solution* is stuck. Can we ship manual approvals instead of automated ones? Experts redefine the win; beginners grind.
6. Protect a daily shutdown ritual during crunches: write tomorrow's first task before leaving. Crunch burnout is a sequence of unended days; the ritual ends each one.

### Field Scenarios: How Experts Handle Real Situations

**Launch is Friday; Wednesday testing reveals the payment edge case: 2% of payments double-charge.**

- *What a beginner does:* All-nighter to "fix it properly" — arrives Friday with an untested 3am fix.
- *What an expert does:* Sizes the containment: is 2% acceptable if support can refund instantly? Ships Friday with the idempotency guard for the *known* trigger, a detection alert, and a documented refund runbook — then fixes the root cause next week with full testing. Risk is managed, not worshipped.
- *Why it matters:* Under deadline, professionals ship *contained* risk with a rollback and a monitor — not heroic all-nighter code nobody has reviewed.

**The task you promised for Tuesday is now realistically Thursday, and it is Monday.**

- *What a beginner does:* Works silently, hoping for a miracle, announces Thursday on Thursday.
- *What an expert does:* Announces Monday: "I will miss Tuesday — here is what I can deliver Tuesday (the API, no UI), and the rest Thursday. Does that work?" The early announcement converts a trust problem into a plan the team participates in.
- *Why it matters:* Bad news early is management; bad news late is betrayal — same facts, opposite outcomes.

**You have been stuck for 45 minutes on an environment issue before a demo.**

- *What a beginner does:* Keeps grinding — "I'm close" (you are not).
- *What an expert does:* The 45-minute rule: timebox, then switch to plan B (a recorded demo, a staging environment, a colleague's machine). The demo must happen; your pride in the environment fix is not on the agenda.
- *Why it matters:* The goal is the demo, not the environment; experts keep the goal visible above the obstacle.


### Expert Confessions: Mistakes Even Pros Make

- Protecting scope instead of the deadline *or* quality. Pick two of {scope, time, quality} consciously and say it aloud — silent scope-protecting is how both time and quality die together.
- Adding people to a late project (Brooks' Law). Nine women cannot make a baby in one month; experts know the real levers are scope and time, and use headcount only for *parallel new* work.
- Solving the interesting problem instead of the blocking one. The clever refactor is a sedative under deadline; experts do the boring fix first and schedule the interesting one.
- Heroic silence: suffering alone for days to "not bother anyone". Teams are damaged far more by surprises than by requests for help — asking early is a service, not a debt.

### A Day in the Life

A mid-level engineer faces crunch week: the client demo is Friday, and integration testing surfaced that the report export fails on accounts with >10k rows. Morning: a 15-minute triage with the PM — they agree the *demo* needs the export for the standard accounts (95%); big accounts get a "request by email" flow documented on screen. The Must-list is now three items, in writing, signed off in chat. Midday: a timeboxed spike on a streaming fix (2 hours max, plan B = row cap with a clear UI message) — spike succeeds partially, plan B ships with the message "exports over 10k rows are processed nightly — request here". Wednesday: demo rehearsal reveals a broken font on the client's browser; 20 boring minutes, fixed, no drama. Thursday night is *rest* by design — the crunch was managed by scope, not survived by caffeine. Friday demo lands. Retro on Monday: one line in the calibration log — "export scope was discoverable on day one; add 'largest real dataset' to kickoff checklists."

### The Hiring Manager's Lens

Interviewers manufacture constraint pressure deliberately: "you have two hours, ship one feature" or "the demo is in three days and X broke — what do you do?" The scoring rubric is rarely about the code; it watches for: triage before typing, scope-cutting proposals offered *by the candidate* (not extracted), early bad-news simulation ("when would you tell the team?"), and calm under an injected change ("the API is down — now what?"). Candidates who ask "what matters more: scope or date?" are exhibiting the exact judgement the interview exists to find.

### Your First Job, In Reality

Your first deadline crunch will feel existential; it is neither the first nor the worst anyone there has seen. The behaviours that get noticed in the crunch — and remembered for a year: you announced your slip before being asked, you proposed cutting something yourself, you asked for help within 45 minutes of being truly stuck. The behaviours that get quietly noted the other way: silent grinding, hidden buffer, scope protection with an all-nighter. Crunches are auditions; play them like one.

### Expert-Level Exercises

1. Take your current project and run the two-list exercise: write every remaining task, circle the five that actually change the outcome, and mark the rest "avoid until ship". Notice how much of your list is the B-list.
2. Run a MoSCoW pass on your next feature with a stakeholder (or a friend as one). Get the Must-list agreed *in writing* before starting. Note how many "requirements" quietly die on contact.
3. Practise the early-slip: next time you are even 10% behind, announce it with a recovery plan the same day you know. Keep a log of the reactions — you will never hide a slip again.
4. Set a 45-minute timer the next time you are stuck. When it rings, you must do one of: ask a precise question, switch approach, or change the problem. Track what happens over a month.

### Go Deeper

- "The Mythical Man-Month" by Fred Brooks — 50 years old and still the truth about deadlines and adding people.
- "The Goal" by Eliyahu Goldratt — the theory-of-constraints novel; triage thinking for systems and schedules.
- Dan Luu's "95%-ile isn't that good" and reach articles on practice — how expert judgement is actually built.
- "Essentialism" by Greg McKeown — the two-list discipline, expanded into a whole operating system for focus.

---

> **The 1% difference:** experts triage before they grind: they cut scope early, announce slips before being asked, timebox risky bets with a pre-agreed plan B, and treat asking for help as a move in the game — not a confession.
$exp_problem_solving$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'problem-solving'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: programming-fundamentals  (source: programming-fundamentals.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_programming_fundamentals$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners treat code as something you *write*. Experts treat it as something you *read*, *change*, and *delete*. Studies of real teams keep finding that engineers spend far more time reading and modifying existing code than typing new code — which is why "clever" code that reads badly is considered a defect by professionals, not a flex. State of JS surveys consistently show that a large share of professional codebases are typed, precisely because types are documentation that can't go stale: they tell the next reader what a function accepts without them opening it.

### How Professionals Actually Work

Before writing a function, an expert writes its **call site** — the line where someone will use it. If the call site reads badly, no amount of clever internals saves it. They name things from the caller's perspective (doesSendInvoice, not handleData), keep functions doing one thing at the level of the function's name, and when a function grows past ~40 lines they look for the *second* idea inside it and split. They also practise "make it work, make it right, make it fast" *in that order*: correctness first, clarity second, and performance only after measuring — because profiling almost always shows the hot spot is somewhere other than where intuition said.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Naming thesaurus habit | A deliberate vocabulary of domain words (invoice, ledger, retry, backoff) reused consistently | Consistent names turn a codebase into a searchable, predictable system |
| Rubber-duck explanation | Explaining your design out loud before coding it | The act of explaining surfaces flaws cheaply — before they cost a rewrite |
| Small pure functions | Functions with no hidden inputs/outputs (no globals, no mutation of arguments) | They are trivially testable and can be reordered, parallelised, and cached |
| Typing as documentation | Types (or JSDoc in JS) that describe inputs and outputs | Editors and teammates get instant, always-current documentation |
| Deletion reviews | Reviewing PRs with the question "what can be removed?" not only "what is wrong?" | The best experts measure themselves by how little code remains |

### Insider Moves You Won't Find in Tutorials

1. Write the error message first. Decide exactly what the user sees when your function fails, then build the happy path to make that failure rare — experts design the failure modes before the success path.
2. Keep a "changed my mind" log. When you rewrite an approach, write one line about why. Six months later, that line prevents you (or a teammate) from rewriting it back.
3. Prefer boring data structures. A plain array of objects that everyone understands beats a clever custom class that only you understand — experts optimise for the next reader, not for elegance.
4. Learn one keyboard-driven editor workflow (VS Code commands, multi-cursor, go-to-definition) until navigating code is faster than thinking about code. Speed of *navigation* compounds; speed of typing does not.
5. When debugging logic you do not understand, delete everything you can and rebuild the smallest version that still shows the bug. Experts shrink problems; beginners stare at them.
6. Read one well-known open-source file per week (not a whole repo — one file). Ask "why did they structure it this way?" — this is how vocabulary and taste are built.

### Field Scenarios: How Experts Handle Real Situations

**Your function works, but you cannot explain what it does in one sentence.**

- *What a beginner does:* Ships it, thinking "it works, that is what matters".
- *What an expert does:* Treats it as a design smell, renames it or splits it until the sentence exists — because every future teammate will pay the cost of that missing sentence.
- *Why it matters:* A function you cannot name cannot be searched, tested, or safely reused.

**You must choose between a clever one-liner and a clear five-liner.**

- *What a beginner does:* Picks the one-liner to look skilled.
- *What an expert does:* Picks the five-liner unless the one-liner is idiomatic in that language — then documents the idiom with a comment for readers who have not seen it.
- *Why it matters:* Code is a team asset; the cost of cleverness is paid by every future reader.

**A piece of logic keeps breaking in different places.**

- *What a beginner does:* Patches each break as it appears.
- *What an expert does:* Stops and finds the *invariant* — the rule that is true at all times — then enforces it in one place so the breaks become impossible instead of rare.
- *Why it matters:* Fixing symptoms multiplies code; enforcing invariants deletes whole classes of bugs.


### Expert Confessions: Mistakes Even Pros Make

- Optimising code that was never measured. Even senior engineers guess wrong about hot paths constantly; profiling data beats intuition every time.
- Writing "temporary" code that survives for years. The fix is not never writing throwaway code — it is marking it clearly (TODO + date + ticket) so it can be found and removed.
- Over-abstracting early. The classic junior-to-senior trap: three similar lines are often better duplicated once than abstracted wrong. Abstractions should be extracted from evidence, not invented from imagination.
- Skipping the boring fundamentals (naming, formatting, small functions) while chasing advanced topics. Senior code review rejects PRs for naming more often than for algorithms.

### A Day in the Life

A senior engineer at a Kigali fintech starts the day reading a PR from a junior teammate — 20 minutes of *reading* before any writing. They spend the morning refactoring a payment module: they rename four variables, extract two functions, and delete 60 lines. No features shipped, yet the diff is one of the week's most valuable contributions — every future change to that module is now cheaper and safer. The afternoon is a bug hunt: they reproduce the bug with a failing test first (so it can never silently return), then fix it. Before leaving, they write tomorrow's first task as a comment in the code they were mid-way through changing.

### The Hiring Manager's Lens

When interviewers give a take-home task, they often read your code *before* they run it. They are asking three silent questions: "Will I understand this at 2am during an incident?", "Will this person's PRs be easy or painful to review?", and "Do they name things the way our domain talks?" A candidate who submits a simple, obviously-correct, well-named solution routinely beats one with fancier algorithms hidden in unreadable code — at every level from internship to staff engineer.

### Your First Job, In Reality

In your first month on a real team, you will almost never design anything new. You will fix a bug in a file you have never seen, add a field to a form, and write one small function inside a 3,000-line module. The skill that makes seniors say "keep this one" is being able to say, in the team channel: "I traced the bug to line 212 of invoices.js — the tax is recalculated after the discount, here is a failing test" — not shipping something clever from scratch.

### Expert-Level Exercises

1. Take any function you wrote this week and rewrite its name, parameters, and return value so that reading *only the call site* explains the behaviour. If you need to open the function to understand a call, it failed.
2. Find the longest function in a project you own. Find the *two ideas* hiding inside it and split them. Run your tests before and after — nothing should change except readability.
3. Delete something. Find dead code, a duplicate branch, or an unnecessary abstraction, remove it, and confirm the tests still pass. Log how many lines you removed this week — experts track that number.
4. Explain one design decision from a project out loud (or to a rubber duck) for two minutes without notes. Anywhere you stumble is where your understanding is thin — that is your next study target.

### Go Deeper

- "A Philosophy of Software Design" by John Ousterhout — the clearest book ever written on why some code stays simple and other code rots.
- "The Pragmatic Programmer" (Hunt & Thomas) — DRY, orthogonality, and tracer bullets explained by two practitioners.
- State of JS annual survey (stateofjs.com) — free, data-driven view of what professional teams actually use; read it once a year to calibrate.
- Refactoring catalog at refactoring.guru — every move has a name; learning the names makes reviews 10x faster.

---

> **The 1% difference:** experts are not people who write harder code — they are people whose code costs the team *less*: less time to read, less time to change, less time to debug. Optimise for the reader and you will out-ship everyone optimising for the writer.
$exp_programming_fundamentals$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'programming-fundamentals'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: python-foundations  (source: python-foundations.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_python_foundations$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners write Python like translated Java: index loops, manual counters, everything in one file. Experts write *pythonic* code — comprehensions over loops where clarity survives, iteration directly over items (not `range(len(x))`), tuple unpacking, and truthiness ("if not items"). The second mark of experience: **environment discipline**. Professionals never install packages globally — every project gets a virtual environment from day one (python3 -m venv .venv), dependencies live in a pinned requirements.txt, and "works on my machine" bugs are structurally prevented rather than debugged. It is the habit that separates people who *use* Python from people who *ship* it.

### How Professionals Actually Work

They use the REPL and `python -i` as a lab: try the expression, check `type()` and `repr()`, then write the real code. They reach for the **standard library first** — `collections.Counter`, `itertools`, `pathlib`, `json`, `csv` — because the stdlib is tested, documented, and already installed; pip is for when the stdlib genuinely cannot. Naming follows PEP 8 (snake_case functions, PascalCase classes, UPPER_CASE constants) not because of pedantry but because Python's ecosystem reads uniformly — the language's superpower is that any Python file *looks* like any other. And they add `if __name__ == "__main__":` to every script from day one, so code is importable *and* runnable — the hinge on which testing and reuse swing.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Virtual environments (venv/uv) | Per-project isolated package installs | Ends dependency hell; makes projects shareable and reproducible |
| f-string debugging | print(f"{value=}") prints name *and* value | The fastest debugging habit in Python, zero tooling required |
| python REPL / -i flag | Interactive experimentation with your loaded script | Test an idea in 10 seconds before writing 10 lines |
| collections & itertools | Counter, defaultdict, deque, groupby, chain | Delete 10 lines of manual bookkeeping with one import |
| pathlib over os.path | Path("data") / "raw" / "file.csv" | Readable, cross-platform, composable path handling |

### Insider Moves You Won't Find in Tutorials

1. `python -m pip install ...` inside venvs (not bare pip) — guarantees the package lands in *this* interpreter, ending the classic "installed but ImportError" mystery.
2. Use `enumerate(items, start=1)` when you need the index — and *notice* that needing the index is usually a smell that a zip() or dict is cleaner.
3. Master one-liner dict patterns: `dict.fromkeys`, `{k: v for k, v in ... if cond}`, and `max(items, key=...)`. Sorting by multiple keys is `sorted(items, key=lambda x: (x.city, -x.age))` — the tuple trick replaces 20 lines.
4. Read tracebacks bottom-up: the last line is the error, the frame above it is *your* code most likely responsible. Tracebacks are not punishments; they are the most detailed error messages in any language — read them fully.
5. Keep scripts importable: logic in functions, the runner under `if __name__ == "__main__":`, and constants at top. This one structure makes every script testable for free.
6. Use `python -m json.tool data.json` (and friends: -m http.server, -m venv, -m timeit) — Python ships a pocket-knife of tiny servers, formatters, and profilers most users never open.

### Field Scenarios: How Experts Handle Real Situations

**The script runs on your laptop, crashes on a teammate's machine.**

- *What a beginner does:* Adds "pip install everything" to the README and hopes.
- *What an expert does:* Freezes reality: requirements.txt pinned to the versions that work, venv instructions as three commands, and — five minutes spent now — a one-line check script that verifies the versions before the crash can happen.
- *Why it matters:* Reproducibility is a deliverable, not a courtesy; unrepeatable analysis is unreviewable analysis.

**A data file has 2,000 rows and the script takes 90 seconds.**

- *What a beginner does:* Rewrites the whole thing "for performance" with clever tricks.
- *What an expert does:* Times the parts (timeit, or a quick cProfile run), finds it is one regex recompiled per row, compiles it once — 90 seconds becomes 4. Then stops. Measured fixes; no speculative optimisation.
- *Why it matters:* Profiling beats intuition; most "slow Python" is one hot line, not the language.

**You need to merge two lists of dicts by ID and count duplicates.**

- *What a beginner does:* Nested loops with counters and edge-case flags (30 lines, probably buggy).
- *What an expert does:* Counter for the counts, dict comprehension for the merge, and done in six readable lines using stdlib pieces whose edge cases are already solved by people smarter than both of us.
- *Why it matters:* The stdlib is 30 years of edge cases pre-solved; reaching for it first is the pythonic habit.


### Expert Confessions: Mistakes Even Pros Make

- Mutable default arguments: def add_item(item, items=[]) — the list is created *once* and shared across every call. The classic Python footgun; the fix is None-default + create inside.
- Bare except: pass. It swallows every error including KeyboardInterrupt, making bugs invisible; experts catch the *specific* exception and let everything else crash loudly.
- pip install globally "just to try it". Six months later nothing installs cleanly anywhere. venv from minute one — it costs 15 seconds.
- Treating floats as money (same trap as every language) and trusting == on floats: use math.isclose for comparisons, Decimal or integer cents for currency.

### A Day in the Life

A junior data analyst starts the morning in the REPL, testing the CSV parsing idea on 10 rows before writing the script — `python -i` with the file loaded. The script grows in the project's venv; a new dependency (openpyxl) goes into requirements.txt immediately with a comment on why. Mid-morning, the weekly report script crashes on a row with an empty date — the traceback is read bottom-up, the fix is a guard clause with a clear comment, and a test is added using a 5-row fixture file so the bug cannot return. After lunch: the report is refactored — print statements become a small function returning a dict (now importable by next month's dashboard). Before leaving, they run the whole thing once from a clean venv to prove the README's three install commands actually work — because a teammate will try them tomorrow.

### The Hiring Manager's Lens

Python screens test idiom and hygiene, not trivia: "read this code and simplify it" (are comprehensions applied? does range(len()) disappear?), "your script fails on another machine — walk me through it" (venv? pinned requirements? traceback read correctly?). For data roles, pandas questions replace loops — but the senior tell remains: they profile before optimising and they *read the traceback* before googling. A candidate who mentions virtual environments unprompted is signalling they have shipped something real, because nobody who has shared a broken environment forgets.

### Your First Job, In Reality

In your first months, Python is the glue job: rename 3,000 files, clean a CSV that "someone else's system" produced, scrape a page, schedule a report. These unglamorous scripts are where pythonic habits compound — pathlib, comprehensions, venvs, argparse — and where your reputation as "the person who automates things" is built. The career secret of Python: it is the language of *leverage*; the colleague who turns a 3-hour weekly task into a 3-minute script gets remembered at promotion time.

### Expert-Level Exercises

1. Take any old script of yours and pythonise it: kill every range(len()), add comprehensions where they improve clarity, switch os.path to pathlib, and put the runner under if __name__ == "__main__". Diff before/after and count the deleted lines.
2. Create a project from scratch the professional way: venv → requirements.txt with two pinned packages → a script with argparse → README with 3 install commands → verify from a *fresh* venv. Keep this skeleton forever.
3. Find the slowest loop in your code. Measure with timeit, fix the one hot line (compile the regex, join the strings, precompute the lookup), re-measure, and record the ratio.
4. Deliberately trigger three classic bugs and read the tracebacks fully: a NameError from a typo, a KeyError from a dict, and a TypeError from None. Practise narrating what each traceback says before looking at the code.

### Go Deeper

- "Fluent Python" by Luciano Ramalho — the book that turns Python users into Python programmers; read slowly, a chapter a week.
- PEP 8 and the "Zen of Python" (import this) — the taste document of the language, 19 lines.
- "Automate the Boring Stuff with Python" (free online) — the practical bible for glue-job Python.
- Python docs: "Data Structures" and "itertools" tutorials — the stdlib tour that replaces half your pip installs.

---

> **The 1% difference:** experts write Python that reads like Python: comprehensions, stdlib first, venv always — and they treat tracebacks as the detailed, polite error reports they are, reading them fully before touching a line of code.
$exp_python_foundations$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'python-foundations'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: reading-codebases  (source: reading-codebases.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_reading_codebases$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners read code like a novel, top to bottom, and drown. Experts read it like detectives following leads: start where the behaviour is *visible* (the route, the UI component), follow the call chain upward to the logic, and treat **git history as the primary source** — `git log -p src/payments/` tells you why the code looks the way it does (look for "re: ticket #482" and "revert retry logic" — those are stories). They also read the *tests first* in any unfamiliar module: tests are executable documentation of intended behaviour, and a module's test file is the fastest honest summary of what it does and what it protects.

### How Professionals Actually Work

Before changing anything in a codebase they did not write, experts run a cheap reconnaissance: (1) run the test suite — does it even pass today? (2) find the module's tests and read them, (3) `git blame` the three functions they intend to touch — recent blame means active area, ancient blame means sacred code, (4) make the change behind a test, keeping the diff as small as the task allows. They follow the **Boy Scout rule** — leave code a little cleaner than found — but with discipline: cleanup is either *in* the change (tiny, related) or a separate labelled PR, never a sneaky rewrite inside an unrelated feature PR. And in open source, they read CONTRIBUTING.md and recent merged PRs *before* writing code — the fastest way to learn a project's real standards.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| git log -p / git blame | Per-line history and full patch history of any file | Turns "why is this code weird?" into "because of ticket #482 in 2023" — every weirdness has a story |
| Test files as documentation | Reading the tests of a module before its implementation | Executable spec: shows intended behaviour, edge cases, and what the authors were worried about |
| Call-hierarchy navigation | IDE "find usages" / go-to-definition to walk the call chain | Entry point → route → service → data: experts navigate, not scroll |
| TODO/FIXME archaeology | Grepping TODOs with dates and names | A TODO with a date is a decision deferred; a TODO without one is a trap |
| Small-diff PRs | One concern per PR, under ~400 changed lines when possible | The unit of review; also the unit of safe revert |

### Insider Moves You Won't Find in Tutorials

1. Trace one request end-to-end with a debugger instead of reading for an hour: put a breakpoint at the route, click the button, and watch the call stack unfold. Twenty minutes of stepping teaches more than two hours of scrolling.
2. Read the *reverted* commits: `git log --diff-filter=M --reverse` and search for "revert". Reverts mark landmines — someone tried this before and it failed; learn why for free.
3. In a new repo, find the "core domain" file (the one everything imports) and read it fully once. Everything else is decoration around it.
4. When contributing to open source, start with docs, tests, or a "good first issue" *you verify is still valid* — stale first-issues are how newcomers get ignored.
5. Write the "orientation memo" when you finish onboarding to a new codebase: where things live, how to run it, three gotchas. It cements your learning and instantly makes you valuable to the next hire.
6. Never refactor and change behaviour in the same PR. Reviewers can verify a mechanical move at a glance; they must re-verify a move *plus* a change — and they will reject it on principle.

### Field Scenarios: How Experts Handle Real Situations

**Assigned a bug in a 200,000-line codebase you have never seen.**

- *What a beginner does:* Reads files "near" the bug name and guesses.
- *What an expert does:* Reproduces first (or finds the test that covers it), then walks *backward* from the symptom: which endpoint/function produced the wrong output? Sets a breakpoint there and inspects inputs. Only reads the code on the actual path taken.
- *Why it matters:* Reading everything is impossible; the execution path is a filter that deletes 99% of the codebase.

**The function you must modify is 300 lines with no tests.**

- *What a beginner does:* Rewrites it "cleanly" in the same PR as the bug fix.
- *What an expert does:* Characterises it first: writes tests that pin down *current* behaviour (including the weird parts), locks them green, then makes the change. If a rewrite is warranted, it is a separate reviewed PR with the safety net already in place.
- *Why it matters:* Uncharacterised refactors are how "cleanups" introduce the bugs that get pages at night.

**Your PR touches a file another PR also touched; both are open.**

- *What a beginner does:* Merges first and lets the second person resolve the mess.
- *What an expert does:* Pings the other author early, agrees who rebases onto whom, and coordinates the rebase before either merges. Two minutes of talking saves an afternoon of conflict resolution.
- *Why it matters:* Merge conflicts are social problems with a technical surface.


### Expert Confessions: Mistakes Even Pros Make

- Refactoring as you go, invisibly, inside feature PRs. Reviewers cannot tell what is new behaviour vs moved code; the PR gets rejected or, worse, approved unread.
- Assuming weird code is stupid code. It is usually load-bearing: a timezone bug, a race, an old customer's edge case. Experts ask git history *before* "fixing" it.
- Not asking questions early. The expensive mistake is two days of silence followed by "I was stuck"; seniors ask precise questions after a genuine 30-minute attempt ("I found X, expected Y, tried Z — is my assumption about the auth flow right?").
- Reading documentation instead of the code when they disagree. Docs rot; code and its tests are the truth. When they conflict, believe the tests and file a docs issue.

### A Day in the Life

An engineer joins a fintech codebase (120k lines) as the newest hire. Day one: repo running locally in two hours, then they write the orientation memo while it is fresh. Day two: first ticket — a rounding bug in loan interest. They find the test file first (interest.test.js, 40 cases — the domain explained), then `git blame` the interest function: last touched eight months ago with message "re: CBK rounding directive" — the weirdness is *regulatory*. They add a failing test reproducing the reported case, discover the bug is a floating-point comparison (0.1 + 0.2), fix with integer basis points, and open a 60-line PR: failing test, fix, one comment citing the directive. The reviewer approves in an hour with "best first PR this quarter" — not because of brilliance, but because the diff told a complete story.

### The Hiring Manager's Lens

The "read this codebase and fix this bug" interview is the most predictive screen there is — and it is graded on process, not speed: Does the candidate run the tests first? Find the entry point or read randomly? Form hypotheses or shotgun? Candidates who narrate ("I expect the bug to be in validation because the error message says 422...") score highest — thinking out loud is the job. For open-source contributions, reviewers read your *PR conversation* as much as the code: polite, precise, responsive-to-feedback is the whole reputation system.

### Your First Job, In Reality

Realistically: months one through three are 90% reading, 10% writing. That ratio is not a bug in your job — it is the job. The compound habit that separates fast risers: keep a personal "codebase map" file (routes → services → tables, with one line each). By month three you will have the map juniors take a year to build, and you will be the one answering the next hire's questions — which is precisely when seniors start treating you as staff.

### Expert-Level Exercises

1. Pick a mid-sized open-source repo you admire. Without running it, answer: where is the entry point, where are the core domain objects, and where are the tests? Verify by running. Repeat monthly with a new repo.
2. Take a function you are about to change and run `git log -p` on it. Write two sentences on why the code looks the way it does. If you cannot, you have found your first real question for the team.
3. Find the oldest TODO in your codebase. Investigate: is it still relevant, done, or a landmine? Report back in one paragraph — this is archaeology, the actual job.
4. Make one contribution to an open-source project this month: a doc fix, a failing-test report, or a tiny PR. The full cycle (issue → PR → review → merge) is a career skill no tutorial teaches.

### Go Deeper

- "Working Effectively with Legacy Code" by Michael Feathers — the canon on changing code without tests; characterisation tests are the core technique.
- "Software Engineering at Google" ch. 16-19 (free online) — how a giant org handles codebase health and ownership.
- The code-review chapter of any mature CONTRIBUTING.md (e.g. Kubernetes, React) — reading a great project's rules is a masterclass.
- Dan Luu's essays (danluu.com) on code review and technical hiring — practitioner wisdom with receipts.

---

> **The 1% difference:** experts treat an unfamiliar codebase as a crime scene: tests and git history are the witnesses, the execution path is the trail, and every weird line has a story — find the story before you touch the line.
$exp_reading_codebases$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'reading-codebases'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: robotics  (source: robotics.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_robotics$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners build robots that work on the desk and die on the floor. Experts know the difference is **power and timing**: 90% of "my robot goes crazy" is electrical (motors brown-out the microcontroller when they kick in, sensors share noisy ground) and 9% is blocking code. So the professional habits are electrical first: motors on their own supply (never the Arduino 5V pin), **common ground** between every board and battery, capacitors across motor supplies, and a brown-out detector (built into the chip — make sure it is enabled) so the MCU resets cleanly instead of doing something mad when voltage sags. The timing habit: production firmware never uses `delay()` — it runs a **state machine on millis()**, because a blocked loop cannot read sensors, and a robot that cannot read sensors is a missile.

### How Professionals Actually Work

They calibrate before every meaningful run: sensor thresholds are measured on *today's* track under *today's* light (a line follower tuned yesterday is a coin flip today), and the calibration numbers live in one place at the top of the sketch — named constants, not magic numbers buried in logic. Their loop structure is always the same shape: read inputs → update the state machine → drive outputs → repeat, with every non-blocking timer as a comparison against millis(). They also debug by **signal, not by hope**: a test LED blinked in key states, Serial prints at every decision point (with a marker like [IR] or [SONAR] so the stream is readable), and the loop period printed occasionally — because "how long does one loop take?" is the question that exposes every timing bug.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| millis() state machines | Non-blocking timing: scheduled actions via millis() comparisons | The loop never blocks; sensors are always being read — the difference between a toy and a robot |
| Watchdog timer | Hardware timer that resets the MCU if the loop hangs (wdt_enable) | A hung robot stops; a watchdog robot recovers. Professionals ship recovery, not perfection |
| Multimeter discipline | Voltage checks before, during, and after wiring changes | 5 minutes of measuring replaces hours of "why is the servo twitching" |
| Named calibration constants | THRESHOLD_LEFT = 512, not "512" buried mid-sketch | Re-tuning takes minutes, not archaeology; magic numbers are how bugs hide |
| Serial state tracing | Bracketed prints at every state change ([SEARCH] → [ATTACK]) | You can watch the robot *think*; mysterious behaviour becomes a readable log |

### Insider Moves You Won't Find in Tutorials

1. Wire the common ground first, every single build: battery negative, motor-driver ground, and Arduino ground joined at one point. Half of all "random" resets and sensor lies are floating or missing grounds.
2. Power the servo/motor rail separately and add a big electrolytic capacitor (470-1000µF) across it — servos cause voltage dips on startup that reset the whole board; the cap absorbs the kick.
3. Write the state machine on paper before the code: boxes (IDLE, SEARCH, FOLLOW, AVOID) and arrows (what event moves you between states). If the diagram is wrong, the code will be too — but the diagram is cheap to fix.
4. Blink a status LED per state (slow blink = searching, fast = tracking). Then watch the robot from across the room and *know* what it is thinking without a laptop attached.
5. Read sensors N times and take the median, not the average: an ultrasonic reading of 3cm between two 200cm readings is a spike; the median ignores it, the average believes it.
6. Log the battery voltage in the loop (a simple divider on an analog pin). "Robot behaved oddly" almost always correlates with "battery hit 6.8V" — pros prove it, beginners argue about it.

### Field Scenarios: How Experts Handle Real Situations

**The robot works perfectly on the bench, then resets every time the motors engage on the floor.**

- *What a beginner does:* Rewrites the code, convinced it is a software bug.
- *What an expert does:* Measures: multimeter on the 5V rail while motors start shows the dip. Fix is electrical — separate motor supply, common ground, capacitor across the motor rail. The code was never wrong; the power was.
- *Why it matters:* Motor startup current sags the shared supply; a brown-out reset mid-run looks exactly like a software crash.

**The line follower tracks perfectly for 10 seconds, then loses the line and spins.**

- *What a beginner does:* Raises the speed or moves the sensors "a bit" and re-tests blindly.
- *What an expert does:* Prints the sensor values during the failure and finds the drift: after 10 seconds the motors heat up, battery sags, and the LED-emitter current drops — so the "black" threshold is wrong. Fix: recalibrate against battery voltage, or lower speed, and log voltage to confirm.
- *Why it matters:* Robots are systems; a symptom that appears *with time* is usually power or heat, not logic.

**The obstacle avoider occasionally drives straight into the wall.**

- *What a beginner does:* Increases the avoid distance and hopes.
- *What an expert does:* Adds loop-period printing and discovers a 350ms blocking Sonar-pulseIn wait combined with a delay() elsewhere — the robot is blind for a third of every second. The fix is the state machine rewrite: every wait becomes a millis() comparison, the loop drops to 2ms, and the wall never wins again.
- *Why it matters:* A blocked loop is a blind robot; timing bugs disguise themselves as sensor bugs.


### Expert Confessions: Mistakes Even Pros Make

- Powering motors from the Arduino 5V regulator. The regulator supplies ~500mA; a single stall draws 1-2A and browns everything out. Separate supply + common ground, always.
- Trusting one sensor reading. Ultrasonic and IR readings are noisy; pros read-and-median, and treat any single absurd value as noise rather than truth.
- Tuning code on a dying battery. Half of all "it behaved differently today" mysteries are voltage; check the pack before rewriting working code.
- Skipping the failsafe: what does your robot do when it *loses* the line or *stops seeing* the wall? Pros define the default state (stop, search, or slow) on purpose — the default behaviour is a design decision, not an accident.

### A Day in the Life

A robotics club mentor runs the pre-build ritual with a student team: multimeter across the battery (8.1V — good), common ground verified by continuity beep, motor supply on its own pack, capacitor seated. Then calibration: white paper reads 820, black tape reads 340, threshold set to 580 and written as a named constant at the top of the sketch. First run: the robot finds the line, follows three corners, then wobbles off on the second straight. The debug: Serial shows [FOLLOW] with sensor values 810/815/820 — the robot is *blind*; the IR emitter wire has shaken loose on the bump of corner two. Ten minutes, one connector re-seated, and — the pro step — a hot-glue dot on the connector so vibration cannot undo it again. Second run: clean lap. The debrief sentence the mentor wants the team to remember: "we didn't change any code; we trusted the signals over the story."

### The Hiring Manager's Lens

Robotics and embedded interviews (internships, labs, competitions) probe the two instincts: electrical hygiene ("where do the grounds meet?", "what happens to 5V when the motor stalls?") and timing discipline ("why is delay() banned?", "walk me through your state machine"). Candidates who mention watchdogs, calibration routines, and voltage logging sound like people who have *finished* robots — because those habits only form after builds have failed. Portfolio tip: a video of the robot working is table stakes; a write-up of one failure and its diagnosis ("it resets when motors kick — here is the scope trace") is what gets you remembered.

### Your First Job, In Reality

Your first real embedded task will be "make it reliable" on someone else's half-working robot or device — and reliability in this field is a checklist, not a talent: separate supplies, common ground, brown-out enabled, watchdog on, no delay(), medians on sensors, calibration constants named, voltage logged. Work the checklist before touching anything clever; half the time the device simply starts working, and you will have learned the field's most important secret: experts are not luckier — they are *systematic*, and the checklist is the system.

### Expert-Level Exercises

1. Rewrite any delay()-based sketch of yours as a millis() state machine with a paper diagram first. Then add one task that was previously impossible — reading a button while blinking — and feel why delay() had to go.
2. Add the reliability checklist to a working robot: watchdog enable, brown-out verify (burn the fuse setting on AVR), battery-voltage logging, and a per-state status LED. Test each one by simulating its failure.
3. Deliberately create the classic brown-out: power a motor and MCU from one supply and watch the reset. Then fix it properly (separate supply + cap + common ground) and document before/after with the multimeter.
4. Build a calibration mode into your line follower: on startup, sample white and black for 3 seconds, compute and store the threshold, and print it. Race yesterday's hardcoded version against it — the difference is why pros calibrate.

### Go Deeper

- Arduino docs: "Bare Minimum Code" and the millis() timing tutorials — then Nick Gammon's legendary forum posts on interrupts, watchdogs, and power (gammon.com.au).
- "Practical Electronics for Inventors" (Scherz & Monk) — the reference for the electrical half of robotics.
- The ATmega/ESP datasheet sections on brown-out detection and watchdog timer — reading the actual chip docs is the line between hobbyist and engineer.
- James Bruton and Andrey Sporykhin-style build logs on YouTube — watch *how* experienced builders diagnose failures, not just what they build.

---

> **The 1% difference:** experts respect the two invisible forces — power and time: separate supplies with a common ground, no blocking code, watchdogs on, sensors medianed, calibration named and logged — and their robots finish the race because the boring things were done first.
$exp_robotics$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'robotics'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: system-design  (source: system-design.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_system_design$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners jump straight to components — "I'd use Redis, Kafka, Kubernetes" — which is naming solutions before naming problems. Experts start with **requirements and numbers**: How many users? Reads vs writes ratio? How much data per year? What latency is acceptable, and what is *unacceptable* (that is your SLO)? A back-of-envelope on a napkin — 100,000 reads/day ≈ 1.2 reads/second average, 10x peak — reframes the entire conversation: most "scaling problems" are solved by one well-chosen index and a cache, and saying so confidently is the mark of an expert. The other tell: experts name **trade-offs** explicitly ("this choice buys latency at the cost of consistency for five minutes") instead of pretending any design has no costs.

### How Professionals Actually Work

The professional sequence is always: (1) clarify functional and non-functional requirements, (2) estimate scale so the data tier is sized before anything else, (3) draw the boring version first — a single app server, one database, a load balancer — because it is genuinely the right architecture below ~10,000 users and every later step is a *measured* response to a real bottleneck, (4) identify the actual bottleneck (usually the database, sometimes the network), (5) apply the smallest fix that removes it: index, cache, read replica, queue, shard — in that rough order of preference. Complexity is bought, never collected.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Back-of-envelope math | QPS, storage, and bandwidth estimates from one-line assumptions | Sizes the system in minutes; kills over-engineering before it starts |
| Caching layers | Redis/CDN in front of expensive reads, with TTLs and invalidation rules | The highest-leverage performance tool — and the source of the freshest bugs when done casually |
| Message queues | Kafka/RabbitMQ/SQS between producers and slow consumers | Absorbs spikes, isolates failures, and turns "must respond now" into "must eventually be done" |
| SLOs & error budgets | A target like 99.9% availability = 43min/month budget | Turns "is it reliable enough?" into a number teams can act on |
| Horizontal vs vertical scaling | Adding machines vs adding size | Experts scale vertically first (boring, cheap) and horizontally when the data demands it |

### Insider Moves You Won't Find in Tutorials

1. Cache the *read path* first and invalidate on write with a short TTL. The cache-invalidation rabbit hole is real, so experts start with "cache for 60 seconds" and only get fancier when the data proves it.
2. Put a queue between anything bursty and anything slow (emails, PDFs, webhooks, video processing). The request returns 202 immediately; the worker chews at its own pace; spikes stop being outages.
3. Design idempotent consumers from day one: the same queue message *will* be delivered twice someday, and the consumer must survive it (dedupe key or upsert).
4. Read replicas solve read-heavy load cheaply — but only after you know the reads are actually the bottleneck (measure!). Writes still go to one primary; replication lag becomes your new consistency question.
5. Add a "degrade gracefully" mode: if recommendations are down, the page shows bestsellers instead of an error. Experts design the fallback *before* the failure, not during it.
6. Write the runbook as you design: every component in the diagram gets a line — "if this dies, what does the user see, and what do I do?" A design without that column is unfinished.

### Field Scenarios: How Experts Handle Real Situations

**The API times out every day at peak (18:00-19:00).**

- *What a beginner does:* Suggests microservices and Kubernetes to "scale".
- *What an expert does:* Measures first: is it CPU, DB connections, or a specific slow endpoint? Finds 80% of peak load is one unindexed dashboard query, fixes the index, and puts the remaining spike behind a queue. Never mentioned a container orchestrator.
- *Why it matters:* Architecture changes are the most expensive tool in the box; experts reach for them last.

**The flash-sale launch will bring 50x normal traffic.**

- *What a beginner does:* Hopes autoscaling handles it.
- *What an expert does:* Runs the numbers: 50x on a system at 5% peak capacity is fine; at 40% it is an outage. Pre-scales, queues non-critical writes, enables a static fallback page, and rehearses the runbook in a staging load test at 60x.
- *Why it matters:* Load you have never rehearsed is load you have never handled.

**Two microservices must stay consistent when an order is cancelled.**

- *What a beginner does:* Designs a distributed transaction across both services.
- *What an expert does:* Asks the product question first: does inventory need to know in *milliseconds* or *minutes*? Almost always "minutes" — so an event ("order.cancelled") with an idempotent consumer and a reconciliation job is simpler, safer, and debuggable.
- *Why it matters:* Most "consistency" requirements are actually latency requirements wearing a suit.


### Expert Confessions: Mistakes Even Pros Make

- Adopting microservices because a big company blog post did. Microservices trade code complexity for operational complexity; teams under ~15 engineers usually buy pain with no benefit. Experts can *defend* monolith-first with numbers.
- Premature sharding. Sharding multiplies every operational problem (migrations, backups, joins) — experts exhaust indexes, caching, and read replicas first, and can explain the exact threshold that would change their mind.
- Designing for imaginary scale ("what if we get a million users?") while the current system has 40. The expert designs for today with clean seams, so tomorrow's change is cheap.
- No single-writer discipline: letting two services write to the same table without an owner. Data corruption follows; experts assign each dataset one writer and make everyone else read or ask.

### A Day in the Life

A senior engineer spends the morning in a design review: a teammate proposes Kafka for a new notification feature. They ask two questions — "what QPS?" (80/day) and "what happens if it is down for an hour?" — then suggest Postgres + a cron worker for now, with the queue seam left clean for later. Nobody is offended; the math did the talking. After lunch they review the week's error budget: 99.95% achieved, 20 minutes of budget spent, no action needed. Then a capacity conversation: the orders table hits 500GB in eight months at current growth — they propose partitioning by month *then*, and a data-retention policy now. The day's output: one avoided microservice, one retained budget, one future disaster pre-solved.

### The Hiring Manager's Lens

System design interviews are won in the first five minutes: candidates who ask "who are the users, what is the read/write ratio, what latency is acceptable?" instantly separate from candidates who start drawing boxes. Interviewers score the *journey*: requirements → estimates → boring design → bottleneck analysis → trade-off articulation. Saying "I would not shard yet, and here is the number that would change my mind" scores higher than any buzzword architecture. The silent test: do you say "it depends" and then *say what it depends on*?

### Your First Job, In Reality

Juniors do not design systems alone — but they *observe* them. The career accelerant in year one: for every incident and every design doc, ask "what was the bottleneck, and how did we know?" Within months you will have a mental library of failure patterns (thundering herd, retry storms, connection pool exhaustion) that no course can teach as vividly. Your first design contribution will be small — a caching decision, a queue for one job — and writing its trade-offs down in the PR is how seniors spot you.

### Expert-Level Exercises

1. Estimate a real product you use: users/day, reads and writes per user, storage per year. Then compute average and peak QPS. You have just done the step most candidates skip.
2. Take your current project and write its "boring architecture" on one page: single app, one DB, one cache. List the first three bottlenecks you would hit at 10x, 100x, and 1000x — and the *measured* signal that would tell you each had arrived.
3. Add a queue to one slow operation in your app (email, PDF, report). Return 202 immediately, process in a worker, and make the consumer idempotent. Test it by delivering the same message twice.
4. Write a 10-line runbook for your app's worst-case failure ("database down"): what users see, what you do first, how you verify recovery. A design is not done until this exists.

### Go Deeper

- Google SRE book, chapters on SLOs and "Addressing Cascading Failures" (free at sre.google) — the production backbone of design thinking.
- "System Design Interview" by Alex Xu — the standard interview preparation, and honest about trade-offs.
- donnemartin/system-design-primer (GitHub) — free, deep, with back-of-envelope reference tables.
- "Designing Data-Intensive Applications" by Martin Kleppmann — the single best book on how real data systems behave under failure.

---

> **The 1% difference:** experts design from requirements and numbers, ship the boring architecture first, buy complexity only when a measured bottleneck demands it — and can articulate the trade-off of every choice, which is what "senior judgement" actually means.
$exp_system_design$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'system-design'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: tech-in-business  (source: tech-in-business.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_tech_in_business$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners collect apps — one for sales, one for receipts, one for stock, one "just to try". Experts run on **one source of truth**: a single place (a Google Sheet, a POS, or a simple system) where every sale, expense, and stock movement lands *the same day*, because a business that cannot answer "how much profit did I make last month?" by the 5th is guessing, not managing. The second difference: experts treat money messages with a **verification reflex** — no transaction logic ever happens because of a text message. "You have received 50,000 RWF" followed by "please refund to this new number" is the classic MoMo scam pattern across East Africa; professionals confirm on the *official* app (not the SMS) before shipping goods, always.

### How Professionals Actually Work

Their digital routine is a habit stack, not a tool collection: morning (10 minutes) — check Google Business Profile messages and reviews, reply to every WhatsApp message from yesterday, post one Status; evening (10 minutes) — every sale of the day entered in the record, cash counted against the record, tomorrow's stock gaps noted. Weekly (30 minutes) — reconcile MoMo/Airtel statements against sales records, review which products made actual profit (not just revenue), and one marketing action. Monthly — download and file mobile money statements (they are also your accounting and loan-qualification documents), review the Insights dashboard, and prune: delete or stop using any tool that did not earn its keep. Businesses die from tool sprawl and unreconciled cash; the routine is the moat.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| One source of truth (Sheet or POS) | Every sale, expense, and stock movement in one place, updated daily | You cannot manage what you record twice, differently, in three apps |
| Official-app verification | Confirming every payment in the MoMo/Airtel app — never by SMS alone | SMS can be faked; balances and transaction IDs in the app cannot |
| Daily reconciliation habit | Count cash + check mobile money balance vs your records, every evening | Shrinkage and errors are caught at day 1, not month-end — when they are still findable |
| WhatsApp Business catalogs + labels | Product catalog, price list, and labelled customer chats (New, Paid, Delivered) | Free CRM in the app every customer already has |
| Monthly statement downloads | PDF exports of MoMo/Airtel/bank statements, filed by month | Loan applications, tax time, and fraud disputes become 5-minute jobs |

### Insider Moves You Won't Find in Tutorials

1. The 3-question payment protocol for any phone instruction: (1) Did the money actually arrive — checked in the *app*, not the SMS? (2) Did I initiate or expect this? (3) When in doubt, call the customer on their *known* number — never one supplied in the message. This kills 100% of refund/overpayment scams.
2. Photograph every delivery handoff (item + customer + date visible). Disputes — "I never received it" — are ended by a photo in seconds; this habit saves its weight in gold monthly.
3. Set your WhatsApp Business "away" message with prices and hours — 80% of messages are "how much?" and can be answered while you sleep.
4. Price from your data, not your fear: your records show which products carry 40% margin and which drag at 8%. Raise or kill the 8% ones — most small businesses have 2-3 products quietly subsidising the rest.
5. Ask every new customer "how did you find us?" and write the answer in one column. After 30 entries you will know exactly which marketing effort earns money — stop guessing, start doubling down.
6. Back up the business brain: photos of receipts to one Drive folder weekly, contacts synced, and a one-page note of your logins stored safely. The phone is replaceable in 24 hours; the records are not.

### Field Scenarios: How Experts Handle Real Situations

**An SMS says you received 100,000 RWF, then a call: "sorry, wrong amount — please send back 90,000 and keep 10,000 for your trouble."**

- *What a beginner does:* Checks the SMS (looks official), sends the "refund".
- *What an expert does:* Opens the official app: no transaction exists. Blocks the number, reports via the operator's fraud line. Rule internalised: money that is not in your app balance does not exist, no matter what any message says.
- *Why it matters:* The fake-deposit-refund scam is the most common mobile money fraud against small businesses in East Africa; the app check defeats every variant.

**Sales are steady but money is always short at month-end.**

- *What a beginner does:* Concludes "the business isn't working" or cuts random costs.
- *What an expert does:* Pulls three numbers from the records: who owes you (receivables), what you owe (suppliers, MoMo loans), and which products actually make margin. Finds 400,000 RWF in uncollected customer debts and two zero-margin products — cash was there all along, trapped.
- *Why it matters:* Most "cash flow problems" in small business are *data* problems: debts, margins, and timing invisible because nothing is reconciled.

**A competitor runs Instagram ads and seems to be winning.**

- *What a beginner does:* Panics, spends the week trying TikTok.
- *What an expert does:* Checks their own 30-day "how did you find us?" column first. If customers come from WhatsApp referrals and Google Maps, they double down *there* (ask 5 more happy customers for reviews this week) instead of renting attention on a platform where their customers are not.
- *Why it matters:* Experts compete on their own data; following another business's channel is marketing by rumour.


### Expert Confessions: Mistakes Even Pros Make

- Mixing business and personal money in one account/wallet. Every expert separates them — even just a second MoMo number — because mixed money makes profit invisible and tax time a nightmare.
- Recording sales "later". Later never comes; the sale that is not written down the same day is statistically already lost.
- Confusing revenue with profit: 500,000 RWF of sales with 480,000 of stock cost and transport is a 20,000 month. Experts track cost of goods *per product*, weekly.
- Trusting one channel entirely (only WhatsApp, only foot traffic). Experts build at least two discoverable channels — typically Google Maps + WhatsApp — so one outage or policy change cannot erase the customer pipe.

### A Day in the Life

A shop owner in Kicukiro opens at 7:30 and spends the first 10 minutes with the routine: three Google reviews to reply to (one negative — a delivery delay — answered with an apology and a phone number, moved offline), two WhatsApp catalog orders accepted with payment confirmed *in the app* before packing, and one Status posted (this morning's fresh stock). Mid-morning a customer pays 45,000 via MoMo for a bulk order; the amount lands in the app but the caller asks to "send 5,000 back for the courier" — the 3-question protocol fires, no refund, the number is blocked and reported. Evening: 12 minutes — 23 sales entered, cash counted (matches), one stock gap noted (cooking oil, reorder Thursday), tomorrow's two deliveries photographed and scheduled. Weekly tomorrow: reconcile MoMo statement, review margins (matches are losing money — price up or drop), ask three regulars for reviews.

### The Hiring Manager's Lens

Hiring tech help as a small business is its own skill — and experts screen for it: pay for small proven work first (a one-page site, a working order form) before any big build; ask for *maintenance* terms and a monthly cost in writing; check one past client by calling them. The other direction matters too: freelancers and agencies screen *you* — businesses with their records in one place, decisions in writing, and prompt payment get better developers at better prices, because they are low-drama clients.

### Your First Job, In Reality

The first month of running your business "on data" feels slower — entering sales nightly, photographing deliveries, reconciling weekly — and then the compounding starts: you reorder stock *before* it runs out (because the sheet said so Tuesday), you price the loss-makers up, you catch a fake payment in seconds. By month three you make decisions in minutes that used to take anxious evenings. That is the actual product of this course: not apps, but a business that answers its own questions.

### Expert-Level Exercises

1. Run the 3-question payment protocol on your *last five* mobile money transactions — check each in the official app. Then save your operator's fraud-report number in your phone, labelled, today.
2. Create (or audit) your one source of truth: sales sheet with date, product, amount, cost, payment method, customer source. Enter everything for 7 days. On day 7, answer: best product by *profit*, busiest day, where new customers came from.
3. Do the first-weekend digital presence checklist from Module 1 if incomplete — then go one step further: reply to every review and message you have, including old ones.
4. Time-trial your month-end: with your records, produce last month's total sales, total profit, top 3 products, and any customer owing you money — in under 30 minutes. If it takes longer, the system needs fixing, not you.

### Go Deeper

- Your mobile money operator's official fraud-awareness pages (MTN/Airtel) — know the current scam patterns and the official reporting lines.
- Google's "Get Your Business Online" lessons — free, practical, and deeper than any social media course on Maps/Business Profile.
- WhatsApp Business app Help Center — catalogs, labels, broadcast lists: the free CRM most businesses already own but never configure.
- "Profit First" by Mike Michalowicz — the envelope method for business cash; the ideas work at any currency and any size.

---

> **The 1% difference:** experts run technology like a routine, not a toy collection: one source of truth updated daily, every payment verified in the official app, every dispute ended by a photo — and monthly statements filed, because the data *is* the business.
$exp_tech_in_business$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'tech-in-business'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: technical-communication  (source: technical-communication.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_technical_communication$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners write to document what they built. Experts write to **move a specific reader to a specific action** — and they decide who that reader is *before* typing a word. The professional pattern is BLUF (Bottom Line Up Front): the first sentence is the decision, recommendation, or headline; everything after is support. The second discipline: match depth to audience — the same auth-system change produces three artifacts: a 5-line changelog for users, a 1-page design decision for the team, and a 200-word paragraph for execs that says "risk reduced, no downtime, no customer action needed". Experts know that "I explained it clearly" is not the goal — "the reader did the right thing without asking me" is.

### How Professionals Actually Work

On strong engineering teams, **writing is the architecture process**: a short RFC or design doc (problem, constraints, 2-3 options with trade-offs, recommendation) is circulated *before* the code, and the review comments improve the design while changing it costs nothing. Docs are treated as product: a README gets a pitch, a quickstart that works copy-paste, and honest limitations; API docs show a request *and* its response for every endpoint. And in incidents, communication follows a rigid template — what happened, what is affected, what we are doing, next update at HH:MM — because during an outage, a confident "we know, we are on it, next update 14:30" is itself part of the fix.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| BLUF structure | Bottom line up front, then support | Busy readers get the decision in 5 seconds; detail is optional, not mandatory |
| RFC / design doc | 1-2 pages: problem, options, trade-offs, recommendation | Async decision-making across timezones; the written record outlives the meeting |
| ADR (Architecture Decision Record) | One short file per significant choice: context → decision → consequences | Six months later, "why did we use queues?" is answered by a file, not a former employee |
| Runbook / incident template | Symptom, diagnosis, fix, verification — pre-written and rehearsed | 3am responses become checklists instead of improvisation |
| Diátaxis framework | Docs split by reader need: tutorials, how-to, reference, explanation | The reason great projects' docs feel effortless — each mode has one job |

### Insider Moves You Won't Find in Tutorials

1. Write the PR description *for the reviewer*, not for history: what changed, why, how it was tested, and where to look carefully. The best reviewers review the riskiest part first — tell them where it is.
2. Make every README quickstart copy-paste clean: if step 3 requires a step 2.5, the doc is broken. Test your own quickstart by literally pasting it into a clean VM.
3. Use the "answer, then nuance" pattern in chat: first line answers the question fully, following lines add caveats. "It depends..." as an opener makes readers wait for the answer; lead with the answer.
4. In code review comments, separate severity from opinion: "blocker: this drops the where clause" vs "nit: prefer early return" — label them. Unlabeled feedback forces authors to guess what matters.
5. Keep a snippets file of your clearest past explanations (the incident summary you nailed, the design doc that got approved). Reuse structures, not just words — strong writers are plagiarists of their own best work.
6. Write the postmortem *before* the retrospective meeting and ask for written comments first: written-first culture surfaces the quiet engineer's insight that meetings bury.

### Field Scenarios: How Experts Handle Real Situations

**Production is down; the CEO asks for an update in the incident channel.**

- *What a beginner does:* Writes a paragraph of debugging detail with uncertain conclusions.
- *What an expert does:* Posts the template: "Known issue: checkout failing for ~15% of users. Cause suspected: payment provider. Actions: rolled back 14:02, monitoring. Next update 14:30 or sooner." Calm, timed, factual — and updated exactly when promised.
- *Why it matters:* In incidents, confident uncertainty plus a promised update time beats heroic detail; the update *is* the product.

**You disagree with a senior's design in review.**

- *What a beginner does:* "This seems wrong, why not just use Redis?"
- *What an expert does:* Restates their goal, names the trade-off, offers evidence: "If the goal is sub-ms reads, agreed. My concern is the 200ms cache-fill stampede on cold start — option B adds a lock; option C pre-warms. Happy to be wrong, which constraint am I missing?"
- *Why it matters:* Criticism aimed at the design (with the trade-off named) gets engaged; criticism aimed at the person gets defended.

**A stakeholder asks "can we add one small field to the report?" (it is not small).**

- *What a beginner does:* "No, that's a big change." (reads as obstruction)
- *What an expert does:* Translates cost into options with trade-offs: "The quick version ships this week but only for this quarter's data. The full version needs a schema change — two weeks. Want quick-now, full-later, or a hybrid?" The stakeholder makes an informed choice; you look like a partner, not a wall.
- *Why it matters:* Saying "no" is a communication failure; pricing the trade-offs is the professional move.


### Expert Confessions: Mistakes Even Pros Make

- Writing for the wrong reader: dumping implementation detail on executives or watermarking engineer docs with business fluff. Every artifact has an audience; name it first.
- Burying the lede: three paragraphs of context before the recommendation. Readers who give up at paragraph two make decisions without your input — that is how designs get made without you.
- Docs that die: a Confluence with 400 pages and no owners or dates. Experts prefer fewer living docs — every page has an owner and a "last verified" date.
- Jargon as armour: "we need to refactor the monolith to event-driven microservices" instead of "deploys take a week because everything changes together; I want to split the two most-changed parts". Concrete beats abstract, always.

### A Day in the Life

An engineer's morning starts with writing, not coding: the RFC for the notification service is due for comments. One page: problem (users miss renewals), two options (in-app + email vs SMS-first), costs, and a recommendation with the one-line trade-off ("SMS-first costs $0.03/msg but reaches the 60% of users without reliable data; recommend hybrid: email first, SMS for overdue"). Comments arrive by noon; one challenge ("why not push notifications?") earns a paragraph answering the *constraint* (push opt-in is 30% here) and an updated option table. After lunch: a PR description with a "review here first" pointer; two review comments carefully labeled [blocker] and [nit]. The day ends with an incident-update post in the incident channel, written in the four-line template and updated exactly on schedule — the on-call lead later calls it "the calmest channel of the quarter".

### The Hiring Manager's Lens

Writing is screened at every senior level: take-homes are read for structure (BLUF? audience?), and interviewers explicitly score "can this person explain a technical trade-off to a non-technical stakeholder?" The prompt "explain your last project to me like I'm the CFO" is common — the winners lead with the business outcome, then offer depth on request. Portfolio tip that beats any course: a README with a clear pitch and honest limitations has gotten candidates hired on communication alone; a perfect repo with a one-line README has gotten them rejected.

### Your First Job, In Reality

Your writing will matter before your code does: your first PR description, your first "I'm blocked" message, your first incident note. The pattern that builds your reputation fastest: short, structured updates nobody has to chase — "Done: X. Doing: Y. Blocked on Z; I'll ask Alice at 3pm." Managers remember the engineer whose status is always *known*; that trust is what gets you the interesting work later.

### Expert-Level Exercises

1. Rewrite your last PR description using: what/why/how-tested/risky-part. Then ask a teammate to review a *different* PR using only your description — every question they ask is a sentence you should have written.
2. Write a one-page ADR for a real decision in your project (even a personal one): context, two options, trade-offs, decision, consequences. Keep it under 300 words — that constraint is the skill.
3. Take your README and test the quickstart by copy-pasting it into a fresh directory (or VM). Fix every stumble. Record how many there were; that number is your docs bug count.
4. Write a fake incident update: service X down, suspected cause, actions taken, next update time. Then write the 14:30 follow-up. Read both aloud — if any sentence would embarrass you in front of the CEO, rewrite it.

### Go Deeper

- Google "engineering documentation" guides and the Diátaxis framework (diataxis.fr) — the two best free sources on structuring technical docs.
- "On Writing Well" by William Zinsser — the classic; principles transfer directly to engineering writing.
- "The Mom Test" and "Crucial Conversations" — for the conversations *around* the documents.
- Julia Evans' blog on explaining technical topics — the masterclass in making complex things simple without lying.

---

> **The 1% difference:** experts write to move a reader to action: bottom line up front, audience named before typing, trade-offs priced not preached — and in incidents, calm timed updates are treated as part of the fix.
$exp_technical_communication$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'technical-communication'
  AND l.is_published = true;

-- ------------------------------------------------------------
-- Course: testing-debugging  (source: testing-debugging.js)
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('## 🎓 The Expert Layer' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('## 🎓 The Expert Layer' in l.content_md) - 1),
           '\s*-{3,}\s*$', '')
  END
) || $exp_testing_debugging$


---

## 🎓 The Expert Layer

### What Professionals Do Differently

Beginners write tests *after*, as documentation of what they already know works — which is why such tests pass on the first run and prove nothing. Experts use tests as a **thinking tool**: write the failing test first (it fails, so it is testing something), make it pass with the simplest code, then refactor. Kent Beck's rule holds: "test everything that could possibly break" — and nothing more. The second discipline is debugging as **science, not archaeology**: a professional never "changes things until it works"; they form a hypothesis ("the cache returns stale data when TTL expires mid-request"), design the cheapest experiment that proves or kills it, and observe. Every mystery bug yields to that loop eventually; almost none yield to guessing.

### How Professionals Actually Work

They invest in the test pyramid: many fast unit tests at the bottom (seconds), a handful of integration tests around real boundaries (database, HTTP), and few but thick end-to-end tests for the critical paths ("user can sign up and buy"). When a bug arrives from the outside world, the ritual is sacred: **first write the failing test that reproduces it, then fix** — the test becomes permanent proof the fix works and a tombstone for that bug class. They also treat test *failure* as data: a suite with flaky tests gets quarantined and fixed or deleted, because a suite that lies 5% of the time is a suite nobody trusts — which is the same as having none.

### Tools of the Trade

| Tool / Practice | What It Is | Why Experts Swear By It |
|---|---|---|
| Watch-mode testing | Tests re-running on every save (jest --watch, vitest) | Feedback loop under a second; problems caught while context is fresh |
| Coverage as a map, not a target | Uncovered lines show where risk lives | Chasing a coverage number produces fake tests; reading it produces real ones |
| Time-travel / step debugging | Real breakpoints and watch expressions, not console.log archaeology |  Seeing actual state beats guessing at it; log-based debugging is a habit, not a choice |
| Contract/integration tests | Testing the real DB, real HTTP client against stubs | The layer where "worked on my machine" bugs are actually caught |
| CI as the referee | Every PR runs the whole suite; green is the only merge state | Trust in the suite is the team's most valuable and most fragile asset |

### Insider Moves You Won't Find in Tutorials

1. Name tests by behaviour, not method: `it("refuses a coupon that expired yesterday")`. The test list becomes the documentation of what the system does — juniors read it; experts *write it as the spec*.
2. Test the boundary values on instinct: 0, 1, -1, empty, max, max+1, and the weird Unicode name. Almost every validation bug in history lives at a boundary.
3. When a test suite gets slow, profile *the suite*: parallelise, kill sleeps, swap network calls for fakes. A 20-minute suite gets run rarely; a 20-second suite gets run always.
4. Learn the two-debugger rule: when stuck for 15 minutes, stop and explain the bug out loud (rubber duck or teammate). The act of narrating forces the wrong assumption into the open.
5. Write the "reproduction script" for any mysterious bug before theorising: the smallest, fastest way to make the bug happen on demand. If you cannot reproduce it, you are not debugging — you are haunted.
6. Use mutation thinking to test your tests: mentally (or with tools) flip a comparison and ask "which test would catch this?" If the answer is none, that logic is untested no matter what coverage says.

### Field Scenarios: How Experts Handle Real Situations

**A bug report: "sometimes the total is wrong after applying two discounts".**

- *What a beginner does:* Reads the discount code line by line hoping to spot it.
- *What an expert does:* Reproduces first: writes a test with two discounts and an expected total, watches it fail, then instruments *only* what the hypothesis needs. Bug found in ten minutes, and the failing test stays behind as a regression guard forever.
- *Why it matters:* Reproduction converts a mystery into a fixed target; everything after is routine.

**The team's 900-test suite takes 12 minutes and CI is always red.**

- *What a beginner does:* Adds a retry mechanism to flaky tests.
- *What an expert does:* Quarantines flaky tests the same day, fixes or deletes them within the week, and parallelises the suite. Retries are a lie the suite tells you — a test that only passes on retry is a bug in the test *or* the code, and it must be named.
- *Why it matters:* Suite trust is binary: once "just re-run it" becomes normal, all signal is gone.

**The on-call engineer gets paged: error rate 8%.**

- *What a beginner does:* Starts reading code.
- *What an expert does:* Checks what *changed* (deploys, config, upstream status), rolls back the 14:00 deploy and watches the rate fall — then debugs calmly on the side branch. Mitigation first, understanding second; the order is the discipline.
- *Why it matters:* Users do not care why it broke; a rollback is five minutes, a root cause can be hours.


### Expert Confessions: Mistakes Even Pros Make

- Writing tests that assert implementation (that a private method was called) instead of behaviour (that the invoice total is correct). Every refactor breaks them, teaching the team that tests are enemies.
- Mocking everything. Over-mocked suites pass while production burns, because the mocks agreed with each other instead of with reality. Mock the network, not your own code.
- Chasing 100% coverage. The last 10% costs 50% of the effort and mostly tests getters; experts stop where new tests stop finding bugs.
- Debugging by superstition: changing three things at once, re-running, and shipping if it works. Whatever was fixed, the same bug will return because nobody knows why it left.

### A Day in the Life

A test-lead engineer starts in CI: two flaky failures overnight on main. They run both locally — pass — so they re-run with the container logs: a race in a test that assumed a 100ms API response. They make the test wait on the actual condition, not a sleep, and leave a comment explaining the trap. Mid-morning: a new feature. They write the failing test for the trickiest rule first (prorated refunds), watch it fail for the right reason, implement until green, then refactor with the safety net humming. After lunch: a bug from support ("invoice PDF shows yesterday's number"), reproduced in 6 minutes with a script that will now live in the repo as a test. They end the day deleting 3 dead tests and a 200-line setup nobody understood — the suite gets faster and more honest.

### The Hiring Manager's Lens

Interviewers test debugging more than testing: "Here is a failing test in this repo — find and fix the bug" reveals everything: do you read the assertion first? Form one hypothesis or shotgun five? Add a log or use a real breakpoint? The senior tell is saying "my hypothesis is X — let me disprove it" out loud. For testing culture, the question is "a test is flaky — what do you do?" Quarantine-fix-or-delete *today* is the professional answer; retry is the amateur one.

### Your First Job, In Reality

Your first weeks will be fixing failing tests someone else wrote — and this is a gift: it forces you to read code through its tests, the fastest way to learn a codebase's intent. The habit that marks you early: when you fix any bug, you *also* bring the test that proves it, unasked. Within a month, reviewers start trusting your PRs more — because a fix with a test is a fix that cannot silently regress.

### Expert-Level Exercises

1. Take your next bug and forbid yourself from fixing it until you have a failing test that reproduces it. Keep that test forever. This single habit is worth years of seniority.
2. Run your suite in watch mode for one full day of coding. Notice how often red saves you within seconds of the mistake — then try going back.
3. Find your flakiest test. Delete the sleep/wait, make it await the real condition, and run it 50 times (`--repeat=50`). Record what you found.
4. Pick one function and write boundary tests only: empty, 0, 1, -1, max, max+1, emoji, and a 10,000-character string. Fix every failure — most functions fail three of these.

### Go Deeper

- "Test-Driven Development: By Example" by Kent Beck — short, classic, and the origin of the red-green-refactor loop.
- Kent C. Dodds' "Testing JavaScript" articles — testing trophy over pyramid, behaviour over implementation.
- Google's "Software Engineering at Google" ch. 11-12 (free online) — how a giant org thinks about flaky tests and test culture.
- Julia Evans' debugging zine (wizardzines.com) — the hypothesis-driven debugging loop in 30 friendly pages.

---

> **The 1% difference:** experts treat a failing test as a gift (someone just specified the system's behaviour for free) and debugging as science: one hypothesis, one experiment, one observation — repeated until the bug confesses.
$exp_testing_debugging$
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = 'testing-debugging'
  AND l.is_published = true;

-- ============================================================
-- VERIFICATION (run after the updates above)
-- ============================================================
DO $verify$
DECLARE
  v_updated int;
  v_missing int;
BEGIN
  SELECT count(*) INTO v_updated
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.slug = ANY(ARRAY['ai-coding-tools', 'auth-security', 'backend-development', 'capstone-project', 'command-line-linux', 'databases', 'devops-basics', 'frontend-development', 'git-github', 'problem-solving', 'programming-fundamentals', 'python-foundations', 'reading-codebases', 'robotics', 'system-design', 'tech-in-business', 'technical-communication', 'testing-debugging'])
    AND l.is_published = true
    AND position('## 🎓 The Expert Layer' in l.content_md) > 0;

  SELECT count(*) INTO v_missing
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.slug = ANY(ARRAY['ai-coding-tools', 'auth-security', 'backend-development', 'capstone-project', 'command-line-linux', 'databases', 'devops-basics', 'frontend-development', 'git-github', 'problem-solving', 'programming-fundamentals', 'python-foundations', 'reading-codebases', 'robotics', 'system-design', 'tech-in-business', 'technical-communication', 'testing-debugging'])
    AND l.is_published = true
    AND position('## 🎓 The Expert Layer' in l.content_md) = 0;

  RAISE NOTICE 'Expert layer present on % lessons; missing on % lessons.', v_updated, v_missing;
END
$verify$;
