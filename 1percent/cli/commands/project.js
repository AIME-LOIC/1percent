/* ============================================================
   Project Command — Manage project folders
   ============================================================
   Usage:
     onepercent project new <name>   — Create a new project folder
     onepercent project ls           — List project folders
     onepercent project open <name>  — Open project in file explorer
   ============================================================ */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const api = require('../lib/api');
const config = require('../lib/config');

// Project directory is stored in user's home
const PROJECTS_DIR = path.join(require('os').homedir(), '.1percent', 'projects');

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function getProjectDir(name) {
  return path.join(PROJECTS_DIR, name);
}

function register(program) {
  const project = program
    .command('project')
    .description('Manage project folders');

  // Create new project
  project
    .command('new <name>')
    .description('Create a new project folder with starter files')
    .option('-t, --template <type>', 'Project template: web, python, node, empty', 'empty')
    .action(async (name, options) => {
      try {
        ensureProjectsDir();
        const projectDir = getProjectDir(name);

        if (fs.existsSync(projectDir)) {
          console.error(chalk.red(`\n  ✗ Project "${name}" already exists at: ${projectDir}\n`));
          process.exit(1);
        }

        const spinner = ora(`Creating project: ${name}...`).start();

        // Create project directory
        fs.mkdirSync(projectDir, { recursive: true });

        // Create starter files based on template
        const template = options.template;

        if (template === 'web') {
          fs.writeFileSync(path.join(projectDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>${name}</h1>
  <script src="app.js"></script>
</body>
</html>`);
          fs.writeFileSync(path.join(projectDir, 'style.css'), `/* ${name} styles */\n\nbody {\n  font-family: system-ui, sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 2rem;\n}`);
          fs.writeFileSync(path.join(projectDir, 'app.js'), `// ${name} — JavaScript\n\nconsole.log('Hello from ${name}!');`);
        } else if (template === 'python') {
          fs.writeFileSync(path.join(projectDir, 'main.py'), `#!/usr/bin/env python3\n"""${name}"""\n\ndef main():\n    print("Hello from ${name}!")\n\nif __name__ == "__main__":\n    main()\n`);
          fs.writeFileSync(path.join(projectDir, 'requirements.txt'), `# ${name} dependencies\n`);
        } else if (template === 'node') {
          fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
            name: name,
            version: '1.0.0',
            description: '',
            main: 'index.js',
            scripts: {
              start: 'node index.js',
              dev: 'node --watch index.js'
            }
          }, null, 2));
          fs.writeFileSync(path.join(projectDir, 'index.js'), `// ${name}\n\nconsole.log('Hello from ${name}!');\n`);
        }

        // Create README
        fs.writeFileSync(path.join(projectDir, 'README.md'), `# ${name}\n\nCreated with 1% Learn CLI\n\n## Getting Started\n\n\`\`\`bash\n# Navigate to project\ncd ${projectDir}\n\`\`\`\n`);

        // Create .gitignore
        fs.writeFileSync(path.join(projectDir, '.gitignore'), `node_modules/\n.env\n__pycache__/\n*.pyc\n.DS_Store\n`);

        spinner.succeed(chalk.green(`Project "${name}" created!`));

        console.log(chalk.cyan(`\n  Location: ${projectDir}`));
        console.log(chalk.cyan(`  Template: ${template}`));
        console.log(chalk.gray(`\n  cd ${projectDir}\n`));

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Failed to create project: ${err.message}\n`));
        process.exit(1);
      }
    });

  // List projects
  project
    .command('ls')
    .alias('list')
    .description('List all project folders')
    .action(async () => {
      try {
        ensureProjectsDir();

        const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => {
            const projectPath = getProjectDir(d.name);
            const stats = fs.statSync(projectPath);
            const files = fs.readdirSync(projectPath);
            return {
              name: d.name,
              path: projectPath,
              files: files.length,
              created: stats.birthtime || stats.ctime
            };
          });

        if (projects.length === 0) {
          console.log(chalk.gray('\n  No projects yet. Create one with `onepercent project new <name>`\n'));
          return;
        }

        console.log(chalk.bold.cyan('\n  📁 Your Projects\n'));

        projects.forEach(p => {
          console.log(chalk.white(`  • ${p.name}`));
          console.log(chalk.gray(`    Path: ${p.path}`));
          console.log(chalk.gray(`    Files: ${p.files} | Created: ${p.created.toLocaleDateString()}`));
        });

        console.log('');

      } catch (err) {
        console.error(chalk.red(`\n  ✗ Failed to list projects: ${err.message}\n`));
        process.exit(1);
      }
    });
}

module.exports = { register };
