/* ============================================================
   Expert Layer data — Programming Fundamentals
   Grounded in: State of JS 2025 (reading-vs-writing time, TS share),
   long-lived-codebase research (code is read 10x more than written).
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners treat code as something you *write*. Experts treat it as something you *read*, *change*, and *delete*. Studies of real teams keep finding that engineers spend far more time reading and modifying existing code than typing new code — which is why "clever" code that reads badly is considered a defect by professionals, not a flex. State of JS surveys consistently show that a large share of professional codebases are typed, precisely because types are documentation that can't go stale: they tell the next reader what a function accepts without them opening it.`,

  howExpertsWork: `Before writing a function, an expert writes its **call site** — the line where someone will use it. If the call site reads badly, no amount of clever internals saves it. They name things from the caller's perspective (doesSendInvoice, not handleData), keep functions doing one thing at the level of the function's name, and when a function grows past ~40 lines they look for the *second* idea inside it and split. They also practise "make it work, make it right, make it fast" *in that order*: correctness first, clarity second, and performance only after measuring — because profiling almost always shows the hot spot is somewhere other than where intuition said.`,

  toolsOfTheTrade: [
    ['Naming thesaurus habit', 'A deliberate vocabulary of domain words (invoice, ledger, retry, backoff) reused consistently', 'Consistent names turn a codebase into a searchable, predictable system'],
    ['Rubber-duck explanation', 'Explaining your design out loud before coding it', 'The act of explaining surfaces flaws cheaply — before they cost a rewrite'],
    ['Small pure functions', 'Functions with no hidden inputs/outputs (no globals, no mutation of arguments)', 'They are trivially testable and can be reordered, parallelised, and cached'],
    ['Typing as documentation', 'Types (or JSDoc in JS) that describe inputs and outputs', 'Editors and teammates get instant, always-current documentation'],
    ['Deletion reviews', 'Reviewing PRs with the question "what can be removed?" not only "what is wrong?"', 'The best experts measure themselves by how little code remains']
  ],

  insiderMoves: [
    'Write the error message first. Decide exactly what the user sees when your function fails, then build the happy path to make that failure rare — experts design the failure modes before the success path.',
    'Keep a "changed my mind" log. When you rewrite an approach, write one line about why. Six months later, that line prevents you (or a teammate) from rewriting it back.',
    'Prefer boring data structures. A plain array of objects that everyone understands beats a clever custom class that only you understand — experts optimise for the next reader, not for elegance.',
    'Learn one keyboard-driven editor workflow (VS Code commands, multi-cursor, go-to-definition) until navigating code is faster than thinking about code. Speed of *navigation* compounds; speed of typing does not.',
    'When debugging logic you do not understand, delete everything you can and rebuild the smallest version that still shows the bug. Experts shrink problems; beginners stare at them.',
    'Read one well-known open-source file per week (not a whole repo — one file). Ask "why did they structure it this way?" — this is how vocabulary and taste are built.'
  ],

  fieldScenarios: [
    {
      situation: 'Your function works, but you cannot explain what it does in one sentence.',
      beginner: 'Ships it, thinking "it works, that is what matters".',
      expert: 'Treats it as a design smell, renames it or splits it until the sentence exists — because every future teammate will pay the cost of that missing sentence.',
      why: 'A function you cannot name cannot be searched, tested, or safely reused.'
    },
    {
      situation: 'You must choose between a clever one-liner and a clear five-liner.',
      beginner: 'Picks the one-liner to look skilled.',
      expert: 'Picks the five-liner unless the one-liner is idiomatic in that language — then documents the idiom with a comment for readers who have not seen it.',
      why: 'Code is a team asset; the cost of cleverness is paid by every future reader.'
    },
    {
      situation: 'A piece of logic keeps breaking in different places.',
      beginner: 'Patches each break as it appears.',
      expert: 'Stops and finds the *invariant* — the rule that is true at all times — then enforces it in one place so the breaks become impossible instead of rare.',
      why: 'Fixing symptoms multiplies code; enforcing invariants deletes whole classes of bugs.'
    }
  ],

  expertMistakes: [
    'Optimising code that was never measured. Even senior engineers guess wrong about hot paths constantly; profiling data beats intuition every time.',
    'Writing "temporary" code that survives for years. The fix is not never writing throwaway code — it is marking it clearly (TODO + date + ticket) so it can be found and removed.',
    'Over-abstracting early. The classic junior-to-senior trap: three similar lines are often better duplicated once than abstracted wrong. Abstractions should be extracted from evidence, not invented from imagination.',
    'Skipping the boring fundamentals (naming, formatting, small functions) while chasing advanced topics. Senior code review rejects PRs for naming more often than for algorithms.'
  ],

  dayInTheLife: `A senior engineer at a Kigali fintech starts the day reading a PR from a junior teammate — 20 minutes of *reading* before any writing. They spend the morning refactoring a payment module: they rename four variables, extract two functions, and delete 60 lines. No features shipped, yet the diff is one of the week's most valuable contributions — every future change to that module is now cheaper and safer. The afternoon is a bug hunt: they reproduce the bug with a failing test first (so it can never silently return), then fix it. Before leaving, they write tomorrow's first task as a comment in the code they were mid-way through changing.`,

  hiringLens: `When interviewers give a take-home task, they often read your code *before* they run it. They are asking three silent questions: "Will I understand this at 2am during an incident?", "Will this person's PRs be easy or painful to review?", and "Do they name things the way our domain talks?" A candidate who submits a simple, obviously-correct, well-named solution routinely beats one with fancier algorithms hidden in unreadable code — at every level from internship to staff engineer.`,

  firstJobReality: `In your first month on a real team, you will almost never design anything new. You will fix a bug in a file you have never seen, add a field to a form, and write one small function inside a 3,000-line module. The skill that makes seniors say "keep this one" is being able to say, in the team channel: "I traced the bug to line 212 of invoices.js — the tax is recalculated after the discount, here is a failing test" — not shipping something clever from scratch.`,

  exercises: [
    'Take any function you wrote this week and rewrite its name, parameters, and return value so that reading *only the call site* explains the behaviour. If you need to open the function to understand a call, it failed.',
    'Find the longest function in a project you own. Find the *two ideas* hiding inside it and split them. Run your tests before and after — nothing should change except readability.',
    'Delete something. Find dead code, a duplicate branch, or an unnecessary abstraction, remove it, and confirm the tests still pass. Log how many lines you removed this week — experts track that number.',
    'Explain one design decision from a project out loud (or to a rubber duck) for two minutes without notes. Anywhere you stumble is where your understanding is thin — that is your next study target.'
  ],

  goDeeper: [
    '"A Philosophy of Software Design" by John Ousterhout — the clearest book ever written on why some code stays simple and other code rots.',
    '"The Pragmatic Programmer" (Hunt & Thomas) — DRY, orthogonality, and tracer bullets explained by two practitioners.',
    'State of JS annual survey (stateofjs.com) — free, data-driven view of what professional teams actually use; read it once a year to calibrate.',
    'Refactoring catalog at refactoring.guru — every move has a name; learning the names makes reviews 10x faster.'
  ],

  onePercent: `experts are not people who write harder code — they are people whose code costs the team *less*: less time to read, less time to change, less time to debug. Optimise for the reader and you will out-ship everyone optimising for the writer.`
};
