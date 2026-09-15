/* ============================================================
   Expert Layer data — Authentication & Security Fundamentals
   Grounded in: OWASP Top 10:2025 (access control #1, supply chain
   failures new), NIST SP 800-63B password guidance, secure-by-
   default practice, JWT/session trade-offs.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners add security *features* (a login form, a token). Experts add security *properties*: the system stays safe even when a component fails, a developer errs, or a user picks "password123". That means secure defaults everywhere (HTTPS-only cookies with HttpOnly and SameSite, argon2/bcrypt password hashing, CSRF tokens on state-changing routes), authorisation checked at the object level on **every** request, and secrets that live in a manager — never in git, never in logs. They also read the OWASP Top 10 as a checklist of *what attackers actually try first*: the 2025 edition keeps Broken Access Control at #1 and adds Software Supply Chain Failures — meaning attackers increasingly come in through your dependencies, not your code.`,

  howExpertsWork: `They threat-model before building: for each feature, ask "who would abuse this, what do they want, and what is the cheapest thing I can do to make it not worth it?" Login flows follow NIST SP 800-63B in spirit: allow long passwords and passphrases, check against breached-password lists, rate-limit by account *and* IP, and give generic errors ("wrong username or password") that do not confirm which half was right. Passwords are hashed with argon2id or bcrypt — never encrypted (reversible = wrong), never MD5/SHA. Sessions default to HttpOnly SameSite cookies; JWTs are used where statelessness pays (service-to-service), with short lifetimes and refresh rotation, because "the token is signed" does not mean "the token is valid right now" — revocation and expiry still have to be designed.`,

  toolsOfTheTrade: [
    ['argon2id / bcrypt', 'Modern password-hashing functions with tunable cost', 'Computationally expensive by design, so stolen hashes are worthless at scale'],
    ['HttpOnly + SameSite cookies', 'Session cookies unreadable by JS, not sent cross-site', 'XSS cannot steal the session; CSRF is structurally blunted'],
    ['Object-level authorisation checks', 'owner_id checked per request (or enforced by RLS)', 'Kills the OWASP #1: IDOR/access-control bugs that UI hiding never does'],
    ['Dependency scanning (npm audit, Dependabot)', 'Flags known-vulnerable packages automatically in CI', 'Defends the supply-chain layer attackers now prefer'],
    ['Security headers', 'CSP, HSTS, X-Content-Type-Options, frame-ancestors', 'Cheap, passive mitigation for XSS, clickjacking, and downgrade attacks']
  ],

  insiderMoves: [
    'Authorise the object, not the route: `404` instead of `403` when a user asks for someone else\'s resource — do not confirm the resource exists to people who cannot see it.',
    'Rate-limit login by *account* and by *IP* separately — IP limits annoy offices and universities; account limits stop credential stuffing of one poor user.',
    'Rotate every secret that has ever appeared in a commit, even a "deleted" one — git history keeps it. Prevention: a pre-commit secret scanner from day one.',
    'Set a strict Content-Security-Policy in report-only mode first, watch the violations, then enforce. CSP is the single highest-value XSS mitigation, and report-only is how it ships without breaking.',
    'Never log tokens, passwords, or full card numbers — not even "temporarily". Log lines end up in aggregators, tickets, and screenshots; redact at the source.',
    'Design account recovery as carefully as login: recovery is login. Email-based reset links expire in 15 minutes, are single-use, and invalidate old sessions on password change.'
  ],

  fieldScenarios: [
    {
      situation: 'A user reports: "I got an email saying my password changed, but I didn\'t change it."',
      beginner: 'Tells them to ignore it.',
      expert: 'Treats it as an active takeover attempt: invalidate sessions, force reset, check the reset-token log for who requested the change, and add the breached-password check if missing. Then fix the root cause (often: no rate limit on the reset endpoint).',
      why: 'Account takeover is an emergency with a paper trail; the alert email is the smoke alarm, not the fire.'
    },
    {
      situation: 'npm audit finds a critical CVE in a transitive dependency.',
      beginner: 'Panic-updates everything at 6pm Friday.',
      expert: 'Checks the actual exploitability (is the vulnerable code path used?), updates or pins with a patch, runs the test suite, and ships in hours — with a `renovate`/Dependabot config so the next CVE arrives as a ready PR.',
      why: 'Supply-chain response is a process, not a scramble; automation makes it routine.'
    },
    {
      situation: 'A junior suggests storing sessions in localStorage "because it\'s simpler".',
      beginner: 'Agrees — any XSS now silently exfiltrates every user\'s session.',
      expert: 'Explains the trade-off aloud: localStorage is readable by any injected script; HttpOnly cookies are not. Simplicity that adds a whole attack class is not simplicity.',
      why: 'Security review is a teaching moment; "simpler" defaults decide your breach history.'
    }
  ],

  expertMistakes: [
    'Hand-rolling crypto or auth. "I\'ll write my own encryption" has ended more careers than any technical skill gap; experts compose vetted primitives and buy auth when they can.',
    'Security through obscurity: hiding endpoints, renaming /admin to /super-secret-panel, trusting that attackers will not read your JS bundle. They read your JS bundle.',
    'Skipping security headers because "we have HTTPS". HTTPS protects the pipe; CSP/HSTS/frames protect the app at both ends of it.',
    'Testing only the happy path in auth flows: expired tokens, reused reset links, mismatched hosts, and Unicode edge cases in emails are where real sessions leak.'
  ],

  dayInTheLife: `A security-minded engineer starts with the weekend report: 412 failed logins on 3 accounts from 60 IPs — a credential-stuffing run. They confirm the breached-password check caught nothing new, tighten the account-level rate limit, and add the three targeted accounts to a watchlist; total, 40 minutes, because the monitoring was already there. Mid-morning: a code review on a payments PR — they flag password confirmation missing on the "change payout account" action, and note the new webhook endpoint trusts a header they verify manually instead of verifying the signature. After lunch they open a Dependabot PR (a moderate in a JSON parser), check exploitability, and merge it with tests green. The day ends writing one paragraph in the security runbook: how the stuffing run was detected, and what the next engineer should do in the first 10 minutes.`,

  hiringLens: `Security screens are judgement tests: "You find a stored XSS in a comment field — what do you do in the first hour?" (listening for: assess blast radius, fix + sanitise at render, rotate nothing *yet*, document, then check every other render path); "JWT or sessions?" (listening for: statelessness vs revocation trade-off, not a religion); "How do you store passwords?" (argon2/bcrypt — a one-word answer that gates seniority). Candidates who mention OWASP Top 10 2025 *categories by name* and supply-chain risk signal current, real-world practice.`,

  firstJobReality: `You will not be pen-testing in month one — you will be adding a missing authorisation check, fixing an unvalidated redirect, and writing rate-limit middleware. Those unglamorous tickets are the actual job: the OWASP list is mostly *ordinary code with one missing check*. The habit that gets you noticed: when you touch any endpoint, ask out loud "who is allowed to do this, and how do we know?" — reviewers remember engineers who make them think about the right things.`,

  exercises: [
    'Attack your own app: as a normal user, try to view, edit, and delete another user\'s records by changing IDs in URLs and API bodies. Every 200 you get back is a P0 finding — fix with object-level checks.',
    'Add rate limiting to one login endpoint (account + IP dimensions) and write a test that proves 6 rapid failures from one IP get throttled.',
    'Turn on a strict CSP in report-only mode, collect a week of violation reports, then write the enforcement policy. Document what surprised you.',
    'Audit your dependencies: run npm audit, triage every finding by exploitability (used path? severity? fix available?), and ship the fixes as one reviewed PR with a summary table.'
  ],

  goDeeper: [
    'OWASP Top 10:2025 (top10.owasp.org) and the OWASP Cheat Sheet Series (cheatsheetseries.owasp.org) — the pro reference for auth, sessions, and XSS.',
    'NIST SP 800-63B "Digital Identity Guidelines" — why length beats complexity rules; skim the Authenticator section.',
    'Google SRE book + "Postmortem Culture" — incident habits that pair with security response.',
    'PortSwigger Web Security Academy (free) — the best hands-on labs for XSS, CSRF, and access control on the internet.'
  ],

  onePercent: `experts design for the day things go wrong: stolen hashes that are useless, XSS that cannot steal a session, a missing check that the database itself catches — security is a property of defaults, not a feature you bolt on before launch.`
};
