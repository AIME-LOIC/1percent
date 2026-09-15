/* ============================================================
   Expert Layer data — Git & GitHub
   Grounded in: Git internals (plumbing/porcelain), linux kernel
   workflow, trunk-based development research, conventional commits.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners memorise git commands and hope. Experts understand the **object model** underneath — every commit is a snapshot addressed by a hash, every branch is just a 41-byte file pointing at a commit, and a merge conflict is not git breaking, it is git honestly telling you two people expressed different intents. That mental model is why experts seem calm when git "loses" work: almost nothing is ever truly lost, it is just unreferenced — and \`git reflog\` is the expert's recovery tool of first resort. They also know when *not* to use git's sharpest tools: rebasing shared branches or force-pushing to main are the fastest ways to lose a teammate's trust.`,

  howExpertsWork: `The Linux kernel — the largest collaborative software project in history — runs on patches reviewed as diffs in email, not on git platforms. The lesson experts take from it: **history is a story for the next reader, not a backup**. So they commit small, single-purpose units, write commit messages explaining the *why* ("Return 409 on duplicate emails so signup retries don't create ghosts"), and rewrite history freely *before sharing* and almost never after. On teams, they default to short-lived branches merged to a trunk (trunk-based development) — because long-lived feature branches hide integration pain until the merge, when it is most expensive.`,

  toolsOfTheTrade: [
    ['git reflog', 'A log of every position HEAD has ever pointed to', 'The reliable undo: recovers "deleted" commits and botched rebases'],
    ['git bisect', 'Binary search through history to find the commit that introduced a bug', 'Turns "it broke somewhere in the last 300 commits" into a 9-step hunt'],
    ['git add -p / rebase -i', 'Stage or rewrite changes hunk-by-hunk, interactively', 'Lets experts craft clean, reviewable, single-purpose commits from messy work'],
    ['Conventional Commits', 'A commit format (feat:, fix:, docs:, chore:) parsed by release tools', 'History becomes machine-readable changelogs and version bumps'],
    ['Stash with intent', 'git stash push -m "wip: cart totals"', 'Named stashes prevent the "what was in stash@{2}?" mystery']
  ],

  insiderMoves: [
    'Never resolve a conflict by picking "ours" or "theirs" blindly. Experts read the third, combined version line-by-line — the conflict markers show both intents, and the correct resolution is usually a *conversation*, not a choice.',
    'Use `git log --oneline --graph --all` as your map. Experts orient themselves in an unfamiliar repo with this single command before touching anything.',
    'Amend or fixup freely in your own unpushed branch, never on a shared one. The rule that keeps teams fast: "history is mutable until someone else has seen it."',
    'When a PR grows beyond ~400 changed lines, experts stop adding to it and split it. Review quality collapses with size — most reviewers approve large diffs with a glance, which is worse than not reviewing.',
    'Commit messages that start with a verb in the imperative mood ("Add rate limiter", not "Added") read like a changelog, and changelogs can then be generated automatically.',
    'Tag every production release (`git tag -a v1.4.0`). When an incident happens at 2am, "what exactly is running in production?" must be a one-command answer.'
  ],

  fieldScenarios: [
    {
      situation: 'You committed to main by mistake and already pushed.',
      beginner: 'Force-pushes main back, deleting teammates\' commits from the remote.',
      expert: 'Never rewrites shared history — creates a new commit that undoes the mistake (`git revert`), then moves the real work to a branch properly. Force-push to main is a fireable-level mistake in most teams.',
      why: 'Everyone else has built on the pushed history; rewriting it poisons every clone.'
    },
    {
      situation: 'A teammate\'s branch conflicts with yours on the same lines.',
      beginner: 'Resolves alone, picks a side, merges.',
      expert: 'Resolves with both authors present (or clearly proposes a resolution in the PR), because a conflict is proof two people made overlapping decisions that need aligning — technically and socially.',
      why: 'Silent conflict resolution is how duplicated logic and lost fixes enter production.'
    },
    {
      situation: 'A bug appeared "some time in the last two weeks".',
      beginner: 'Reads hundreds of lines of diffs hunting by eye.',
      expert: 'Runs `git bisect start`, marks good/bad endpoints, and lets git binary-search the history — usually finds the culprit commit in under ten automated steps.',
      why: 'Finding the *commit* that introduced a bug reveals the *reason* the bug exists.'
    }
  ],

  expertMistakes: [
    'Keeping private keys, .env files, or dumps in commits. Once pushed, a secret must be treated as burned and rotated — history rewriting (filter-repo) is expensive and imperfect. Experts prevent with .gitignore on day one.',
    'Giant "I did lots of stuff" commits. Everyone does it; experts have just learned to break the habit by committing at natural checkpoints — every green test suite is a commit point.',
    'Using merge when rebase would keep history readable (or vice versa) dogmatically. The actual expert rule: rebase *your own* unshared work onto the trunk; merge to *integrate reviewed* work.',
    'Treating the PR description as optional. The diff shows what changed; only the description can say what should be reviewed carefully, how it was tested, and what it breaks.'
  ],

  dayInTheLife: `A senior engineer starts by reviewing two small PRs with precise comments ("this early return hides the validation error — can we surface it?"). Mid-morning, CI fails on main; they use \`git log --oneline\` on the failing step, identify the suspect commit from its message, and revert it with \`git revert\` — four minutes to restore a green build. After lunch, feature work: three small commits on a branch ("extract validator", "add failing test for discount edge", "fix: apply discount before tax"). Before opening the PR they rebase onto main and re-run tests locally, so the reviewer sees a clean, conflict-free, single-purpose diff.`,

  hiringLens: `Interviewers routinely probe git with scenario questions: "You pushed a bug to main — walk me through your next 10 minutes." They are listening for the instincts: revert not rewrite, reflog not panic, bisect not eyeball. "Tell me about a conflict you resolved" checks whether the candidate treats git as a collaboration tool or a personal save button. Candidates who talk about *the team's history* (small PRs, clear messages, green main) signal seniority far beyond their years.`,

  firstJobReality: `Your first week on a real team will involve rebasing your branch after review comments, and possibly a squash-merge etiquette question. Nobody will quiz you on the rebase-vs-merge debate; they will judge you on whether your second PR is easier to review than your first. The fastest way to earn trust: when CI fails on your branch, fix it within minutes and say so in the PR — "failed on lint, fixed in commit abc" — that reliability is worth more than any algorithm.`,

  exercises: [
    'Break your repo on purpose: make a commit, "lose" it with `git reset --hard HEAD~1`, then recover it using only `git reflog`. You are building the calm that comes from knowing undo exists.',
    'Take a messy branch with 8 "wip" commits and use `git rebase -i` (squash/fixup/reword) to shape it into 2 clean commits with real messages. This one skill separates professionals from hobbyists.',
    'Plant a bug in a friend\'s repo and hand it back. They must find the guilty commit with `git bisect run` against your test script in under 10 steps.',
    'Audit your last 20 commit messages. Rewrite the habit: each one starts with a capitalised imperative verb, fits in 50 chars, and the body (if any) explains *why*, not *what*.'
  ],

  goDeeper: [
    '"Pro Git" by Chacon & Straub — free at git-scm.com/book; chapters 3 (branching) and 7 (internals) are the expert material.',
    'Conventional Commits spec (conventionalcommits.org) — 15 minutes to read, immediately useful in any team.',
    'git-scm.com "Git Tools — Interactive Staging" — the add -p / rebase -i workflow demonstrated properly.',
    'Read how the Linux kernel accepts patches (kernel.org docs) to see history-as-story at civilization scale.'
  ],

  onePercent: `experts are calm in git because they know the model underneath, ruthless about history *before* sharing, and conservative after — and they treat every commit message as a message to a future teammate having a hard day.`
};
