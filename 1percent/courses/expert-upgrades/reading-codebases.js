/* ============================================================
   Expert Layer data — Reading and Contributing to Existing Codebases
   Grounded in: codebase-archaeology practice (git log/blame as
   primary sources), reading-tests-first, Boy Scout rule, PR
   etiquette, open-source contribution norms.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners read code like a novel, top to bottom, and drown. Experts read it like detectives following leads: start where the behaviour is *visible* (the route, the UI component), follow the call chain upward to the logic, and treat **git history as the primary source** — \`git log -p src/payments/\` tells you why the code looks the way it does (look for "re: ticket #482" and "revert retry logic" — those are stories). They also read the *tests first* in any unfamiliar module: tests are executable documentation of intended behaviour, and a module's test file is the fastest honest summary of what it does and what it protects.`,

  howExpertsWork: `Before changing anything in a codebase they did not write, experts run a cheap reconnaissance: (1) run the test suite — does it even pass today? (2) find the module's tests and read them, (3) \`git blame\` the three functions they intend to touch — recent blame means active area, ancient blame means sacred code, (4) make the change behind a test, keeping the diff as small as the task allows. They follow the **Boy Scout rule** — leave code a little cleaner than found — but with discipline: cleanup is either *in* the change (tiny, related) or a separate labelled PR, never a sneaky rewrite inside an unrelated feature PR. And in open source, they read CONTRIBUTING.md and recent merged PRs *before* writing code — the fastest way to learn a project's real standards.`,

  toolsOfTheTrade: [
    ['git log -p / git blame', 'Per-line history and full patch history of any file', 'Turns "why is this code weird?" into "because of ticket #482 in 2023" — every weirdness has a story'],
    ['Test files as documentation', 'Reading the tests of a module before its implementation', 'Executable spec: shows intended behaviour, edge cases, and what the authors were worried about'],
    ['Call-hierarchy navigation', 'IDE "find usages" / go-to-definition to walk the call chain', 'Entry point → route → service → data: experts navigate, not scroll'],
    ['TODO/FIXME archaeology', 'Grepping TODOs with dates and names', 'A TODO with a date is a decision deferred; a TODO without one is a trap'],
    ['Small-diff PRs', 'One concern per PR, under ~400 changed lines when possible', 'The unit of review; also the unit of safe revert']
  ],

  insiderMoves: [
    'Trace one request end-to-end with a debugger instead of reading for an hour: put a breakpoint at the route, click the button, and watch the call stack unfold. Twenty minutes of stepping teaches more than two hours of scrolling.',
    'Read the *reverted* commits: `git log --diff-filter=M --reverse` and search for "revert". Reverts mark landmines — someone tried this before and it failed; learn why for free.',
    'In a new repo, find the "core domain" file (the one everything imports) and read it fully once. Everything else is decoration around it.',
    'When contributing to open source, start with docs, tests, or a "good first issue" *you verify is still valid* — stale first-issues are how newcomers get ignored.',
    'Write the "orientation memo" when you finish onboarding to a new codebase: where things live, how to run it, three gotchas. It cements your learning and instantly makes you valuable to the next hire.',
    'Never refactor and change behaviour in the same PR. Reviewers can verify a mechanical move at a glance; they must re-verify a move *plus* a change — and they will reject it on principle.'
  ],

  fieldScenarios: [
    {
      situation: 'Assigned a bug in a 200,000-line codebase you have never seen.',
      beginner: 'Reads files "near" the bug name and guesses.',
      expert: 'Reproduces first (or finds the test that covers it), then walks *backward* from the symptom: which endpoint/function produced the wrong output? Sets a breakpoint there and inspects inputs. Only reads the code on the actual path taken.',
      why: 'Reading everything is impossible; the execution path is a filter that deletes 99% of the codebase.'
    },
    {
      situation: 'The function you must modify is 300 lines with no tests.',
      beginner: 'Rewrites it "cleanly" in the same PR as the bug fix.',
      expert: 'Characterises it first: writes tests that pin down *current* behaviour (including the weird parts), locks them green, then makes the change. If a rewrite is warranted, it is a separate reviewed PR with the safety net already in place.',
      why: 'Uncharacterised refactors are how "cleanups" introduce the bugs that get pages at night.'
    },
    {
      situation: 'Your PR touches a file another PR also touched; both are open.',
      beginner: 'Merges first and lets the second person resolve the mess.',
      expert: 'Pings the other author early, agrees who rebases onto whom, and coordinates the rebase before either merges. Two minutes of talking saves an afternoon of conflict resolution.',
      why: 'Merge conflicts are social problems with a technical surface.'
    }
  ],

  expertMistakes: [
    'Refactoring as you go, invisibly, inside feature PRs. Reviewers cannot tell what is new behaviour vs moved code; the PR gets rejected or, worse, approved unread.',
    'Assuming weird code is stupid code. It is usually load-bearing: a timezone bug, a race, an old customer\'s edge case. Experts ask git history *before* "fixing" it.',
    'Not asking questions early. The expensive mistake is two days of silence followed by "I was stuck"; seniors ask precise questions after a genuine 30-minute attempt ("I found X, expected Y, tried Z — is my assumption about the auth flow right?").',
    'Reading documentation instead of the code when they disagree. Docs rot; code and its tests are the truth. When they conflict, believe the tests and file a docs issue.'
  ],

  dayInTheLife: `An engineer joins a fintech codebase (120k lines) as the newest hire. Day one: repo running locally in two hours, then they write the orientation memo while it is fresh. Day two: first ticket — a rounding bug in loan interest. They find the test file first (interest.test.js, 40 cases — the domain explained), then \`git blame\` the interest function: last touched eight months ago with message "re: CBK rounding directive" — the weirdness is *regulatory*. They add a failing test reproducing the reported case, discover the bug is a floating-point comparison (0.1 + 0.2), fix with integer basis points, and open a 60-line PR: failing test, fix, one comment citing the directive. The reviewer approves in an hour with "best first PR this quarter" — not because of brilliance, but because the diff told a complete story.`,

  hiringLens: `The "read this codebase and fix this bug" interview is the most predictive screen there is — and it is graded on process, not speed: Does the candidate run the tests first? Find the entry point or read randomly? Form hypotheses or shotgun? Candidates who narrate ("I expect the bug to be in validation because the error message says 422...") score highest — thinking out loud is the job. For open-source contributions, reviewers read your *PR conversation* as much as the code: polite, precise, responsive-to-feedback is the whole reputation system.`,

  firstJobReality: `Realistically: months one through three are 90% reading, 10% writing. That ratio is not a bug in your job — it is the job. The compound habit that separates fast risers: keep a personal "codebase map" file (routes → services → tables, with one line each). By month three you will have the map juniors take a year to build, and you will be the one answering the next hire's questions — which is precisely when seniors start treating you as staff.`,

  exercises: [
    'Pick a mid-sized open-source repo you admire. Without running it, answer: where is the entry point, where are the core domain objects, and where are the tests? Verify by running. Repeat monthly with a new repo.',
    'Take a function you are about to change and run `git log -p` on it. Write two sentences on why the code looks the way it does. If you cannot, you have found your first real question for the team.',
    'Find the oldest TODO in your codebase. Investigate: is it still relevant, done, or a landmine? Report back in one paragraph — this is archaeology, the actual job.',
    'Make one contribution to an open-source project this month: a doc fix, a failing-test report, or a tiny PR. The full cycle (issue → PR → review → merge) is a career skill no tutorial teaches.'
  ],

  goDeeper: [
    '"Working Effectively with Legacy Code" by Michael Feathers — the canon on changing code without tests; characterisation tests are the core technique.',
    '"Software Engineering at Google" ch. 16-19 (free online) — how a giant org handles codebase health and ownership.',
    'The code-review chapter of any mature CONTRIBUTING.md (e.g. Kubernetes, React) — reading a great project\'s rules is a masterclass.',
    'Dan Luu\'s essays (danluu.com) on code review and technical hiring — practitioner wisdom with receipts.'
  ],

  onePercent: `experts treat an unfamiliar codebase as a crime scene: tests and git history are the witnesses, the execution path is the trail, and every weird line has a story — find the story before you touch the line.`
};
