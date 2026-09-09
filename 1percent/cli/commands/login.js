/* ============================================================
   Login Command — Authenticate with 1% Learn
   ============================================================ */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('login')
    .description('Log in to your 1% Learn account')
    .option('-e, --email <email>', 'Your email address')
    .option('-p, --password <password>', 'Your password')
    .option('--api <url>', 'API server URL')
    .action(async (options) => {
      try {
        // Set custom API URL if provided, otherwise reset to default
        if (options.api) {
          config.setApiUrl(options.api);
          api.baseUrl = options.api;
        } else {
          config.resetApiUrl();
          api.baseUrl = config.getApiUrl();
        }

        // Prompt for credentials if not provided
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            when: !options.email,
            validate: (input) => input.includes('@') || 'Please enter a valid email'
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            when: !options.password,
            validate: (input) => input.length >= 6 || 'Password must be at least 6 characters'
          }
        ]);

        const email = options.email || answers.email;
        const password = options.password || answers.password;

        const spinner = ora('Logging in...').start();

        const result = await api.login(email, password);

        spinner.succeed(chalk.green('Login successful!'));

        const user = config.getUser();
        console.log(chalk.cyan(`\n  Welcome, ${user?.full_name || user?.email || email}!`));
        console.log(chalk.gray(`  API: ${config.getApiUrl()}`));
        console.log(chalk.gray('\n  Run `onepercent ls` to see your files.'));
        console.log(chalk.gray('  Run `onepercent upload <file>` to upload a file.\n'));

      } catch (err) {
        if (err.status === 401) {
          console.error(chalk.red('\n  ✗ Invalid email or password.\n'));
        } else {
          console.error(chalk.red(`\n  ✗ Login failed: ${err.message}\n`));
        }
        process.exit(1);
      }
    });
}

module.exports = { register };
