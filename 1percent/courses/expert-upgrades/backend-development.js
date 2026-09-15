/* ============================================================
   Expert Layer data — Backend Development
   Grounded in: OWASP Top 10:2025 (access control #1, supply chain,
   misconfiguration), API versioning practice, idempotency keys,
   structured logging, error-budget thinking.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners build endpoints and think about the happy path. Experts build endpoints where **every input is a lie until validated, every request may arrive twice, and every dependency will fail**. That triple assumption changes everything: validation at the boundary, idempotency keys on payments and POSTs, timeouts and retries with backoff on every outbound call. It is why broken access control has sat at the top of the OWASP Top 10 (the 2025 edition still ranks it #1): amateurs check "is the user logged in?", professionals check "is this user allowed to touch *this object*?" on every single request.`,

  howExpertsWork: `A professional API is designed before it is coded: the OpenAPI spec (or a README contract) defines routes, status codes, and error shapes — so frontend and backend can work in parallel and tests have a target. In the code, the controller layer stays thin (parse, validate, delegate, respond) while the business logic lives in services that know nothing about HTTP. Experts log **structured** JSON (timestamp, request id, user id, route, duration) rather than prose, so logs are queryable during an incident. And they version breaking changes (/v2/) instead of breaking clients — because someone, somewhere, is calling the endpoint you want to change.`,

  toolsOfTheTrade: [
    ['Idempotency keys', 'A client-supplied key so retried requests are deduplicated server-side', 'The difference between one charge and five on a flaky mobile connection'],
    ['Structured logging + request IDs', 'JSON logs with a request id propagated through every service', 'Incident diagnosis in minutes instead of hours; logs become databases'],
    ['OpenAPI/Swagger', 'A machine-readable contract for the API', 'Generated docs, mocks, and client SDKs; frontend never blocked on backend'],
    ['Rate limiting', 'Per-user/per-IP request ceilings (token bucket)', 'Protects the database from bugs, scrapers, and storms — cheap insurance'],
    ['Feature flags', 'Shipping code disabled, enabling gradually per user/percentage', 'Deploys become non-events; risky changes can be turned off in seconds']
  ],

  insiderMoves: [
    'Return the *right* status code, always: 400 (client sent garbage), 401 (who are you?), 403 (not allowed), 404 (hide existence), 409 (conflict), 422 (valid JSON, invalid semantics). Frontends build error handling on these; mixing them up is how mobile apps "randomly" fail.',
    'Never trust `Content-Length` or client-side validation — re-validate size and type server-side. The 10MB image limit that lives only in the browser is not a limit.',
    'Paginate everything from day one, even "small" lists. Every API has one endpoint that grows silently until it takes down the server the day a customer with 50,000 records logs in.',
    'Wrap outbound HTTP calls with a timeout *and* a retry cap *and* jittered backoff. The default "wait forever" is how one slow dependency freezes your whole service.',
    'Return error responses in one consistent shape (`{error: {code, message, details}}`) — and log the details server-side, not to the client. Clients get helpful, safe messages; you get forensic detail.',
    'Test one thing the docs promise but the code does not do: send a duplicate request, an expired token, a 10MB payload. Experts break their own APIs before strangers do.'
  ],

  fieldScenarios: [
    {
      situation: 'A customer was charged twice during a network retry.',
      beginner: 'Adds a "duplicate detection" check after the fact and apologises.',
      expert: 'Had made the endpoint idempotent from day one — the retry with the same idempotency key returns the original result. Now they add the key to the failing endpoint and refund, with a log query showing exactly who was affected.',
      why: 'Retries are not exceptional on mobile networks; they are the normal case that must be designed for.'
    },
    {
      situation: 'Users can see other tenants\' data by changing an ID in the URL.',
      beginner: 'Hides the field in the UI and considers it fixed.',
      expert: 'Treats it as P0 broken access control: authorisation checked in the service layer for every object access (`if (invoice.ownerId !== user.id) return 404`), plus an automated test per role. Then checks every other endpoint for the same class of bug.',
      why: 'OWASP #1 for a reason — UI hiding is not authorisation, and attackers read APIs directly.'
    },
    {
      situation: 'The database is at 100% CPU every evening.',
      beginner: 'Upsizes the database instance (more money, same problem).',
      expert: 'Finds the actual queries (pg_stat_statements / slow query log), adds the missing index or fixes the N+1 loop, and adds a load test so the regression cannot return unnoticed.',
      why: 'Money hides symptoms; a query fix deletes the problem permanently.'
    }
  ],

  expertMistakes: [
    'Storing secrets in code or config committed to git. Every leaked AWS key in a public repo is found by bots within minutes; experts use env vars/secret managers and rotate anything that ever touched a repo.',
    'Returning raw database errors (with table names) to clients. That is free reconnaissance for attackers; map internal errors to safe messages.',
    'Building "temporary" auth with plaintext or MD5 passwords "until we add hashing". bcrypt/argon2 from day one — migration later means forcing every user to reset.',
    'Skipping migrations discipline: editing the live schema by hand. Experts treat schema like code — versioned, reviewed, reversible, applied the same way on every environment.'
  ],

  dayInTheLife: `A backend engineer starts by checking overnight alerts: one 5xx spike at 02:14. With a request id from the alert, they filter structured logs and see the timeout to a payment provider — they raise that provider's timeout budget, add a retry with backoff, and leave a comment in the incident doc. Mid-morning is a new endpoint: they write the OpenAPI snippet first, get a 👍 from the frontend dev, then implement validation → service → route. After lunch, code review: they question a PR that queries the DB inside a loop, and suggest the batched version with a benchmark. Before signing off they add one more test — a duplicate POST with the same idempotency key — because they have been burned before.`,

  hiringLens: `Backend interviews probe judgement, not syntax: "Design a payment endpoint for flaky mobile networks" (listening for: idempotency, retries, timeouts), "A client sends a request for another user's data — what happens in your API?" (listening for: object-level authorisation, 404 not 403 leaks), "How do you know your API is healthy in production?" (listening for: structured logs, latency percentiles, error rates). Candidates who answer with *defaults* ("I'd add validation") score junior; candidates who answer with *mechanisms* ("Zod schema at the boundary, 422 with a stable error code") score senior.`,

  firstJobReality: `Your first backend ticket will likely be "add a field to this response" — and the real skill is tracing where the response is built across middleware, controller, and service in a codebase you have never seen. You will break staging at least once (everyone does); what matters is that you *said so immediately* in the team channel with the deploy you suspect. The engineers trusted fastest are not the ones who never break staging — they are the ones whose breakage is visible, owned, and fixed within the hour.`,

  exercises: [
    'Take any API you have built. Write a 15-line "abuse script" (curl loop) that sends malformed, duplicate, oversized, and unauthorised requests. Fix every 500 it finds.',
    'Add idempotency-key handling to one write endpoint (store the key + response, return the stored response on retry). Write the test that proves a double-submit is charged once.',
    'Convert console.log debugging to structured JSON logs with a request id middleware. Then answer: "how many requests took >2s in the last 24h?" with one grep/jq pipeline.',
    'Write the OpenAPI spec for one existing endpoint *afterwards* and compare what the spec says to what the code does — every mismatch is a real bug or a real doc.'
  ],

  goDeeper: [
    'OWASP Top 10:2025 (top10.owasp.org) — read the actual list, especially Broken Access Control and the new Software Supply Chain Failures category.',
    '"Designing Data-Intensive Applications" ch. 1-3 — reliability and data models explained by a practitioner.',
    'Google SRE book, "Service Level Objectives" and error budgets (free at sre.google) — how professionals trade reliability against shipping speed.',
    'Stripe\'s API docs and changelog — the public gold standard for API design, versioning, and idempotency keys in the wild.'
  ],

  onePercent: `experts assume every input is hostile, every request is a duplicate, and every dependency will fail — then design systems where those assumptions cost nothing, because they validated at the boundary, deduplicated with keys, and added timeouts everywhere.`
};
