/* ============================================================
   Expert Layer data — Capstone: Build and Ship a Real Portfolio Project
   Grounded in: scope-cutting practice, definition-of-done
   (deployed + documented + defended), portfolio storytelling,
   DORA-style small iteration.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners scope capstones by maximum ambition — "a marketplace with AI chat, payments, and mobile apps" — and abandon them at 70%. Experts scope by **completion**: they would rather ship three finished, deployed, documented features than nine half-built ones, because recruiters cannot click a half-built feature. The second discipline: a professional "done" is not "works on my laptop" — it is **deployed, with a URL, a README that sells the work, tests that protect it, and a short demo video or screenshots**. That definition of done is why some portfolios get interviews and identical-skill portfolios do not.`,

  howExpertsWork: `They cut scope on purpose using the "core loop" test: what is the *single* user journey that proves the product's value? For a booking app it is "see availability → book → get confirmation" — everything else (admin panels, reviews, analytics) is v2. They build that loop end-to-end first — walking skeleton — then harden it (tests, error states, deployment), then polish, then *stop*. They timebox in one-week increments with a demo at the end of each, because a weekly demo forces integration and kills the "it all comes together at the end" fantasy that kills most projects. And they write the README *while building*, capturing decisions when they are fresh — the README is the interview before the interview.`,

  toolsOfTheTrade: [
    ['Walking skeleton', 'The thinnest end-to-end version of the core loop, deployed on day one', 'You are never further than one small step from "working product"'],
    ['One-page product spec', 'Users, core loop, non-goals (what you are NOT building)', 'Non-goals prevent the scope creep that kills capstones'],
    ['Decision log', 'A running file: "chose X over Y because Z"', 'Interviewers ask "why did you choose X?" — the answer must be rehearsed and real'],
    ['Deployed-from-day-one', 'CI/CD set up in week one; every merge ships', 'No "deployment week" horror at the end; the product is always live'],
    ['Demo assets', 'Screenshots, GIFs, or a 90-second video', 'Hiring managers spend 90 seconds, not 30 minutes, on your repo']
  ],

  insiderMoves: [
    'Write the README headline first: "X for Y — [one sentence]". If you cannot write it before building, the scope is not decided; the headline is the scope test.',
    'Deploy the empty app on day one. The psychological difference between "someday deployed" and "live at a URL, getting better weekly" decides most projects\' survival.',
    'Seed realistic data. A portfolio with 3 demo users looks dead; write a seed script with believable names, images, and history — reviewers judge the product they *see*, not the schema.',
    'Add one "signature detail" — a delightful interaction, a thoughtful empty state, a performance number in the README ("p95 under 200ms"). It gives interviewers something to remember you by.',
    'Handle the failure modes visibly: show your loading skeletons, your error states, your form validation. Senior reviewers look there first — that is where amateurs never look.',
    'Prepare the three questions every interviewer asks: "Why this project? What was the hardest bug? What would you do differently?" — rehearse the answers out loud with real stories.'
  ],

  fieldScenarios: [
    {
      situation: 'Week 6 of 8, and half the planned features are not started.',
      beginner: 'Cuts sleep and quality, ships everything half-broken.',
      expert: 'Cuts features, not quality: re-scopes to the core loop plus one polish item, updates the README\'s roadmap ("planned next"), and ships something finished. A smaller done product beats a bigger broken one in every review.',
      why: 'Finishing is the skill being tested; the feature list was never the point.'
    },
    {
      situation: 'A "small" feature (notifications) is swallowing week three.',
      beginner: 'Keeps grinding — it is "almost done".',
      expert: 'Timeboxes it: one more day, then it ships as v0 (email only) or gets deferred with a note in the decision log. The capstone\'s goal is a *finished portfolio piece*, not a feature checklist.',
      why: 'Timeboxes convert sunk-cost spirals into decisions; deferral is a professional tool, not failure.'
    },
    {
      situation: 'The interviewer opens the repo and the README is one line.',
      beginner: 'Says "the code explains itself".',
      expert: 'Has a README with: one-line pitch, live link, screenshots, stack and why, "getting started" commands, architecture sketch, and known limitations. The limitations section is a secret weapon — naming your own weaknesses is a senior signal.',
      why: 'The README is how the project speaks when you are not in the room — and in hiring, you are usually not.'
    }
  ],

  expertMistakes: [
    'Building tutorial-clone number five (another todo/Netflix clone). Experts add a twist that creates a story: real users (even 5), a local integration (MoMo payments sandbox, SMS), or a performance budget hit.',
    'Hidden work: great architecture with zero README, no screenshots, no deploy. If a reviewer cannot see it in 90 seconds, it does not exist.',
    'No tests at all, or 100%-coverage theatre. The professional middle: tests on the core loop and the tricky logic, honest about the rest.',
    'Undeployed "final project" syndrome — works locally, never shipped. Deployment is where you learn env vars, migrations, and HTTPS; skipping it skips the last 20% of the education.'
  ],

  dayInTheLife: `A capstone builder starts week 5 with the weekly demo: the core loop works live — booking, paying (sandbox), confirmation email. They cut the planned "admin dashboard" (defer to v2 in the decision log) and spend the day on error states for the payment flow: expired session, declined card, retry — because that is what the demo *video* will show. Mid-week they hit the hardest bug yet: webhook arrives before the transaction commits, so confirmations randomly fail. They solve it with an idempotency key + retry queue, and write it up in the decision log — knowing it will be their best interview story. Friday: seed data refreshed, 90-second screen recording captured, README updated with a new screenshot and the limitation ("webhook ordering handled via retry queue; see DECISIONS.md").`,

  hiringLens: `Reviewers spend ~90 seconds per portfolio project. The scan order is honest and brutal: live link (works?) → screenshots (looks professional?) → README first paragraph (clear?) → code (organised? tested?) → commit history (human, incremental?). Projects with a *story* — a problem, a user, a hard bug defeated — outperform technically superior projects with no narrative. And "why did you build this?" has a right answer: a real annoyance, a real user, a real constraint. "It was on the list of portfolio ideas" quietly ends interviews.`,

  firstJobReality: `The capstone's real product is not the app — it is your ability to say: "I scoped it, shipped it weekly, hit a webhook-ordering bug I solved with idempotency keys, and documented the trade-offs." That sentence pattern (scope → process → obstacle → resolution) is the architecture of every good interview answer you will give in your first two years. Build the project to *have the stories*, and record them while fresh — your future self in interviews is depending on the notes you keep now.`,

  exercises: [
    'Write the one-page spec for your capstone: users, core loop, and — the hard part — at least 5 explicit non-goals. Post it somewhere and let one experienced person red-pen it before you build.',
    'Deploy the empty walking skeleton this week: a placeholder page at a real HTTPS URL with CI auto-deploying on push. The project now cannot "not exist".',
    'Start a DECISIONS.md today. Every time you choose between two approaches, add one line: chose X over Y because Z. This file becomes your interview prep for free.',
    'Record a 90-second demo video of the current state — warts and all. Repeat monthly. The final one doubles as portfolio content; the series is your progress audit.'
  ],

  goDeeper: [
    '"The Mom Test" (Rob Fitzpatrick) — short book on validating that people actually want the thing; useful even for portfolio projects.',
    'Google SRE book\'s production-readiness thinking — the checklist mindset that separates shipped from shippable.',
    'readme.so or "Make a README" — templates for the README structure reviewers expect.',
    'Any "build in public" thread on X/LinkedIn — study how strong builders narrate weekly demos; steal the cadence, not the content.'
  ],

  onePercent: `experts finish — by scoping ruthlessly, demoing weekly, deploying from day one, and documenting decisions while fresh — because the capstone's true product is proof that they can take something all the way to done.`
};
