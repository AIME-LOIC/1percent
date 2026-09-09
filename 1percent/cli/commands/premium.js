/* ============================================================
   Premium Command — Check your premium status
   ============================================================ */

const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('premium')
    .description('Check your premium status and download limits')
    .option('--tiers', 'Show all available plans')
    .action(async (options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        const spinner = ora('Checking premium status...').start();

        if (options.tiers) {
          // Show all tiers
          const tiersResult = await api.getTiers();
          const tiers = tiersResult || [];

          spinner.stop();

          console.log(chalk.bold.cyan('\n  💎 Available Plans\n'));

          const table = new Table({
            head: [
              chalk.white('Plan'),
              chalk.white('Price'),
              chalk.white('Daily Downloads'),
              chalk.white('Full Course'),
              chalk.white('Lab Files')
            ],
            style: { head: [] },
            chars: {
              'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
              'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
              'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
              'right': '', 'right-mid': '', 'middle': ' │ '
            }
          });

          tiers.forEach(tier => {
            table.push([
              tier.name || tier.slug,
              tier.price_usd === 0 ? 'Free' : `$${tier.price_usd}/mo`,
              tier.daily_downloads || 1,
              tier.full_course_download ? '✓' : '✗',
              `${tier.max_files || 5} files`
            ]);
          });

          console.log(table.toString());
          console.log(chalk.gray('\n  Upgrade at https://1percent.rw/learn/payment\n'));

        } else {
          // Show current status
          const status = await api.getPremiumStatus();

          spinner.stop();

          console.log(chalk.bold.cyan('\n  💎 Your Premium Status\n'));

          const tier = status.tier || {};
          console.log(chalk.white(`  Plan: ${chalk.bold(tier.name || 'Free Starter')}`));
          console.log(chalk.white(`  Price: ${tier.price_usd === 0 ? 'Free' : `$${tier.price_usd}/month`}`));

          if (status.subscription) {
            const expires = new Date(status.subscription.expires_at);
            console.log(chalk.white(`  Expires: ${expires.toLocaleDateString()}`));
          }

          console.log(chalk.white(`\n  Downloads Today: ${status.downloads_today}/${status.daily_limit}`));

          const bar = createProgressBar(status.downloads_today, status.daily_limit);
          console.log(chalk.gray(`  ${bar}`));

          console.log(chalk.white(`  Downloads Remaining: ${status.downloads_remaining}`));
          console.log(chalk.white(`  Can Download Course: ${status.can_download_course ? '✓ Yes' : '✗ No'}`));

          // File limits
          const usageResult = await api.getUsage();
          const usage = usageResult?.usage || {};

          console.log(chalk.white(`\n  Lab Files: ${usage.file_count || 0}/${usage.max_files || 5}`));
          const fileBar = createProgressBar(usage.file_count || 0, usage.max_files || 5);
          console.log(chalk.gray(`  ${fileBar}`));
          console.log(chalk.white(`  Storage: ${((usage.total_size || 0) / 1024).toFixed(1)}KB / ${((usage.max_storage || 2097152) / 1024 / 1024).toFixed(1)}MB`));

          if (tier.slug === 'free') {
            console.log(chalk.gray('\n  💡 Upgrade for more downloads and storage:'));
            console.log(chalk.gray('     https://1percent.rw/learn/payment\n'));
          } else {
            console.log('');
          }
        }

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Failed to check premium status: ${err.message}\n`));
        process.exit(1);
      }
    });
}

function createProgressBar(current, max) {
  if (!max) max = 1;
  const width = 20;
  const filled = Math.round((current / max) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

module.exports = { register };
