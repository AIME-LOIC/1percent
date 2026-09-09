/* ============================================================
   RM Command — Delete a file from your 1% Learn lab
   ============================================================ */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('rm <filename>')
    .alias('delete')
    .description('Delete a file from your 1% Learn lab')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (filename, options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        const spinner = ora('Finding file...').start();

        // Get all user files
        const result = await api.getFiles();
        const files = result.files || [];

        // Find the file by name
        const file = files.find(f => f.file_name === filename);

        if (!file) {
          spinner.fail(chalk.red(`File "${filename}" not found.`));
          console.log('');
          process.exit(1);
        }

        spinner.stop();

        // Confirm deletion
        if (!options.yes) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Delete "${filename}"?`,
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.gray('\n  Cancelled.\n'));
            return;
          }
        }

        const deleteSpinner = ora(`Deleting ${filename}...`).start();

        await api.deleteFile(file.id);

        deleteSpinner.succeed(chalk.green(`File "${filename}" deleted.`));
        console.log('');

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Delete failed: ${err.message}\n`));
        process.exit(1);
      }
    });
}

module.exports = { register };
