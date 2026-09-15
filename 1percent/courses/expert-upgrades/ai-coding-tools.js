/* ============================================================
   Expert Layer data — Working with AI Coding Tools Properly
   Grounded in: current practitioner consensus on agentic coding
   (spec-first prompting, small diffs, verification loops),
   context engineering, OWASP-style supply-chain vigilance for
   AI-suggested dependencies.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners prompt AI like a vending machine ("write me a login page") and accept whatever comes back. Experts treat AI like a **talented junior teammate**: astonishingly fast, needs clear specs, must be reviewed, and never gets the final word on architecture. The professional loop is: write the spec (or let AI draft it and *you* edit it), let the AI implement, then **review the diff like it came from a stranger** — because the failure mode is never "the code is bad", it is "the code is plausible and subtly wrong". The second expert discipline: context is everything. A prompt with the relevant file, the error message, the test that fails, and the constraint you care about produces 10x better output than a one-liner prompt, no matter which model you use.`,

  howExpertsWork: `They keep AI on a short leash with verification at every step: small tasks, tests after every change, a \`git diff\` read before any commit, and hard stops when the model starts hallucinating APIs (the tell: confidently inventing a method that does not exist — experts verify unfamiliar APIs against docs, always). They also know where AI is *weak*: novel architecture, security-critical auth code, and anything where the cost of a subtle bug is high. There, AI is the reviewer and rubber duck, and the human writes the code. And they invest in their context assets: a good CLAUDE.md/AGENTS.md-style project file (conventions, commands, gotchas) pays off on every single interaction.`,

  toolsOfTheTrade: [
    ['Spec-first prompting', 'Describe behaviour, constraints, and tests *before* asking for code', 'The model implements your intent instead of guessing it'],
    ['AGENTS.md / project rules file', 'A repo file (AGENTS.md) with conventions, commands, and pitfalls read by AI tools', 'Every AI session inherits your standards automatically'],
    ['Small-diff workflow', 'One task per AI session; review and test between each', 'Reviews stay possible; errors get caught at birth, not harvest'],
    ['Test-first with AI', 'You write the failing test; AI makes it pass', 'Tests define "done" objectively — hallucinations cannot pass a real test suite'],
    ['Docs-in-the-loop', 'Verifying unfamiliar APIs against official docs before use', 'The #1 expert filter for plausible-but-invented code']
  ],

  insiderMoves: [
    'Paste the *failing test output* before pasting code. Error messages contain the model\'s best leverage; vague vibes in, vague code out.',
    'Ask for options, not answers: "give me three approaches with trade-offs" — then you choose. This keeps architectural judgement yours and turns AI into a design partner.',
    'Never let AI commit directly to main. Expert rule: AI writes the branch, you review the diff, CI runs the suite — the same trust chain as any junior hire, and for the same reasons.',
    'When the model is stuck in a loop, start a fresh session with a clean summary instead of arguing with it. Context rot is real; a new session with the *right* three files beats a 50-message thread.',
    'Ask AI to critique its own output: "what edge cases does this miss? what would a senior reviewer flag?" The self-review pass catches a shocking share of bugs for free.',
    'Audit AI-suggested dependencies like supply-chain attacks: that npm package it confidently imported may be real, abandoned, or a typo-squat. `npm view` before you `install`.'
  ],

  fieldScenarios: [
    {
      situation: 'AI generated 200 lines that pass all tests on the first try.',
      beginner: 'Merges it — tests pass, ship it.',
      expert: 'Reads all 200 lines anyway and asks: is the error handling real or performative? Are there invented APIs? Is the code *understandable* to the team? Then checks the tests: do they test behaviour, or do they test the implementation the model happened to choose?',
      why: 'Plausible-and-wrong is the expensive failure mode; tests can pass while the edge cases burn.'
    },
    {
      situation: 'A refactor "works" but the diff is 40 files.',
      beginner: 'Accepts it — the model said it is done.',
      expert: 'Splits it: one mechanical rename PR (reviewable, safe), one logic PR (small, tested). Or rejects and re-prompts with tighter scope. A diff no human can review is a diff nobody vouches for.',
      why: 'Unreviewable code is how teams quietly lose ownership of their own codebase.'
    },
    {
      situation: 'The model keeps forgetting the project convention (your error format, your folder layout).',
      beginner: 'Repeats the convention in every prompt, gets annoyed.',
      expert: 'Writes it once in the project rules file (AGENTS.md / system prompt / saved snippet) with a tiny example. The convention stops being a prompt and becomes infrastructure.',
      why: 'Context you repeat is a process bug; context you persist is a system.'
    }
  ],

  expertMistakes: [
    'Letting skills atrophy: accepting every suggestion without asking "would I have written this, and do I *understand* it?" Experts use AI to skip typing, never to skip understanding — in the interview, the code you cannot explain is code you did not write.',
    'Prompting security-sensitive code (auth, payments, crypto) and shipping it. AI reproduces training-data averages; attackers read the *tails*. Human-written, human-reviewed, or both.',
    'Vibe-debugging: pasting errors until something compiles. It works eventually and teaches nothing; the fix that lands may be cargo-cult, and the next bug will be worse.',
    'Assuming newer model = correct model. Model quality changes nothing about the review step; experts\' trust is a function of tests and diff-reading, not of model version.'
  ],

  dayInTheLife: `An engineer starts with a feature ticket. They write a 6-line spec in the issue (behaviour, edge cases, done-when), then ask the AI tool to draft an implementation plan — they edit two points (the model missed the rate limit and the offline case). Implementation happens in three small sessions: session one generates the service function against a failing test; they run the suite (green), read the diff line by line, and catch an invented \`retryWithBackoff\` helper that does not exist in their utils — replaced with the real one after checking docs. Session two does the endpoint; session three the UI. Between each, a commit with a human-reviewed diff. In the afternoon they flip roles: AI implements a boring CRUD screen while they review, and they spend saved energy on the hard part — deciding the API shape. Before leaving, they update AGENTS.md with the convention the model kept missing: "all money in integer cents".`,

  hiringLens: `Interviews have changed: take-homes increasingly allow AI, and the differentiator is what happens around it. Interviewers ask "you used AI for this — walk me through what you reviewed and what you changed" and can smell the difference between a candidate who verified and one who pasted. New screens appear: "how do you prevent an AI tool from suggesting a malicious dependency?", "when would you *not* use AI?" (security-critical code, novel architecture, learning-critical tasks). The uncomfortable truth: juniors are now judged on judgement — because the typing is free for everyone.`,

  firstJobReality: `Paradox of the AI era: your first job expects AI fluency *and* distrusts AI output. The winning posture: be the fastest implementer on the team *and* the person whose AI-assisted PRs get approved without re-work — because you read the diff, ran the tests, and caught the invented API. Also: the questions you can still answer without AI (why this architecture, what breaks at scale, how would you attack this) are exactly the questions interviews and promotions run on. Keep those muscles fed.`,

  exercises: [
    'Take a feature you built manually. Rebuild it with AI using spec-first prompting: write the spec and failing tests first, then let the model implement. Compare quality, time, and how much of the code you actually understand.',
    'Write an AGENTS.md for your repo: conventions, common commands, three gotchas, and one thing the AI must never do. Use it for a week and note every repeated correction it saves.',
    'Red-team an AI output: generate a piece of code, then spend 20 minutes deliberately hunting for hallucinated APIs, wrong error handling, and edge cases. Keep a list — this is your personal review checklist now.',
    'Do one full day coding without AI (or with it muted). Notice where it was genuinely faster and where you were — sharpen the boundary; that line is your career.'
  ],

  goDeeper: [
    'Anthropic\'s prompting and agentic-coding guides — the clearest practitioner documentation of context engineering.',
    'OWASP "Software Supply Chain Failures" (Top 10:2025) — dependency vigilance applies double when AI suggests packages.',
    'Simon Willison\'s blog — the longest-running honest practitioner log of what LLMs can and cannot do in real work.',
    '"Software Engineering at Google" ch. on code review — the review discipline AI workflows are built on.'
  ],

  onePercent: `experts get leverage from AI without surrendering ownership: they spec before prompting, review every diff like a stranger wrote it, verify every unfamiliar API, and keep the judgement — architecture, security, taste — firmly human.`
};
