/* ============================================================
   Workspace Commands — Developer workspace via the project system
   ============================================================
   Usage:
     1percent status            — Project / role / branch / task summary
     1percent task list         — Tasks assigned to you
     1percent task start <id>   — Start a task (TODO → IN_PROGRESS)
     1percent task submit <id>  — Submit for review (IN_PROGRESS → IN_REVIEW)
     1percent task done <id>    — Mentor/admin approval only
     1percent activity          — Recent development activity
     1percent progress          — Requirement-driven project progress
   ============================================================ */

const chalk = require('chalk');
const ora = require('ora');
const api = require('../lib/api');
const config = require('../lib/config');

/* ── API client extensions (uses the same Bearer token auth) ── */

async function getWorkspace() {
  return api.request('GET', '/api/student/dev/dev-workspace');
}

async function getTasks() {
  return api.request('GET', '/api/tasks');
}

async function transitionTask(taskId, action) {
  return api.request('POST', `/api/tasks/${taskId}/transition`, { action });
}

async function getActivity() {
  return api.request('GET', '/api/github/activity?limit=20');
}

const PRIORITY_COLORS = { CRITICAL: 'red', HIGH: 'yellow', MEDIUM: 'cyan', LOW: 'gray' };
const STATUS_ICONS = {
  TODO: '○', IN_PROGRESS: '◐', BLOCKED: '✗', IN_REVIEW: '◑', TESTING: '◔', DONE: '●'
};

function requireLogin() {
  if (!config.isLoggedIn()) {
    console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
    process.exit(1);
  }
}

function register(program) {
  /* ── status ─────────────────────────────────────────────── */
  program
    .command('status')
    .description('Show your current project, role, tasks and progress')
    .action(async () => {
      requireLogin();
      const spinner = ora('Loading workspace...').start();
      try {
        const ws = await getWorkspace();
        spinner.stop();

        const p = ws.current_project;
        console.log('');
        if (!p) {
          console.log(chalk.yellow('  No active project yet.'));
          console.log(chalk.gray('  You are not on a project team. Ask your mentor or an admin.\n'));
          return;
        }

        console.log(chalk.bold.cyan(`  Project:  ${p.name}`));
        console.log(chalk.gray(`  Status:   ${p.status.replace(/_/g, ' ')}`));
        console.log(chalk.gray(`  Role:     ${p.my_role}`));
        const overall = p.progress?.overall_percent ?? 0;
        console.log(chalk.gray(`  Progress: ${overall}%`));

        const tasks = ws.tasks || [];
        const done = tasks.filter(t => t.status === 'DONE').length;
        const inProgress = tasks.find(t => t.status === 'IN_PROGRESS');
        if (inProgress) {
          console.log(chalk.gray(`  Current task: ${inProgress.title}`));
        }
        console.log(chalk.gray(`  Tasks:    ${done}/${tasks.length} complete`));
        console.log(chalk.gray(`  GitHub:   ${ws.github_connected ? chalk.green('connected') : chalk.gray('not connected')}`));

        const days = ws.activity_14d || [];
        const activeDays = days.filter(d => d.total > 0).length;
        console.log(chalk.gray(`  Activity: ${activeDays}/14 active days (last 2 weeks)`));
        console.log('');
      } catch (err) {
        spinner.fail(chalk.red(`Failed to load workspace: ${err.message}`));
        process.exit(1);
      }
    });

  /* ── task ───────────────────────────────────────────────── */
  const task = program
    .command('task')
    .description('Your assigned tasks');

  task
    .command('list')
    .description('List tasks assigned to you')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (options) => {
      requireLogin();
      const spinner = ora('Loading tasks...').start();
      try {
        const q = options.status ? `&status=${encodeURIComponent(options.status)}` : '';
        const res = await api.request('GET', `/api/tasks?assignee_id=me${q}`);
        // the API scopes students to their own tasks by default
        spinner.stop();
        const tasks = res.tasks || [];
        console.log('');
        if (tasks.length === 0) {
          console.log(chalk.yellow('  No tasks assigned.\n'));
          return;
        }
        for (const t of tasks) {
          const color = PRIORITY_COLORS[t.priority] || 'white';
          console.log(`  ${chalk[STATUS_ICONS[t.status] ? 'green' : 'white'](STATUS_ICONS[t.status] || '○')} ${chalk.bold(t.title)}  ${chalk[color](t.priority)}  ${chalk.gray(t.status)}`);
          if (t.due_date) console.log(chalk.gray(`      due ${t.due_date}`));
        }
        console.log(chalk.gray(`\n  ${res.total} task(s)\n`));
      } catch (err) {
        spinner.fail(chalk.red(err.message));
        process.exit(1);
      }
    });

  task
    .command('start <taskId>')
    .description('Start working on a task')
    .action(async (taskId) => {
      requireLogin();
      const spinner = ora('Starting task...').start();
      try {
        await transitionTask(taskId, 'start');
        spinner.succeed(chalk.green('Task started. Good building!'));
      } catch (err) { spinner.fail(chalk.red(err.message)); process.exit(1); }
    });

  task
    .command('submit <taskId>')
    .description('Submit a task for mentor review')
    .action(async (taskId) => {
      requireLogin();
      const spinner = ora('Submitting...').start();
      try {
        await transitionTask(taskId, 'submit');
        spinner.succeed(chalk.green('Submitted for review. Your mentor will take a look.'));
      } catch (err) { spinner.fail(chalk.red(err.message)); process.exit(1); }
    });

  task
    .command('done <taskId>')
    .description('Mark a task done (mentor/admin only)')
    .action(async (taskId) => {
      requireLogin();
      const spinner = ora('Requesting completion...').start();
      try {
        await transitionTask(taskId, 'approve');
        spinner.succeed(chalk.green('Task approved and marked done.'));
      } catch (err) {
        spinner.fail(chalk.red(err.message.includes('own') || err.message.includes('mentor')
          ? 'Only the assigned student (to submit) or a mentor/admin (to approve) can do this.'
          : err.message));
        process.exit(1);
      }
    });

  /* ── activity ───────────────────────────────────────────── */
  program
    .command('activity')
    .description('Your recent development activity')
    .action(async () => {
      requireLogin();
      const spinner = ora('Loading activity...').start();
      try {
        const res = await getActivity();
        spinner.stop();
        const items = res.activity || [];
        console.log('');
        if (items.length === 0) {
          console.log(chalk.yellow('  No development activity recorded yet.\n'));
          return;
        }
        for (const a of items) {
          const when = new Date(a.occurred_at).toLocaleString();
          console.log(`  ${chalk.cyan(a.type.replace(/_/g, ' ').toLowerCase())}  ${a.title}  ${chalk.gray(when)}`);
        }
        console.log('');
      } catch (err) { spinner.fail(chalk.red(err.message)); process.exit(1); }
    });

  /* ── progress ───────────────────────────────────────────── */
  program
    .command('progress')
    .description('Requirement-driven progress of your current project')
    .action(async () => {
      requireLogin();
      const spinner = ora('Computing progress...').start();
      try {
        const ws = await getWorkspace();
        spinner.stop();
        const p = ws.current_project;
        if (!p) { console.log(chalk.yellow('\n  No active project yet.\n')); return; }

        const rp = p.progress?.requirement_progress || [];
        console.log(`\n  ${chalk.bold(p.name)} — ${chalk.cyan(`${p.progress?.overall_percent ?? 0}%`)}\n`);
        if (rp.length === 0) {
          console.log(chalk.gray('  No requirements defined yet.\n'));
          return;
        }
        for (const r of rp) {
          const bars = Math.round(r.completion_percent / 5);
          const bar = '█'.repeat(bars) + '░'.repeat(20 - bars);
          console.log(`  ${bar}  ${chalk.bold(String(r.weight).padStart(3))}%  ${r.name}`);
        }
        console.log(chalk.gray('\n  Progress is requirement-driven — commits are evidence, not proof.\n'));
      } catch (err) { spinner.fail(chalk.red(err.message)); process.exit(1); }
    });
}

module.exports = { register };
