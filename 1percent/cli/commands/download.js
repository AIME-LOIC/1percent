/* ============================================================
   Download Command — Download course lessons
   ============================================================
   Usage:
     onepercent download -f "programming-fundamentals" -l 1
     onepercent download -f "git-github" -l :        (full course)
     onepercent download -f "command-line-linux" -l 1:3  (lessons 1-3)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const api = require('../lib/api');
const config = require('../lib/config');

function register(program) {
  program
    .command('download')
    .description('Download course lessons')
    .requiredOption('-f, --course <slug>', 'Course slug (e.g., "programming-fundamentals")')
    .option('-l, --lesson <range>', 'Lesson number, range (1:3), or ":" for all lessons')
    .option('-o, --output <dir>', 'Output directory (defaults to course slug)')
    .option('--list', 'List all lessons in the course')
    .action(async (options) => {
      try {
        // Check authentication
        if (!config.isLoggedIn()) {
          console.error(chalk.red('\n  ✗ Not logged in. Run `onepercent login` first.\n'));
          process.exit(1);
        }

        // Check premium status
        const premiumSpinner = ora('Checking premium status...').start();
        const premiumStatus = await api.getPremiumStatus();

        if (!premiumStatus.can_download && premiumStatus.downloads_remaining <= 0) {
          premiumSpinner.fail(chalk.red('Daily download limit reached.'));
          console.log(chalk.gray('  Upgrade your plan for more downloads:'));
          console.log(chalk.gray('  https://1percent.rw/learn/payment\n'));
          process.exit(1);
        }
        premiumSpinner.stop();

        // Get course
        const courseSpinner = ora(`Loading course: ${options.course}...`).start();
        const courseData = await api.getCourse(options.course);
        const course = courseData.course || courseData;

        if (!course) {
          courseSpinner.fail(chalk.red(`Course "${options.course}" not found.`));
          console.log(chalk.gray('\n  Available courses:'));
          const coursesResult = await api.getCourses();
          (coursesResult.courses || []).forEach(c => {
            console.log(chalk.gray(`    • ${c.slug} — ${c.title}`));
          });
          console.log('');
          process.exit(1);
        }

        courseSpinner.succeed(chalk.green(`Course: ${course.title}`));

        // Get lessons
        const lessons = course.lessons || [];

        if (lessons.length === 0) {
          console.log(chalk.gray('\n  No lessons found in this course.\n'));
          process.exit(1);
        }

        // List mode
        if (options.list) {
          console.log(chalk.bold.cyan('\n  📚 Lessons:\n'));
          lessons.forEach((lesson, i) => {
            const num = String(i + 1).padStart(2, ' ');
            console.log(chalk.white(`  ${num}. ${lesson.title}`));
            console.log(chalk.gray(`      Type: ${lesson.lesson_type} | Duration: ${lesson.duration_min}min`));
          });
          console.log('');
          return;
        }

        // Parse lesson range
        let selectedLessons = [];
        const lessonArg = options.lesson || ':';

        if (lessonArg === ':') {
          // All lessons
          selectedLessons = lessons;
        } else if (lessonArg.includes(':')) {
          // Range: "1:3" or "3:"
          const [start, end] = lessonArg.split(':').map(Number);
          const s = (start || 1) - 1;
          const e = end ? end : lessons.length;
          selectedLessons = lessons.slice(s, e);
        } else {
          // Single lesson
          const idx = parseInt(lessonArg) - 1;
          if (idx < 0 || idx >= lessons.length) {
            console.error(chalk.red(`\n  ✗ Lesson ${lessonArg} not found. Course has ${lessons.length} lessons.\n`));
            process.exit(1);
          }
          selectedLessons = [lessons[idx]];
        }

        if (selectedLessons.length === 0) {
          console.error(chalk.red('\n  ✗ No lessons matched your selection.\n'));
          process.exit(1);
        }

        // Check if premium allows full course download
        if (selectedLessons.length > 1 && !premiumStatus.can_download_course) {
          console.log(chalk.yellow('\n  ⚠ Your plan only allows single lesson downloads.'));
          console.log(chalk.gray('    Upgrade for full course downloads.\n'));

          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Download first lesson only?`,
              default: true
            }
          ]);

          if (!proceed) {
            console.log(chalk.gray('  Cancelled.\n'));
            return;
          }

          selectedLessons = [selectedLessons[0]];
        }

        // Create output directory
        const outputDir = path.resolve(options.output || options.course);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Download lessons
        console.log(chalk.bold.cyan(`\n  📥 Downloading ${selectedLessons.length} lesson(s)...\n`));

        let downloaded = 0;
        for (const lesson of selectedLessons) {
          const spinner = ora(`  ${lesson.title}...`).start();

          try {
            // Get lesson content
            const lessonData = await api.getLesson(course.id, lesson.id);
            const content = lessonData.lesson?.content_md || lesson.content_md || '';

            // Save to file
            const safeName = lesson.title.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
            const fileName = `${String(downloaded + 1).padStart(2, '0')}-${safeName}.md`;
            const filePath = path.join(outputDir, fileName);

            fs.writeFileSync(filePath, content, 'utf-8');

            spinner.succeed(chalk.green(`  ${lesson.title}`));
            downloaded++;

          } catch (err) {
            spinner.fail(chalk.red(`  ${lesson.title}: ${err.message}`));
          }
        }

        // Create course README
        const readmeContent = `# ${course.title}\n\n${course.description || ''}\n\n## Lessons\n\n${
          selectedLessons.map((l, i) => `${i + 1}. [${l.title}](./${String(i + 1).padStart(2, '0')}-${l.title.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50)}.md)`).join('\n')
        }\n\n---\nDownloaded with 1% Learn CLI\n`;

        fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent, 'utf-8');

        console.log(chalk.bold.green(`\n  ✓ Downloaded ${downloaded} lesson(s) to: ${outputDir}\n`));

      } catch (err) {
        if (err.status === 404) {
          console.error(chalk.red(`\n  ✗ Course "${options.course}" not found.\n`));
        } else {
          console.error(chalk.red(`\n  ✗ Download failed: ${err.message}\n`));
        }
        process.exit(1);
      }
    });
}

module.exports = { register };
