/* ============================================================
   Upload Command — Upload a file to your 1% Learn lab
   ============================================================ */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const api = require('../lib/api');
const config = require('../lib/config');

// File name patterns allowed per tier
const FILE_PATTERNS = {
  free: /^[a-zA-Z0-9._-]+\.(js|py|html|css|json|md|txt|sh)$/,
  starter: /^[a-zA-Z0-9._-]+\.(js|py|html|css|json|md|txt|sh|ts|jsx|tsx)$/,
  pro: /^[a-zA-Z0-9._/-]+\.(js|py|html|css|json|md|txt|sh|ts|jsx|tsx|yaml|yml|sql|xml|csv)$/,
  unlimited: /.*/
};

// Language detection from extension
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.json': 'json',
    '.md': 'markdown',
    '.sh': 'shell',
    '.bash': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sql': 'sql',
    '.xml': 'xml',
    '.csv': 'csv',
    '.txt': 'text'
  };
  return map[ext] || 'text';
}

function register(program) {
  program
    .command('upload <file>')
    .description('Upload a file to your 1% Learn lab')
    .option('-n, --name <name>', 'Custom file name (defaults to original filename)')
    .option('-l, --language <lang>', 'Override language detection')
    .action(async (file, options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        // Resolve file path
        const filePath = path.resolve(file);

        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`\n  ✗ File not found: ${file}\n`));
          process.exit(1);
        }

        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = options.name || path.basename(filePath);
        const language = options.language || detectLanguage(filePath);

        // Check file size (500KB limit)
        const fileSize = Buffer.byteLength(content, 'utf-8');
        if (fileSize > 500 * 1024) {
          console.error(chalk.red(`\n  ✗ File too large (${(fileSize / 1024).toFixed(1)}KB). Maximum is 500KB.\n`));
          process.exit(1);
        }

        // Get user tier and check file name pattern
        const usage = await api.getUsage();
        const tier = usage?.usage?.tier || 'free';
        const pattern = FILE_PATTERNS[tier] || FILE_PATTERNS.free;

        if (!pattern.test(fileName)) {
          console.error(chalk.red(`\n  ✗ File name "${fileName}" is not allowed for ${tier} tier.`));
          console.error(chalk.gray(`    Allowed extensions: .js, .py, .html, .css, .json, .md, .txt, .sh`));
          console.error(chalk.gray(`    Upgrade your plan for more file types.\n`));
          process.exit(1);
        }

        // Check upload limits
        if (usage?.usage && !usage.usage.can_upload) {
          console.error(chalk.red(`\n  ✗ File limit reached (${usage.usage.file_count}/${usage.usage.max_files} files).`));
          console.error(chalk.gray(`    Upgrade your plan for more storage.\n`));
          process.exit(1);
        }

        const spinner = ora(`Uploading ${fileName}...`).start();

        const result = await api.saveFile(fileName, content, language);

        spinner.succeed(chalk.green(`File uploaded successfully!`));

        console.log(chalk.cyan(`\n  File: ${fileName}`));
        console.log(chalk.cyan(`  Language: ${language}`));
        console.log(chalk.cyan(`  Size: ${(fileSize / 1024).toFixed(1)}KB`));
        if (result.usage) {
          console.log(chalk.gray(`  Storage: ${result.usage.file_count}/${result.usage.max_files} files, ${(result.usage.total_size / 1024).toFixed(1)}KB/${(result.usage.max_storage / 1024 / 1024).toFixed(1)}MB`));
        }
        console.log('');

      } catch (err) {
        if (err.status === 403 && err.data?.upgrade) {
          console.error(chalk.red(`\n  ✗ ${err.message}`));
          console.error(chalk.gray('    Visit https://1percent.rw/learn/payment to upgrade.\n'));
        } else {
          console.error(chalk.red(`\n  ✗ Upload failed: ${err.message}\n`));
        }
        process.exit(1);
      }
    });
}

module.exports = { register };
