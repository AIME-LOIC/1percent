/* ============================================================
   Whoami Command — Show current user info
   ============================================================ */

const chalk = require('chalk');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('whoami')
    .description('Show current logged-in user info')
    .action(async () => {
      try {
        if (!config.isLoggedIn()) {
          console.log(chalk.gray('\n  Not logged in. Run `onepercent login` to authenticate.\n'));
          return;
        }

        const user = config.getUser();
        const token = config.getToken();

        console.log(chalk.bold.cyan('\n  👤 Current User\n'));

        if (user) {
          console.log(chalk.white(`  Name: ${user.full_name || user.name || 'N/A'}`));
          console.log(chalk.white(`  Email: ${user.email || 'N/A'}`));
          console.log(chalk.white(`  ID: ${user.id || 'N/A'}`));
        } else {
          console.log(chalk.gray('  User info not cached.'));
        }

        console.log(chalk.white(`\n  API: ${config.getApiUrl()}`));
        console.log(chalk.gray(`  Token: ${token ? token.substring(0, 20) + '...' : 'None'}`));
        console.log('');

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Error: ${err.message}\n`));
      }
    });
}

module.exports = { register };
