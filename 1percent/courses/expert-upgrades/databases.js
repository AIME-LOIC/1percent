/* ============================================================
   Expert Layer data — Databases
   Grounded in: pg_stat_statements + EXPLAIN ANALYZE workflow
   (Crunchy Data / pganalyze practice), index-selectivity thinking,
   migration discipline, constraint-as-truth philosophy.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners treat the database as a dumb storage box the ORM talks to. Experts know it is the most *optimised software on the server* — a query planner that makes thousands of decisions per second, and the professional's job is to give it good data (types, constraints, indexes) and then **measure** instead of guessing. The workflow is always the same: find the worst query with \`pg_stat_statements\` (ordered by total time, not mean time — total is what users feel), read its \`EXPLAIN (ANALYZE, BUFFERS)\` plan, and look for the three crimes: a Seq Scan on a big table, rows estimated vs rows actual diverging wildly, or a sort that spills to disk. Fix the query or add the index, then re-measure. Intuition loses to that loop every time.`,

  howExpertsWork: `They push truth into the schema: NOT NULL, UNIQUE, CHECK, and FOREIGN KEY constraints so that *impossible states are unrepresentable* — the application layer can have bugs, the database cannot be polite about them. They design indexes for actual queries (leading-column rule for composites, e.g. (tenant_id, created_at) serves "recent rows per tenant"), never blindly on every column, because every index taxes every write. Transactions wrap every multi-step mutation; and schema changes go through **versioned migrations** that are reviewed like code, tested on production-sized data, and written to be reversible (or at least backward-compatible: expand → migrate → contract, never a one-step column rename with downtime).`,

  toolsOfTheTrade: [
    ['pg_stat_statements', 'Postgres extension ranking queries by total execution time', 'Tells you what to optimise first — no more tuning by vibes'],
    ['EXPLAIN (ANALYZE, BUFFERS)', 'Executes the query and shows the *real* plan with timings and I/O', 'Turns "slow query" into "Seq Scan on orders, 1.2M rows, spilling 80MB to disk"'],
    ['Composite indexes', 'Multi-column indexes ordered by filter-then-sort', 'One index serves both the WHERE and the ORDER BY — the difference between 40ms and 400ms at scale'],
    ['Versioned migrations', 'Schema changes as reviewed, ordered, re-runnable files', 'Every environment identical; deploys boring; rollbacks possible'],
    ['RLS / row-level authorisation', 'Database-enforced per-row access (Supabase default tooling)', 'The authorisation bug that ships because a route forgot its check cannot exist']
  ],

  insiderMoves: [
    'Index for your WHERE + ORDER BY together: a composite (tenant_id, created_at DESC) answers "latest orders per tenant" with an index scan, no sort step. Single-column indexes are usually a waste by comparison.',
    'Pagination done right: keyset (`WHERE created_at < $last_seen ORDER BY created_at DESC LIMIT 20`), not OFFSET — OFFSET 100000 makes the database read and throw away 100,000 rows; keyset is constant-time.',
    'Count nothing you can avoid: COUNT(*) over a huge filtered set is a real cost; for UI badges, keep approximate counts in a summary table updated by trigger — professionals denormalise *deliberately*, with a reason written down.',
    'Batch deletes and updates (`DELETE ... WHERE id IN (...) LIMIT 10000` in a loop) — a single 50M-row delete in one transaction will lock, bloat, and possibly take down the table.',
    'Use `EXPLAIN (ANALYZE, BUFFERS)` in a transaction you can ROLL BACK, so an accidental UPDATE in the plan touches nothing.',
    'Name constraints explicitly (`CONSTRAINT orders_user_fk FOREIGN KEY ...`). When the day comes that one blocks a migration, "orders_user_fk" is actionable and "_fk_12345" is archaeology.'
  ],

  fieldScenarios: [
    {
      situation: 'The product page got slow after six months of growth.',
      beginner: 'Adds Redis "to cache everything".',
      expert: 'Opens pg_stat_statements, finds one query eating 40% of total time, reads its plan (Seq Scan + spill), adds the composite index it was begging for — 900ms to 12ms — and only then decides whether caching is still needed (it usually is not).',
      why: 'Caching a slow query memorises the problem; indexes delete it.'
    },
    {
      situation: 'Two support agents update the same customer record; one update silently disappears.',
      beginner: 'Blames "a sync bug" and adds a delay.',
      expert: 'Recognises lost update: adds a `version` column and optimistic locking (`UPDATE ... WHERE id=$1 AND version=$2`), so the second writer gets a conflict to resolve instead of a silent overwrite.',
      why: 'Concurrency is normal; silent data loss is not a bug you find, it is one your users find.'
    },
    {
      situation: 'A migration must rename a column used by the mobile app in production.',
      beginner: 'Runs the rename in one step Friday evening; old app versions break instantly.',
      expert: 'Expands: add the new column, dual-write from the app; migrate: backfill in batches; contract: switch reads, ship app updates, drop the old column weeks later. Zero downtime, reversible at every step.',
      why: 'Live systems cannot pause; migrations must be compatible with the versions already in users\' hands.'
    }
  ],

  expertMistakes: [
    'SELECT * in application code. It breaks the moment a column is added, drags a TOASTed 2MB JSON blob into memory for a list view, and defeats covering indexes. Select the columns you use.',
    'Storing money as FLOAT. 0.1 + 0.2 ≠ 0.3; experts use integer cents or NUMERIC — every floating-money bug in history is this one.',
    'N+1 queries dressed up by an ORM: 1 query for orders, then 1 per order for its customer. The ORM hides it; pg_stat_statements (or the query count in dev toolbar) exposes it; `JOIN` or eager-loading kills it.',
    'Trusting the ORM\'s default indexes. ORMs index primary keys, not your queries — the composite index for the query your dashboard runs 10,000 times a day is on you.',
    'Deleting without soft-delete or archive strategy when the data has value (audits, recovery, "did we ever invoice this?"). Experts design deletion as carefully as creation.'
  ],

  dayInTheLife: `A backend/database engineer starts with the weekly query report (pg_stat_statements top-10 by total time). One query doubled its mean time — they grab its plan with EXPLAIN (ANALYZE, BUFFERS), see a Seq Scan over 2M rows caused by a function wrapped around an indexed column (non-sargable: the index became useless). They rewrite the predicate index-side, verify the plan on staging with production-scale data, and ship it as a reviewed migration. Mid-morning: a teammate's PR adds a CHECK constraint (price > 0) — they approve and ask for the constraint name. After lunch, they batch-delete 30M expired session rows in 10k chunks, monitoring locks between batches, then update the runbook. Final act: they catch a SELECT * in review and leave the exact column list.`,

  hiringLens: `Database interviews are workflow tests: "This query is slow — walk me through what you do" (listening for: measure first, pg_stat_statements → EXPLAIN → index/query fix → re-measure, *in that order*); "How would you design orders and order_items?" (listening for: FKs, constraints, money as NUMERIC/cents, indexes for the real access pattern); "Tell me about a migration you were scared of" (listening for: expand/contract, batching, rollback plan). Anyone can write a JOIN; seniors narrate a measurement loop.`,

  firstJobReality: `In your first months, the database will be "already designed" — your job becomes not breaking it and making it faster. The ticket that changes your reputation: "reports page is slow". If you answer with a measured plan and one index (with the before/after ms), you have done something many mid-level engineers still cannot. Also true: your first migration mistake (a missing WHERE on UPDATE, caught in staging or not) will teach you more than any tutorial — which is why professionals always write the WHERE clause first, count the rows it will hit, *then* run it.`,

  exercises: [
    'Enable pg_stat_statements on any Postgres you own (Supabase has it). Rank by total_exec_time, take the top query, capture EXPLAIN (ANALYZE, BUFFERS) before and after your fix. Keep the two plans side by side.',
    'Take a list endpoint with OFFSET pagination, convert it to keyset pagination, and benchmark both at OFFSET 100,000. Write down the ratio — you will never use OFFSET again.',
    'Add one composite index that serves a real WHERE+ORDER BY pair from your app. Verify with EXPLAIN that the sort step disappeared.',
    'Write a migration that adds a CHECK constraint on existing data *without* downtime: add NOT VALID, clean the bad rows, VALIDATE. This pattern is a professional signature.'
  ],

  goDeeper: [
    'Postgres docs: "Performance Tips" chapter + EXPLAIN reference — dense but the actual source of truth.',
    'pganalyze blog and "Postgres explain" guides — the clearest practitioner explanations of plans and buffers.',
    '"Use The Index, Luke" (use-the-index-luke.com) — free book on indexing by Markus Winand; the composite-index chapter is the expert core.',
    'Supabase docs on Row Level Security — how policy-enforced authorisation works at the database layer.'
  ],

  onePercent: `experts measure before they optimise (pg_stat_statements → EXPLAIN → fix → re-measure), encode truth as constraints, design indexes for real queries, and treat migrations as code — reversible, reviewed, and compatible with the world already running.`
};
