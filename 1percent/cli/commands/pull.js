/* ============================================================
   Pull Command — Pull a file from your 1% Learn lab
   ============================================================ */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('pull <filename>')
    .description('Pull a file from your 1% Learn lab to current directory')
    .option('-o, --output <path>', 'Output file path (defaults to filename)')
    .option('-f, --force', 'Overwrite existing file without asking')
    .action(async (filename, options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        const spinner = ora(`Fetching files...`).start();

        // Get all user files
        const result = await api.getFiles();
        const files = result.files || [];

        // Find the file by name
        const file = files.find(f => f.file_name === filename);

        if (!file) {
          spinner.fail(chalk.red(`File "${filename}" not found in your lab.`));

          // Show available files
          if (files.length > 0) {
            console.log(chalk.gray('\n  Available files:'));
            files.forEach(f => {
              console.log(chalk.gray(`    • ${f.file_name}`));
            });
          } else {
            console.log(chalk.gray('\n  Your lab is empty. Upload files with `onepercent upload <file>`'));
          }
          console.log('');
          process.exit(1);
        }

        spinner.text = `Downloading ${filename}...`;

        // Get full file content
        const fileData = await api.getFile(file.id);

        const outputPath = options.output || filename;
        const outputPathResolved = path.resolve(outputPath);

        // Check if file exists
        if (fs.existsSync(outputPathResolved) && !options.force) {
          spinner.fail(chalk.red(`File "${outputPath}" already exists.`));
          console.log(chalk.gray('  Use --force to overwrite.\n'));
          process.exit(1);
        }

        // Write file
        fs.writeFileSync(outputPathResolved, fileData.file?.content || file.content || '', 'utf-8');

        spinner.succeed(chalk.green(`File pulled successfully!`));

        console.log(chalk.cyan(`\n  File: ${outputPath}`));
        console.log(chalk.cyan(`  Language: ${file.language || 'unknown'}`));
        console.log(chalk.cyan(`  Size: ${((file.file_size || 0) / 1024).toFixed(1)}KB`));
        console.log('');

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Pull failed: ${err.message}\n`));
        process.exit(1);
      }
    });
}

module.exports = { register };
