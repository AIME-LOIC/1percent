/* ============================================================
   Status Command — `1p status` (spec: project / role / branch /
   current task / progress / commits / open PRs / tasks)
   ============================================================ */

const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');
const api = require('../lib/api');
const config = require('../lib/config');

function currentGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null; // not a git repo — fine
  }
}

function register(program) {
  program
    .command('dev-status')
    .alias('dev')
    .description('Developer workspace status: project, role, branch, task, progress')
    .action(async () => {
      if (!config.isLoggedIn()) {
        console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
        process.exit(1);
      }
      const spinner = ora('Loading status...').start();
      try {
        const ws = await api.getDevWorkspace();
        spinner.stop();

        const p = ws.current_project;
        console.log('');
        if (!p) {
          console.log(chalk.yellow('  Project:  (none — you are not on a project team yet)'));
          console.log(chalk.gray('  Ask your mentor or an admin to be added to a project.\n'));
          return;
        }

        const branch = currentGitBranch();
        const tasks = ws.tasks || [];
        const done = tasks.filter(t => t.status === 'DONE').length;
        const current = tasks.find(t => t.status === 'IN_PROGRESS');
        const activity = ws.activity_14d || [];
        const commits = activity.reduce((s, d) => s + d.commits, 0);

        console.log(chalk.bold(`  Project:`), p.name);
        console.log(chalk.bold(`  Role:`), p.my_role);
        if (branch) console.log(chalk.bold(`  Branch:`), branch);
        console.log(chalk.bold(`  Current Task:`), current ? current.title : chalk.gray('(none in progress)'));
        console.log(chalk.bold(`  Progress:`), `${p.progress?.overall_percent ?? 0}%`);
        console.log(chalk.bold(`  Commits:`), `${commits} (last 14 days)`);
        console.log(chalk.bold(`  Open PRs:`), p.open_prs ?? '—');
        console.log(chalk.bold(`  Tasks:`), `${done}/${tasks.length} complete`);
        console.log('');
      } catch (err) {
        spinner.fail(chalk.red(err.message));
        process.exit(1);
      }
    });
}

module.exports = { register };
