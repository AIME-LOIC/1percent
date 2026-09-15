/* ============================================================
   Expert Layer data — Technical Communication
   Grounded in: BLUF/audience-first practice, RFC/design-doc
   culture, Google's engineering-docs style, incident-comms
   discipline, README-as-marketing.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners write to document what they built. Experts write to **move a specific reader to a specific action** — and they decide who that reader is *before* typing a word. The professional pattern is BLUF (Bottom Line Up Front): the first sentence is the decision, recommendation, or headline; everything after is support. The second discipline: match depth to audience — the same auth-system change produces three artifacts: a 5-line changelog for users, a 1-page design decision for the team, and a 200-word paragraph for execs that says "risk reduced, no downtime, no customer action needed". Experts know that "I explained it clearly" is not the goal — "the reader did the right thing without asking me" is.`,

  howExpertsWork: `On strong engineering teams, **writing is the architecture process**: a short RFC or design doc (problem, constraints, 2-3 options with trade-offs, recommendation) is circulated *before* the code, and the review comments improve the design while changing it costs nothing. Docs are treated as product: a README gets a pitch, a quickstart that works copy-paste, and honest limitations; API docs show a request *and* its response for every endpoint. And in incidents, communication follows a rigid template — what happened, what is affected, what we are doing, next update at HH:MM — because during an outage, a confident "we know, we are on it, next update 14:30" is itself part of the fix.`,

  toolsOfTheTrade: [
    ['BLUF structure', 'Bottom line up front, then support', 'Busy readers get the decision in 5 seconds; detail is optional, not mandatory'],
    ['RFC / design doc', '1-2 pages: problem, options, trade-offs, recommendation', 'Async decision-making across timezones; the written record outlives the meeting'],
    ['ADR (Architecture Decision Record)', 'One short file per significant choice: context → decision → consequences', 'Six months later, "why did we use queues?" is answered by a file, not a former employee'],
    ['Runbook / incident template', 'Symptom, diagnosis, fix, verification — pre-written and rehearsed', '3am responses become checklists instead of improvisation'],
    ['Diátaxis framework', 'Docs split by reader need: tutorials, how-to, reference, explanation', 'The reason great projects\' docs feel effortless — each mode has one job']
  ],

  insiderMoves: [
    'Write the PR description *for the reviewer*, not for history: what changed, why, how it was tested, and where to look carefully. The best reviewers review the riskiest part first — tell them where it is.',
    'Make every README quickstart copy-paste clean: if step 3 requires a step 2.5, the doc is broken. Test your own quickstart by literally pasting it into a clean VM.',
    'Use the "answer, then nuance" pattern in chat: first line answers the question fully, following lines add caveats. "It depends..." as an opener makes readers wait for the answer; lead with the answer.',
    'In code review comments, separate severity from opinion: "blocker: this drops the where clause" vs "nit: prefer early return" — label them. Unlabeled feedback forces authors to guess what matters.',
    'Keep a snippets file of your clearest past explanations (the incident summary you nailed, the design doc that got approved). Reuse structures, not just words — strong writers are plagiarists of their own best work.',
    'Write the postmortem *before* the retrospective meeting and ask for written comments first: written-first culture surfaces the quiet engineer\'s insight that meetings bury.'
  ],

  fieldScenarios: [
    {
      situation: 'Production is down; the CEO asks for an update in the incident channel.',
      beginner: 'Writes a paragraph of debugging detail with uncertain conclusions.',
      expert: 'Posts the template: "Known issue: checkout failing for ~15% of users. Cause suspected: payment provider. Actions: rolled back 14:02, monitoring. Next update 14:30 or sooner." Calm, timed, factual — and updated exactly when promised.',
      why: 'In incidents, confident uncertainty plus a promised update time beats heroic detail; the update *is* the product.'
    },
    {
      situation: 'You disagree with a senior\'s design in review.',
      beginner: '"This seems wrong, why not just use Redis?"',
      expert: 'Restates their goal, names the trade-off, offers evidence: "If the goal is sub-ms reads, agreed. My concern is the 200ms cache-fill stampede on cold start — option B adds a lock; option C pre-warms. Happy to be wrong, which constraint am I missing?"',
      why: 'Criticism aimed at the design (with the trade-off named) gets engaged; criticism aimed at the person gets defended.'
    },
    {
      situation: 'A stakeholder asks "can we add one small field to the report?" (it is not small).',
      beginner: '"No, that\'s a big change." (reads as obstruction)',
      expert: 'Translates cost into options with trade-offs: "The quick version ships this week but only for this quarter\'s data. The full version needs a schema change — two weeks. Want quick-now, full-later, or a hybrid?" The stakeholder makes an informed choice; you look like a partner, not a wall.',
      why: 'Saying "no" is a communication failure; pricing the trade-offs is the professional move.'
    }
  ],

  expertMistakes: [
    'Writing for the wrong reader: dumping implementation detail on executives or watermarking engineer docs with business fluff. Every artifact has an audience; name it first.',
    'Burying the lede: three paragraphs of context before the recommendation. Readers who give up at paragraph two make decisions without your input — that is how designs get made without you.',
    'Docs that die: a Confluence with 400 pages and no owners or dates. Experts prefer fewer living docs — every page has an owner and a "last verified" date.',
    'Jargon as armour: "we need to refactor the monolith to event-driven microservices" instead of "deploys take a week because everything changes together; I want to split the two most-changed parts". Concrete beats abstract, always.'
  ],

  dayInTheLife: `An engineer's morning starts with writing, not coding: the RFC for the notification service is due for comments. One page: problem (users miss renewals), two options (in-app + email vs SMS-first), costs, and a recommendation with the one-line trade-off ("SMS-first costs $0.03/msg but reaches the 60% of users without reliable data; recommend hybrid: email first, SMS for overdue"). Comments arrive by noon; one challenge ("why not push notifications?") earns a paragraph answering the *constraint* (push opt-in is 30% here) and an updated option table. After lunch: a PR description with a "review here first" pointer; two review comments carefully labeled [blocker] and [nit]. The day ends with an incident-update post in the incident channel, written in the four-line template and updated exactly on schedule — the on-call lead later calls it "the calmest channel of the quarter".`,

  hiringLens: `Writing is screened at every senior level: take-homes are read for structure (BLUF? audience?), and interviewers explicitly score "can this person explain a technical trade-off to a non-technical stakeholder?" The prompt "explain your last project to me like I'm the CFO" is common — the winners lead with the business outcome, then offer depth on request. Portfolio tip that beats any course: a README with a clear pitch and honest limitations has gotten candidates hired on communication alone; a perfect repo with a one-line README has gotten them rejected.`,

  firstJobReality: `Your writing will matter before your code does: your first PR description, your first "I'm blocked" message, your first incident note. The pattern that builds your reputation fastest: short, structured updates nobody has to chase — "Done: X. Doing: Y. Blocked on Z; I'll ask Alice at 3pm." Managers remember the engineer whose status is always *known*; that trust is what gets you the interesting work later.`,

  exercises: [
    'Rewrite your last PR description using: what/why/how-tested/risky-part. Then ask a teammate to review a *different* PR using only your description — every question they ask is a sentence you should have written.',
    'Write a one-page ADR for a real decision in your project (even a personal one): context, two options, trade-offs, decision, consequences. Keep it under 300 words — that constraint is the skill.',
    'Take your README and test the quickstart by copy-pasting it into a fresh directory (or VM). Fix every stumble. Record how many there were; that number is your docs bug count.',
    'Write a fake incident update: service X down, suspected cause, actions taken, next update time. Then write the 14:30 follow-up. Read both aloud — if any sentence would embarrass you in front of the CEO, rewrite it.'
  ],

  goDeeper: [
    'Google "engineering documentation" guides and the Diátaxis framework (diataxis.fr) — the two best free sources on structuring technical docs.',
    '"On Writing Well" by William Zinsser — the classic; principles transfer directly to engineering writing.',
    '"The Mom Test" and "Crucial Conversations" — for the conversations *around* the documents.',
    'Julia Evans\' blog on explaining technical topics — the masterclass in making complex things simple without lying.'
  ],

  onePercent: `experts write to move a reader to action: bottom line up front, audience named before typing, trade-offs priced not preached — and in incidents, calm timed updates are treated as part of the fix.`
};
