/* ============================================================
   Expert Layer data — Command Line / Linux Basics
   Grounded in: POSIX pipe-and-filter philosophy, admin runbooks,
   ssh hardening practice, process/resource debugging (ss, strace).
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners use the terminal as a slower file explorer. Experts use it as a **programmable toolkit**: every command reads stdin and writes stdout, so any command can feed any other — and that composability is the whole philosophy. \`cat access.log | grep 500 | awk '{print $1}' | sort | uniq -c | sort -rn | head\` answers "which IPs hit us with server errors most?" in five seconds, no script required. The second difference: experts treat the shell's history as a *shared, auditable record* — on servers they know every keystroke may matter later, so destructive commands are written carefully, never with wildcards typed in haste, and always after a \`pwd\` glance to confirm where they are.`,

  howExpertsWork: `Before touching a production server, experts do a "state snapshot": \`df -h\` (disk), \`free -m\` (memory), \`uptime\` (load), \`ss -tulpn\` (what is listening) — 30 seconds that tells them if this machine is *normal* before they change anything. Changes are made through runbooks — checked, versioned step lists — not memory. And they automate anything done twice: a task done three times manually gets a script with argument checking and a log line, because manual steps are where outages are born. Permission changes follow the same conservatism: grant the narrowest access that works (a user, a group, a directory), and \`sudo\` is for single commands, never a shell they live in.`,

  toolsOfTheTrade: [
    ['pipes & filters', 'Composing small commands (grep/awk/sed/sort/uniq) into data pipelines', 'One-line answers to questions that would be a day of clicking'],
    ['tmux / screen', 'Terminal sessions that survive disconnects', 'Long jobs keep running over flaky connections; sessions are resumable and shareable for pair work'],
    ['ssh keys + config', '~/.ssh/config with per-host users, keys, and ports', 'Passwordless, correct-by-default connections; no more "which port was it?"'],
    ['rsync', 'Delta-copying files locally and over ssh, with --dry-run', 'Safe, resumable transfers; the --dry-run preview prevents disasters'],
    ['journalctl / logs', 'Structured querying of service logs (journalctl -u nginx --since "1 hour ago")', 'Experts query logs; they do not scroll them']
  ],

  insiderMoves: [
    'Press Ctrl+R and type a fragment to search history — then make aliases for the top 10 commands you retype. Experts bend the shell to their hands.',
    '`mkdir -p a/b/c`, `cp file{,.bak}`, `cd -` (previous dir), `!!` (repeat last), `Alt+.` (last argument): five expansions that save hundreds of keystrokes a day.',
    'Before any rm with a wildcard, run the identical command with `ls` instead of `rm`. The output is exactly what would be deleted — this one habit has saved entire companies.',
    'Use `less +F` (or `tail -f`) on a log while reproducing a bug in another terminal: live cause-and-effect instead of guesswork.',
    '`ssh -L 5432:localhost:5432 user@server` tunnels a production database port to your laptop safely — the standard way to inspect data without opening the DB to the internet.',
    'Write every fix as a runbook entry immediately: symptom, diagnosis commands, fix, verification. The next incident at 3am will be handled by someone (maybe you) who was not there for this one.'
  ],

  fieldScenarios: [
    {
      situation: 'The server is slow at 9am every day.',
      beginner: 'Restarts it and hopes.',
      expert: 'Snapshots load (`uptime`, `top`), finds which resource is exhausted (CPU? RAM? disk I/O?), identifies the process with `ps aux --sort=-%cpu | head`, and correlates with logs — then fixes the cause, not the symptom.',
      why: 'Restarts hide the diagnosis; the same slowness returns tomorrow, worse.'
    },
    {
      situation: 'You need to give a freelancer access to deploy one app.',
      beginner: 'Shares the root password "temporarily".',
      expert: 'Creates a dedicated user, adds only the needed sudo commands, installs their ssh key, sets an expiry date, and removes access in writing when the contract ends.',
      why: 'Root passwords are forever until rotated; scoped access expires cleanly.'
    },
    {
      situation: 'Disk full alert at 2am.',
      beginner: 'Deletes random big files until it stops alerting.',
      expert: '`df -h` to find the full filesystem, `du -xh --max-depth=2 /var | sort -rh | head` to find what grew, and almost always finds logs — then fixes rotation, not just the files.',
      why: 'The full disk is a symptom; unrotated logs, orphaned dumps, and tmp buildup are the disease.'
    }
  ],

  expertMistakes: [
    'Running as root by habit. One wrong keystroke with root privileges can end the machine; experts stay a normal user and sudo individual commands.',
    'chmod 777 "to make it work". It works by making the file world-writable — experts chmod the *minimum* (often just the owner or group) and chown correctly instead.',
    'Piping curl straight into bash from the internet without reading it. Even experts get phished by convenience; download, read, then run.',
    'Editing production configs without a backup copy in the same command (`sudo cp nginx.conf nginx.conf.bak-$(date +%F)` first) and without `nginx -t` (or equivalent) before reload.'
  ],

  dayInTheLife: `A DevOps engineer in Kigali starts by ssh-ing into three servers and running the same 30-second health snapshot on each — muscle memory. An alert fires: API latency up. They tail the app log with \`less +F\` while watching \`top\` in a split tmux pane; the culprit is a backup job scheduled at peak hours. They reschedule it, write four lines in the runbook ("symptom → diagnosis → fix → prevention"), and post the runbook link in the incident channel. Before lunch they have also reviewed a teammate's shell script for a missing \`set -euo pipefail\` — the difference between a script that fails loudly and one that silently corrupts data.`,

  hiringLens: `Terminal skill is tested in interviews more than candidates expect: "find the 5 largest files under /var", "show me which process is listening on port 3000", "grep this log for errors from today only". Interviewers watch for fluency (do your fingers hesitate?), safety (did you dry-run the destructive thing?), and whether you compose commands instead of inventing scripts. A candidate who says "I would check \`ss -tulpn\`" over one who says "I would restart it" is telling you who survives production.`,

  firstJobReality: `On your first week, someone will ask you to "just check the logs on the server". That moment is the interview. If you ssh in, snapshot the state, query with journalctl/grep with time bounds, and report *what you ruled out* — you will be the person asked again, and again, until you are the person who owns the servers. Nobody is impressed by GUI confidence on a server; there is no GUI.`,

  exercises: [
    'Health-snapshot drill: on any Linux machine (or WSL), run df -h, free -m, uptime, ss -tulpn and write two sentences on what each says about the machine. Repeat weekly until it takes under a minute.',
    'Log autopsy: take any access log and answer, with one pipeline (no editor): top 5 client IPs, top 5 requested paths, and how many 4xx vs 5xx responses. Time yourself.',
    'Write a backup script with `set -euo pipefail`, argument checking, a dated output folder, and one log line per run. Schedule it with cron. This is the "professional hello world".',
    'Harden an ssh server: key-only auth, disabled root login, changed port, and a ~/.ssh/config entry with a friendly name. Verify each change and write down how you would roll it back.'
  ],

  goDeeper: [
    '"The Linux Command Line" by William Shotts — free at linuxcommand.org; the single best terminal book.',
    'Google\'s SRE book, "Emergency Response" chapter — how professionals behave during incidents (free at sre.google).',
    'Julia Evans\' zines (wizardzines.com) —Networking! Ack!, and Bh shamelessly effective debugging primers.',
    'MIT\'s "Missing Semester of Your CS Education" — lectures 1-2 (shell, dotfiles) are the expert terminal course.'
  ],

  onePercent: `experts are not people who know 500 commands — they are people who compose the 30 they know into pipelines, snapshot before they touch, dry-run before they destroy, and write down what they fixed so the next person inherits a runbook instead of a mystery.`
};
