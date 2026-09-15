/* ============================================================
   Expert Layer data — Testing & Debugging Discipline
   Grounded in: test-pyramid practice, Kent Beck TDD discipline,
   debugging-as-science (hypothesis → experiment → observe),
   flaky-test management, mutation thinking.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners write tests *after*, as documentation of what they already know works — which is why such tests pass on the first run and prove nothing. Experts use tests as a **thinking tool**: write the failing test first (it fails, so it is testing something), make it pass with the simplest code, then refactor. Kent Beck's rule holds: "test everything that could possibly break" — and nothing more. The second discipline is debugging as **science, not archaeology**: a professional never "changes things until it works"; they form a hypothesis ("the cache returns stale data when TTL expires mid-request"), design the cheapest experiment that proves or kills it, and observe. Every mystery bug yields to that loop eventually; almost none yield to guessing.`,

  howExpertsWork: `They invest in the test pyramid: many fast unit tests at the bottom (seconds), a handful of integration tests around real boundaries (database, HTTP), and few but thick end-to-end tests for the critical paths ("user can sign up and buy"). When a bug arrives from the outside world, the ritual is sacred: **first write the failing test that reproduces it, then fix** — the test becomes permanent proof the fix works and a tombstone for that bug class. They also treat test *failure* as data: a suite with flaky tests gets quarantined and fixed or deleted, because a suite that lies 5% of the time is a suite nobody trusts — which is the same as having none.`,

  toolsOfTheTrade: [
    ['Watch-mode testing', 'Tests re-running on every save (jest --watch, vitest)', 'Feedback loop under a second; problems caught while context is fresh'],
    ['Coverage as a map, not a target', 'Uncovered lines show where risk lives', 'Chasing a coverage number produces fake tests; reading it produces real ones'],
    ['Time-travel / step debugging', 'Real breakpoints and watch expressions, not console.log archaeology', ' Seeing actual state beats guessing at it; log-based debugging is a habit, not a choice'],
    ['Contract/integration tests', 'Testing the real DB, real HTTP client against stubs', 'The layer where "worked on my machine" bugs are actually caught'],
    ['CI as the referee', 'Every PR runs the whole suite; green is the only merge state', 'Trust in the suite is the team\'s most valuable and most fragile asset']
  ],

  insiderMoves: [
    'Name tests by behaviour, not method: `it("refuses a coupon that expired yesterday")`. The test list becomes the documentation of what the system does — juniors read it; experts *write it as the spec*.',
    'Test the boundary values on instinct: 0, 1, -1, empty, max, max+1, and the weird Unicode name. Almost every validation bug in history lives at a boundary.',
    'When a test suite gets slow, profile *the suite*: parallelise, kill sleeps, swap network calls for fakes. A 20-minute suite gets run rarely; a 20-second suite gets run always.',
    'Learn the two-debugger rule: when stuck for 15 minutes, stop and explain the bug out loud (rubber duck or teammate). The act of narrating forces the wrong assumption into the open.',
    'Write the "reproduction script" for any mysterious bug before theorising: the smallest, fastest way to make the bug happen on demand. If you cannot reproduce it, you are not debugging — you are haunted.',
    'Use mutation thinking to test your tests: mentally (or with tools) flip a comparison and ask "which test would catch this?" If the answer is none, that logic is untested no matter what coverage says.'
  ],

  fieldScenarios: [
    {
      situation: 'A bug report: "sometimes the total is wrong after applying two discounts".',
      beginner: 'Reads the discount code line by line hoping to spot it.',
      expert: 'Reproduces first: writes a test with two discounts and an expected total, watches it fail, then instruments *only* what the hypothesis needs. Bug found in ten minutes, and the failing test stays behind as a regression guard forever.',
      why: 'Reproduction converts a mystery into a fixed target; everything after is routine.'
    },
    {
      situation: 'The team\'s 900-test suite takes 12 minutes and CI is always red.',
      beginner: 'Adds a retry mechanism to flaky tests.',
      expert: 'Quarantines flaky tests the same day, fixes or deletes them within the week, and parallelises the suite. Retries are a lie the suite tells you — a test that only passes on retry is a bug in the test *or* the code, and it must be named.',
      why: 'Suite trust is binary: once "just re-run it" becomes normal, all signal is gone.'
    },
    {
      situation: 'The on-call engineer gets paged: error rate 8%.',
      beginner: 'Starts reading code.',
      expert: 'Checks what *changed* (deploys, config, upstream status), rolls back the 14:00 deploy and watches the rate fall — then debugs calmly on the side branch. Mitigation first, understanding second; the order is the discipline.',
      why: 'Users do not care why it broke; a rollback is five minutes, a root cause can be hours.'
    }
  ],

  expertMistakes: [
    'Writing tests that assert implementation (that a private method was called) instead of behaviour (that the invoice total is correct). Every refactor breaks them, teaching the team that tests are enemies.',
    'Mocking everything. Over-mocked suites pass while production burns, because the mocks agreed with each other instead of with reality. Mock the network, not your own code.',
    'Chasing 100% coverage. The last 10% costs 50% of the effort and mostly tests getters; experts stop where new tests stop finding bugs.',
    'Debugging by superstition: changing three things at once, re-running, and shipping if it works. Whatever was fixed, the same bug will return because nobody knows why it left.'
  ],

  dayInTheLife: `A test-lead engineer starts in CI: two flaky failures overnight on main. They run both locally — pass — so they re-run with the container logs: a race in a test that assumed a 100ms API response. They make the test wait on the actual condition, not a sleep, and leave a comment explaining the trap. Mid-morning: a new feature. They write the failing test for the trickiest rule first (prorated refunds), watch it fail for the right reason, implement until green, then refactor with the safety net humming. After lunch: a bug from support ("invoice PDF shows yesterday's number"), reproduced in 6 minutes with a script that will now live in the repo as a test. They end the day deleting 3 dead tests and a 200-line setup nobody understood — the suite gets faster and more honest.`,

  hiringLens: `Interviewers test debugging more than testing: "Here is a failing test in this repo — find and fix the bug" reveals everything: do you read the assertion first? Form one hypothesis or shotgun five? Add a log or use a real breakpoint? The senior tell is saying "my hypothesis is X — let me disprove it" out loud. For testing culture, the question is "a test is flaky — what do you do?" Quarantine-fix-or-delete *today* is the professional answer; retry is the amateur one.`,

  firstJobReality: `Your first weeks will be fixing failing tests someone else wrote — and this is a gift: it forces you to read code through its tests, the fastest way to learn a codebase's intent. The habit that marks you early: when you fix any bug, you *also* bring the test that proves it, unasked. Within a month, reviewers start trusting your PRs more — because a fix with a test is a fix that cannot silently regress.`,

  exercises: [
    'Take your next bug and forbid yourself from fixing it until you have a failing test that reproduces it. Keep that test forever. This single habit is worth years of seniority.',
    'Run your suite in watch mode for one full day of coding. Notice how often red saves you within seconds of the mistake — then try going back.',
    'Find your flakiest test. Delete the sleep/wait, make it await the real condition, and run it 50 times (`--repeat=50`). Record what you found.',
    'Pick one function and write boundary tests only: empty, 0, 1, -1, max, max+1, emoji, and a 10,000-character string. Fix every failure — most functions fail three of these.'
  ],

  goDeeper: [
    '"Test-Driven Development: By Example" by Kent Beck — short, classic, and the origin of the red-green-refactor loop.',
    'Kent C. Dodds\' "Testing JavaScript" articles — testing trophy over pyramid, behaviour over implementation.',
    'Google\'s "Software Engineering at Google" ch. 11-12 (free online) — how a giant org thinks about flaky tests and test culture.',
    'Julia Evans\' debugging zine (wizardzines.com) — the hypothesis-driven debugging loop in 30 friendly pages.'
  ],

  onePercent: `experts treat a failing test as a gift (someone just specified the system's behaviour for free) and debugging as science: one hypothesis, one experiment, one observation — repeated until the bug confesses.`
};
