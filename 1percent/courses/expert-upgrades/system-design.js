/* ============================================================
   Expert Layer data — System Design
   Grounded in: requirements-first interview/production framework,
   back-of-envelope estimation, caching trade-off practice,
   queue-based decoupling, SLO thinking.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners jump straight to components — "I'd use Redis, Kafka, Kubernetes" — which is naming solutions before naming problems. Experts start with **requirements and numbers**: How many users? Reads vs writes ratio? How much data per year? What latency is acceptable, and what is *unacceptable* (that is your SLO)? A back-of-envelope on a napkin — 100,000 reads/day ≈ 1.2 reads/second average, 10x peak — reframes the entire conversation: most "scaling problems" are solved by one well-chosen index and a cache, and saying so confidently is the mark of an expert. The other tell: experts name **trade-offs** explicitly ("this choice buys latency at the cost of consistency for five minutes") instead of pretending any design has no costs.`,

  howExpertsWork: `The professional sequence is always: (1) clarify functional and non-functional requirements, (2) estimate scale so the data tier is sized before anything else, (3) draw the boring version first — a single app server, one database, a load balancer — because it is genuinely the right architecture below ~10,000 users and every later step is a *measured* response to a real bottleneck, (4) identify the actual bottleneck (usually the database, sometimes the network), (5) apply the smallest fix that removes it: index, cache, read replica, queue, shard — in that rough order of preference. Complexity is bought, never collected.`,

  toolsOfTheTrade: [
    ['Back-of-envelope math', 'QPS, storage, and bandwidth estimates from one-line assumptions', 'Sizes the system in minutes; kills over-engineering before it starts'],
    ['Caching layers', 'Redis/CDN in front of expensive reads, with TTLs and invalidation rules', 'The highest-leverage performance tool — and the source of the freshest bugs when done casually'],
    ['Message queues', 'Kafka/RabbitMQ/SQS between producers and slow consumers', 'Absorbs spikes, isolates failures, and turns "must respond now" into "must eventually be done"'],
    ['SLOs & error budgets', 'A target like 99.9% availability = 43min/month budget', 'Turns "is it reliable enough?" into a number teams can act on'],
    ['Horizontal vs vertical scaling', 'Adding machines vs adding size', 'Experts scale vertically first (boring, cheap) and horizontally when the data demands it']
  ],

  insiderMoves: [
    'Cache the *read path* first and invalidate on write with a short TTL. The cache-invalidation rabbit hole is real, so experts start with "cache for 60 seconds" and only get fancier when the data proves it.',
    'Put a queue between anything bursty and anything slow (emails, PDFs, webhooks, video processing). The request returns 202 immediately; the worker chews at its own pace; spikes stop being outages.',
    'Design idempotent consumers from day one: the same queue message *will* be delivered twice someday, and the consumer must survive it (dedupe key or upsert).',
    'Read replicas solve read-heavy load cheaply — but only after you know the reads are actually the bottleneck (measure!). Writes still go to one primary; replication lag becomes your new consistency question.',
    'Add a "degrade gracefully" mode: if recommendations are down, the page shows bestsellers instead of an error. Experts design the fallback *before* the failure, not during it.',
    'Write the runbook as you design: every component in the diagram gets a line — "if this dies, what does the user see, and what do I do?" A design without that column is unfinished.'
  ],

  fieldScenarios: [
    {
      situation: 'The API times out every day at peak (18:00-19:00).',
      beginner: 'Suggests microservices and Kubernetes to "scale".',
      expert: 'Measures first: is it CPU, DB connections, or a specific slow endpoint? Finds 80% of peak load is one unindexed dashboard query, fixes the index, and puts the remaining spike behind a queue. Never mentioned a container orchestrator.',
      why: 'Architecture changes are the most expensive tool in the box; experts reach for them last.'
    },
    {
      situation: 'The flash-sale launch will bring 50x normal traffic.',
      beginner: 'Hopes autoscaling handles it.',
      expert: 'Runs the numbers: 50x on a system at 5% peak capacity is fine; at 40% it is an outage. Pre-scales, queues non-critical writes, enables a static fallback page, and rehearses the runbook in a staging load test at 60x.',
      why: 'Load you have never rehearsed is load you have never handled.'
    },
    {
      situation: 'Two microservices must stay consistent when an order is cancelled.',
      beginner: 'Designs a distributed transaction across both services.',
      expert: 'Asks the product question first: does inventory need to know in *milliseconds* or *minutes*? Almost always "minutes" — so an event ("order.cancelled") with an idempotent consumer and a reconciliation job is simpler, safer, and debuggable.',
      why: 'Most "consistency" requirements are actually latency requirements wearing a suit.'
    }
  ],

  expertMistakes: [
    'Adopting microservices because a big company blog post did. Microservices trade code complexity for operational complexity; teams under ~15 engineers usually buy pain with no benefit. Experts can *defend* monolith-first with numbers.',
    'Premature sharding. Sharding multiplies every operational problem (migrations, backups, joins) — experts exhaust indexes, caching, and read replicas first, and can explain the exact threshold that would change their mind.',
    'Designing for imaginary scale ("what if we get a million users?") while the current system has 40. The expert designs for today with clean seams, so tomorrow\'s change is cheap.',
    'No single-writer discipline: letting two services write to the same table without an owner. Data corruption follows; experts assign each dataset one writer and make everyone else read or ask.'
  ],

  dayInTheLife: `A senior engineer spends the morning in a design review: a teammate proposes Kafka for a new notification feature. They ask two questions — "what QPS?" (80/day) and "what happens if it is down for an hour?" — then suggest Postgres + a cron worker for now, with the queue seam left clean for later. Nobody is offended; the math did the talking. After lunch they review the week's error budget: 99.95% achieved, 20 minutes of budget spent, no action needed. Then a capacity conversation: the orders table hits 500GB in eight months at current growth — they propose partitioning by month *then*, and a data-retention policy now. The day's output: one avoided microservice, one retained budget, one future disaster pre-solved.`,

  hiringLens: `System design interviews are won in the first five minutes: candidates who ask "who are the users, what is the read/write ratio, what latency is acceptable?" instantly separate from candidates who start drawing boxes. Interviewers score the *journey*: requirements → estimates → boring design → bottleneck analysis → trade-off articulation. Saying "I would not shard yet, and here is the number that would change my mind" scores higher than any buzzword architecture. The silent test: do you say "it depends" and then *say what it depends on*?`,

  firstJobReality: `Juniors do not design systems alone — but they *observe* them. The career accelerant in year one: for every incident and every design doc, ask "what was the bottleneck, and how did we know?" Within months you will have a mental library of failure patterns (thundering herd, retry storms, connection pool exhaustion) that no course can teach as vividly. Your first design contribution will be small — a caching decision, a queue for one job — and writing its trade-offs down in the PR is how seniors spot you.`,

  exercises: [
    'Estimate a real product you use: users/day, reads and writes per user, storage per year. Then compute average and peak QPS. You have just done the step most candidates skip.',
    'Take your current project and write its "boring architecture" on one page: single app, one DB, one cache. List the first three bottlenecks you would hit at 10x, 100x, and 1000x — and the *measured* signal that would tell you each had arrived.',
    'Add a queue to one slow operation in your app (email, PDF, report). Return 202 immediately, process in a worker, and make the consumer idempotent. Test it by delivering the same message twice.',
    'Write a 10-line runbook for your app\'s worst-case failure ("database down"): what users see, what you do first, how you verify recovery. A design is not done until this exists.'
  ],

  goDeeper: [
    'Google SRE book, chapters on SLOs and "Addressing Cascading Failures" (free at sre.google) — the production backbone of design thinking.',
    '"System Design Interview" by Alex Xu — the standard interview preparation, and honest about trade-offs.',
    'donnemartin/system-design-primer (GitHub) — free, deep, with back-of-envelope reference tables.',
    '"Designing Data-Intensive Applications" by Martin Kleppmann — the single best book on how real data systems behave under failure.'
  ],

  onePercent: `experts design from requirements and numbers, ship the boring architecture first, buy complexity only when a measured bottleneck demands it — and can articulate the trade-off of every choice, which is what "senior judgement" actually means.`
};
