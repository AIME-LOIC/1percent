/* ============================================================
   Expert Layer data — DevOps Basics
   Grounded in: Google SRE practice (error budgets, postmortems,
   canary deploys), container hygiene (multi-stage builds),
   observability triad (metrics/logs/traces), DORA research.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners think DevOps means tools — "I installed Docker, I do DevOps". Experts know it means **shortening the loop between "I changed something" and "I know it works in production"** — and that the loop is shortened by small, frequent, reversible changes. The DORA research programme has shown for years that elite performers deploy *more* often *and* fail less, because a small deploy is easy to review, easy to roll back, and easy to reason about. The second mindset: production is not a shrine, it is a laboratory — experts watch every deploy with real metrics, and an incident is never someone's fault; it is a systems gap whose fix gets written down.`,

  howExpertsWork: `Every service ships with three observability pillars from day one: **metrics** (error rate, latency percentiles p50/p95/p99 — never just the average, averages hide suffering), **logs** (structured, with request ids), and a way to tell *what the user is experiencing* (uptime check on the real endpoint, not on /health). Deploys are automated and boring: CI runs tests, builds an immutable image tagged with the commit SHA (never "latest"), and pushes the same artifact through staging to production. Risky changes ride behind a **canary**: 5% of traffic first, watched, then promoted. And the skill that separates juniors from seniors on-call: **mitigate first, diagnose second** — roll back in five minutes, understand at leisure.`,

  toolsOfTheTrade: [
    ['Immutable images + SHA tags', 'One image per commit, identical through every environment', '"Works on staging" becomes a guarantee, not a hope'],
    ['Health checks + graceful shutdown', 'Readiness/liveness endpoints and SIGTERM handling', 'Zero-downtime deploys and honest restarts'],
    ['Latency percentiles', 'p50/p95/p99 instead of averages', 'Averages lie; p99 is where your users actually live'],
    ['Canary + instant rollback', 'Traffic shifting to the new version with automated health gating', 'Blast radius of a bad deploy shrinks from "everyone" to "5% for two minutes"'],
    ['Blameless postmortems', 'Written incident analysis focused on systems, not people', 'The same outage never happens twice — institutional memory you can search']
  ],

  insiderMoves: [
    'Write multi-stage Dockerfiles: build with compilers and dev deps in stage one, copy *only* the artifacts to a clean runtime stage. 300MB images become 60MB, start faster, and carry fewer CVEs.',
    'Never use "latest" in a deployment manifest. Pin by digest or SHA tag — "latest" is how Friday deploys become weekend incidents.',
    'Run `docker run --rm -it image sh` locally and actually look inside: what is in this image that does not need to be? Every unused package is attack surface and pull time.',
    'Add a 10-minute rollback drill to your calendar: pick a service, roll back to the previous version in production, roll forward again. If a rollback has never been rehearsed, it does not exist.',
    'Configure graceful shutdown (finish in-flight requests on SIGTERM, then exit) — it turns every deploy from "some users saw errors" into "nobody noticed".',
    'Alert on symptoms users feel (error rate, latency, queue age), not causes (CPU 80%). CPU alerts at 3am train engineers to ignore 3am alerts.'
  ],

  fieldScenarios: [
    {
      situation: 'The new deploy doubles the error rate.',
      beginner: 'Starts reading the new code and logs to "understand what happened" while users suffer.',
      expert: 'Rolls back first (the previous version is one command away because deploys are reversible by design), confirms recovery, *then* debugs on a branch with no pressure. Files a short postmortem: what detected it, what contained it, what prevents it.',
      why: 'Mitigation and diagnosis use different mental modes; mixing them wastes both.'
    },
    {
      situation: 'Disk fills on the production host at 3am, again.',
      beginner: 'Logs in, deletes some logs, goes back to sleep.',
      expert: 'Fixes the *system*: log rotation config, image cleanup policy (docker system prune on a timer), and a disk-usage alert at 70% that pages *before* the 3am. Then writes the postmortem so the next engineer inherits prevention, not folklore.',
      why: 'Every repeated incident is a missing piece of automation; experts automate instead of heroically repeating.'
    },
    {
      situation: 'A teammate says the staging deploy "just hangs".',
      beginner: 'Restarts everything until it works.',
      expert: 'Checks the readiness probe — the app is healthy but listening on 127.0.0.1 inside the container, so the probe (and traffic) never reaches it. One config line, twenty minutes saved, and the habit of "read what the platform is telling you" spreads.',
      why: 'Most "mysterious" infra failures are the platform reporting a misconfiguration nobody read.'
    }
  ],

  expertMistakes: [
    'Big-bang deploys. A 6-week release is undeployable, unreviewable, and unrevertable; experts deploy daily (or more) precisely so that every change is small enough to be understood by one person.',
    'Hand-configuring servers. The server you fixed by hand at 2am is now different from every other server and from the image — experts change the image/config, redeploy, and let servers be cattle, not pets.',
    'Storing state in containers (uploads, sessions, SQLite files). Containers die without warning; anything that must survive gets a volume or an external store (S3/RDS/managed Postgres).',
    'Monitoring that only you can read. Dashboards with 40 panels and no owner are wallpaper; experts keep one dashboard per service with the four golden signals and one alert that means "user is being hurt".'
  ],

  dayInTheLife: `A DevOps engineer starts with the daily scan: error budget burned 12% this week (fine), p99 latency crept up 40ms since Tuesday (worth a look). They bisect by deploy: the Tuesday image added a logging middleware doing a synchronous external call — they make it async and fire-and-forget, watch p99 recover in the canary, and promote. Mid-morning: a PR review on a Dockerfile — they suggest a multi-stage build, and the image drops 240MB. After lunch, an incident: connection pool exhausted on one API pod, 5% error rate. They restart the pod (mitigation, 2 minutes), then find the real bug — a route that leaked connections on early returns — and add the fix plus a pool-exhaustion alert. The day ends writing the postmortem: timeline, contributing factors, three action items, no names.`,

  hiringLens: `DevOps screens test incident instincts: " deploys and errors double — walk me through it" (listening for: rollback *first*, then diagnosis; canary would have caught it), "how do you know your service is healthy?" (listening for: percentiles, error rate, saturation — not "CPU looks fine"), "tell me about a postmortem you wrote" (listening for: contributing factors, action items, blamelessness). Candidates who say "we never rolled back because we were careful" are describing risk, not safety — seniors know the rollback path is the product.`,

  firstJobReality: `In your first months you will not architect Kubernetes clusters — you will add a health check, fix a flaky pipeline step, and write deployment logs that others can follow. Do these extremely well. The reputation accelerant: be the person whose changes are *boring* — small PRs, real test coverage, images that shrink, and a runbook line for every manual step you were forced to do. When the next on-call rotation comes, you will be the one who sleeps through the night.`,

  exercises: [
    'Containerise one of your apps with a multi-stage Dockerfile. Compare image size and startup time before/after. Then run as a non-root user (USER node) — production does.',
    'Set up a CI pipeline that: tests, builds an image tagged with the commit SHA, pushes, and deploys to a free host. Prove the same SHA that passed tests is what runs in "production".',
    'Break it on purpose: deploy a version that throws 500s on one route, then practise your rollback until it takes under five minutes. Time yourself — that number is your real SLA.',
    'Write a blameless postmortem for any past incident you remember (even a personal project): timeline, detection, contributing factors, 3 action items. Notice how much you learn from writing, not fixing.'
  ],

  goDeeper: [
    'Google SRE book + SRE Workbook (free at sre.google) — the canon: SLOs, canaries, postmortems, on-call health.',
    'DORA "State of DevOps" reports (dora.dev) — the research linking small deploys and CI to organisational performance.',
    'Docker docs: "Multi-stage builds" and "Best practices" — 30 minutes that permanently improve your images.',
    '"The Phoenix Project" — a novel, but the DevOps mental model (bottlenecks, work in progress, feedback loops) sticks for life.'
  ],

  onePercent: `experts make production safe by making change small, observable, and reversible — deploy fearlessly because rollback is one command, and treat every incident as a systems lesson written down, not a person to blame.`
};
