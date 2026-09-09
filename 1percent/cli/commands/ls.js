/* ============================================================
   LS Command — List all files in your 1% Learn lab
   ============================================================ */

const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('ls')
    .alias('list')
    .description('List all files in your 1% Learn lab')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        const spinner = ora('Loading files...').start();

        const result = await api.getFiles();
        const files = result.files || [];
        const usage = result.usage || {};

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify({ files, usage }, null, 2));
          return;
        }

        // Header
        console.log(chalk.bold.cyan('\n  📁 Your Lab Files\n'));

        if (files.length === 0) {
          console.log(chalk.gray('  No files yet. Upload with `onepercent upload <file>`\n'));
          return;
        }

        // Create table
        const table = new Table({
          head: [
            chalk.white('Name'),
            chalk.white('Language'),
            chalk.white('Size'),
            chalk.white('Updated')
          ],
          style: { head: [] },
          chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
            'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
            'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
            'right': '', 'right-mid': '', 'middle': ' │ '
          }
        });

        files.forEach(file => {
          const size = file.file_size ? `${(file.file_size / 1024).toFixed(1)}KB` : '?';
          const updated = file.updated_at
            ? new Date(file.updated_at).toLocaleDateString()
            : '?';

          table.push([
            file.file_name,
            file.language || '?',
            size,
            updated
          ]);
        });

        console.log(table.toString());

        // Usage summary
        console.log(chalk.gray(`\n  ${files.length} file(s)`));
        if (usage.max_files) {
          const bar = createProgressBar(usage.file_count, usage.max_files);
          console.log(chalk.gray(`  Storage: ${bar} ${usage.file_count}/${usage.max_files} files`));
          console.log(chalk.gray(`  Space: ${(usage.total_size / 1024).toFixed(1)}KB / ${(usage.max_storage / 1024 / 1024).toFixed(1)}MB`));
          console.log(chalk.gray(`  Tier: ${usage.tier || 'free'}\n`));
        }

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Failed to load files: ${err.message}\n`));
        process.exit(1);
      }
    });
}

function createProgressBar(current, max) {
  const width = 20;
  const filled = Math.round((current / max) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

module.exports = { register };
