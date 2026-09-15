/* ============================================================
   Expert Layer data — Problem-Solving Under Constraints
   Grounded in: triage practice, MoSCoW/timeout discipline,
   "boring technology under deadline" doctrine, the two-list
   (Warren Buffett) prioritisation story, incident timeboxing.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners attack problems in the order they arrive. Experts **triage**: they separate the problem's *deadline* from its *importance*, then attack in the order that protects the user, the deadline, or the data — whichever is truly most at risk. Under pressure they reach for the same three levers, always in the same order: **cut scope** (what can we ship without?), **buy time** (flag it now, re-plan, never silently slip), **add resources** (only after the first two — adding people to a late project makes it later, as Brooks' Law has said for fifty years). And the deepest habit: experts say **"I don't know — I'll find out by 3pm"** out loud, early, instead of disappearing into heroic silence and emerging either a legend or too late.`,

  howExpertsWork: `Given a deadline, they run a quiet MoSCoW pass: Must / Should / Could / Won't — and they get the *Must* list agreed in writing by the stakeholder, because half of all deadline crises are scope disputes wearing a technical costume. They build with **boring technology** under pressure (the product should be new; the plumbing should be old) and isolate every risky bet behind a timebox: "spike: two days to prove the API works; if not, we use plan B". When stuck, the escalation is a move, not a failure: timebox → ask → change approach → escalate — each step timed, never skipped. The Warren Buffett two-list story is the culture: 25 goals, circle the top 5, and treat list B (the other 20) as *avoid at all cost* — because they are the things that feel productive while killing the deadline.`,

  toolsOfTheTrade: [
    ['MoSCoW + written Must-list', 'Prioritisation with stakeholder sign-off on the minimum', 'Converts deadline panics into scope conversations before they start'],
    ['Timeboxed spikes', 'Fixed-size experiments (max 2 days) with a written plan-B', 'Risky unknowns get contained; sunk cost gets capped by design'],
    ['The two-list discipline', 'Top-5 goals vs the avoid-at-all-cost rest', 'Focus is subtraction; the B-list is where deadlines die'],
    ['Early-slip rule', 'Flag delays the moment predicted vs actual diverges', 'A slip announced early is a plan; a slip announced late is an apology'],
    ['Post-ship retro', '30 minutes: what did the pressure teach us about estimates?', 'Turns every crunch into calibration data instead of trauma']
  ],

  insiderMoves: [
    'When everything is urgent, ask the killer question: "what happens if this slips by one week?" The answers are never equal — that asymmetry *is* the priority order, and stakeholders reveal it instantly.',
    'Under deadline, always allocate 20% to the "unknown unknowns" buffer *out loud*: "I plan for 8 days, which includes buffer." Hiding the buffer inside optimism is how late happens.',
    'Make the plan-B decision *before* the spike: "if we can\'t prove X in two days, we ship the 80% solution." Deciding in advance turns a potential crisis into a pre-agreed switch.',
    'When blocked on a person, escalate *with* a draft: "I need Alice\'s decision on the API shape; here are the two options and my recommendation." Escalations that arrive pre-thought get answered same-day.',
    'Learn the "knight move" under pressure: change the *problem* when the *solution* is stuck. Can we ship manual approvals instead of automated ones? Experts redefine the win; beginners grind.',
    'Protect a daily shutdown ritual during crunches: write tomorrow\'s first task before leaving. Crunch burnout is a sequence of unended days; the ritual ends each one.'
  ],

  fieldScenarios: [
    {
      situation: 'Launch is Friday; Wednesday testing reveals the payment edge case: 2% of payments double-charge.',
      beginner: 'All-nighter to "fix it properly" — arrives Friday with an untested 3am fix.',
      expert: 'Sizes the containment: is 2% acceptable if support can refund instantly? Ships Friday with the idempotency guard for the *known* trigger, a detection alert, and a documented refund runbook — then fixes the root cause next week with full testing. Risk is managed, not worshipped.',
      why: 'Under deadline, professionals ship *contained* risk with a rollback and a monitor — not heroic all-nighter code nobody has reviewed.'
    },
    {
      situation: 'The task you promised for Tuesday is now realistically Thursday, and it is Monday.',
      beginner: 'Works silently, hoping for a miracle, announces Thursday on Thursday.',
      expert: 'Announces Monday: "I will miss Tuesday — here is what I can deliver Tuesday (the API, no UI), and the rest Thursday. Does that work?" The early announcement converts a trust problem into a plan the team participates in.',
      why: 'Bad news early is management; bad news late is betrayal — same facts, opposite outcomes.'
    },
    {
      situation: 'You have been stuck for 45 minutes on an environment issue before a demo.',
      beginner: 'Keeps grinding — "I\'m close" (you are not).',
      expert: 'The 45-minute rule: timebox, then switch to plan B (a recorded demo, a staging environment, a colleague\'s machine). The demo must happen; your pride in the environment fix is not on the agenda.',
      why: 'The goal is the demo, not the environment; experts keep the goal visible above the obstacle.'
    }
  ],

  expertMistakes: [
    'Protecting scope instead of the deadline *or* quality. Pick two of {scope, time, quality} consciously and say it aloud — silent scope-protecting is how both time and quality die together.',
    'Adding people to a late project (Brooks\' Law). Nine women cannot make a baby in one month; experts know the real levers are scope and time, and use headcount only for *parallel new* work.',
    'Solving the interesting problem instead of the blocking one. The clever refactor is a sedative under deadline; experts do the boring fix first and schedule the interesting one.',
    'Heroic silence: suffering alone for days to "not bother anyone". Teams are damaged far more by surprises than by requests for help — asking early is a service, not a debt.'
  ],

  dayInTheLife: `A mid-level engineer faces crunch week: the client demo is Friday, and integration testing surfaced that the report export fails on accounts with >10k rows. Morning: a 15-minute triage with the PM — they agree the *demo* needs the export for the standard accounts (95%); big accounts get a "request by email" flow documented on screen. The Must-list is now three items, in writing, signed off in chat. Midday: a timeboxed spike on a streaming fix (2 hours max, plan B = row cap with a clear UI message) — spike succeeds partially, plan B ships with the message "exports over 10k rows are processed nightly — request here". Wednesday: demo rehearsal reveals a broken font on the client's browser; 20 boring minutes, fixed, no drama. Thursday night is *rest* by design — the crunch was managed by scope, not survived by caffeine. Friday demo lands. Retro on Monday: one line in the calibration log — "export scope was discoverable on day one; add 'largest real dataset' to kickoff checklists."`,

  hiringLens: `Interviewers manufacture constraint pressure deliberately: "you have two hours, ship one feature" or "the demo is in three days and X broke — what do you do?" The scoring rubric is rarely about the code; it watches for: triage before typing, scope-cutting proposals offered *by the candidate* (not extracted), early bad-news simulation ("when would you tell the team?"), and calm under an injected change ("the API is down — now what?"). Candidates who ask "what matters more: scope or date?" are exhibiting the exact judgement the interview exists to find.`,

  firstJobReality: `Your first deadline crunch will feel existential; it is neither the first nor the worst anyone there has seen. The behaviours that get noticed in the crunch — and remembered for a year: you announced your slip before being asked, you proposed cutting something yourself, you asked for help within 45 minutes of being truly stuck. The behaviours that get quietly noted the other way: silent grinding, hidden buffer, scope protection with an all-nighter. Crunches are auditions; play them like one.`,

  exercises: [
    'Take your current project and run the two-list exercise: write every remaining task, circle the five that actually change the outcome, and mark the rest "avoid until ship". Notice how much of your list is the B-list.',
    'Run a MoSCoW pass on your next feature with a stakeholder (or a friend as one). Get the Must-list agreed *in writing* before starting. Note how many "requirements" quietly die on contact.',
    'Practise the early-slip: next time you are even 10% behind, announce it with a recovery plan the same day you know. Keep a log of the reactions — you will never hide a slip again.',
    'Set a 45-minute timer the next time you are stuck. When it rings, you must do one of: ask a precise question, switch approach, or change the problem. Track what happens over a month.'
  ],

  goDeeper: [
    '"The Mythical Man-Month" by Fred Brooks — 50 years old and still the truth about deadlines and adding people.',
    '"The Goal" by Eliyahu Goldratt — the theory-of-constraints novel; triage thinking for systems and schedules.',
    'Dan Luu\'s "95%-ile isn\'t that good" and reach articles on practice — how expert judgement is actually built.',
    '"Essentialism" by Greg McKeown — the two-list discipline, expanded into a whole operating system for focus.'
  ],

  onePercent: `experts triage before they grind: they cut scope early, announce slips before being asked, timebox risky bets with a pre-agreed plan B, and treat asking for help as a move in the game — not a confession.`
};
