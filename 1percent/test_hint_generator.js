/* ============================================================
   Hint generator tests — run: node test_hint_generator.js
   No DB needed. Verifies the three-hint contract, per-type
   specificity, and that hints never leak the full solution.
   ============================================================ */
require('dotenv').config();
const { generateHints, normalizeType } = require('./backend/services/hintGenerator');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

console.log('── 1. Python challenges (from seed_python_course.sql) ──');
{
  const hints = generateHints({
    title: 'Top of the leaderboard',
    description: 'Given the scores list, print the highest score (just the number). Try max() — or find it with a loop for extra practice.',
    starter_code: 'scores = [45, 82, 67, 91, 73]\n\n# Print the highest score\n',
    expected_output: '91',
    challenge_type: 'python'
  });
  ok('returns 3 hints', hints.length === 3, JSON.stringify(hints));
  ok('hint 1 mentions max()', /max\(\)/i.test(hints[0]), hints[0]);
  ok('does NOT leak the answer 91', !hints.some(h => /\b91\b/.test(h)), hints.join(' | '));
  ok('hints are challenge-specific (scores mentioned or tool named)', /max|loop/i.test(hints.join(' ')));
}
{
  const hints = generateHints({
    title: 'Area calculator function',
    description: 'Write a function area(width, height) that RETURNS the rectangle area (don\'t print inside it). Then the two given print lines will output 20 and 14.',
    starter_code: 'def area(width, height):\n    # return the area, don\'t print it\n    pass\n\nprint(area(4, 5))\nprint(area(7, 2))\n',
    expected_output: '20\n14',
    challenge_type: 'python'
  });
  ok('function challenge: mentions def/return', /def|return/i.test(hints.join(' ')), hints.join(' | '));
  ok('mentions the area function by name', /area/.test(hints.join(' ')));
  ok('does NOT leak expected output 20/14', !/[^\d](20|14)[^\d%]/.test(hints.join(' ')));
}
{
  const hints = generateHints({
    title: 'Even or odd checker',
    description: 'The variable number is given. Use an if/else to print exactly: 7 is odd. If the number were even your code should print "<number> is even".',
    starter_code: 'number = 7\n',
    expected_output: '7 is odd',
    challenge_type: 'python'
  });
  ok('even/odd challenge mentions modulo or if/else', /%|modulo|if\/else/i.test(hints.join(' ')), hints.join(' | '));
}

console.log('\n── 2. JavaScript DOM challenge (from seed_todo_course.sql) ──');
{
  const hints = generateHints({
    title: 'Fix the missing appendChild',
    description: 'The list stays empty. The starter code creates <li> elements but never attaches them to the page. Find the missing line and fix it so the tasks appear.',
    starter_code: 'const tasks = ["Call mom", "Clean room"];\nconst list = document.querySelector("#task-list");\n\ntasks.forEach(function(task) {\n  const li = document.createElement("li");\n  li.textContent = task;\n  // missing something here\n});',
    starter_html: '<ul id="task-list"></ul>',
    challenge_type: 'javascript',
    test_cases: [{ selector: '#task-list', property: 'children.length', expected: 2, description: 'Task list should have 2 items' }]
  });
  ok('mentions appendChild', /appendChild/i.test(hints.join(' ')), hints.join(' | '));
  ok('references the #task-list id', /task-list/.test(hints.join(' ')));
  ok('references the test description', /Task list should have 2 items/.test(hints.join(' ')));
}

console.log('\n── 3. Git/terminal challenge ──');
{
  const hints = generateHints({
    title: 'Stage your changes',
    description: 'Stage all modified files and commit them with the message "fix: login validation".',
    challenge_type: 'git',
    expected_output: 'git add\ngit commit'
  });
  ok('terminal type normalised', normalizeType({ challenge_type: 'git' }) === 'terminal');
  ok('mentions git add', /git add/.test(hints.join(' ')), hints.join(' | '));
  ok('mentions one-line bare commands rule', /one per line|bare/i.test(hints.join(' ')));
}

console.log('\n── 4. SQL challenge ──');
{
  const hints = generateHints({
    title: 'Index Design: composite index',
    description: 'Create a composite index on the customers table covering last_name and first_name, and write a query that uses it.',
    challenge_type: 'sql'
  });
  ok('mentions CREATE INDEX or composite', /create index|composite/i.test(hints.join(' ')), hints.join(' | '));
  ok('references the customers table', /customers/.test(hints.join(' ')));
  ok('references the columns', /last_name|first_name/i.test(hints.join(' ')));
}

console.log('\n── 5. Thin-data challenge (title only) still yields 3 hints ──');
{
  const hints = generateHints({ title: 'Print the answer', description: 'print 42', challenge_type: 'javascript', expected_output: '42', test_cases: [] });
  ok('returns 3 hints', hints.length === 3, JSON.stringify(hints));
  ok('every hint is a non-empty sentence', hints.every(h => h.trim().length > 20));
}

console.log('\n── 6. Determinism (same input → same output) ──');
{
  const ch = { title: 'Countdown', description: 'Print a countdown from 3 to 1, then Lift off!', starter_code: '', challenge_type: 'python' };
  const a = JSON.stringify(generateHints(ch));
  const b = JSON.stringify(generateHints(ch));
  ok('deterministic', a === b);
}

console.log(`\n═════════════════════════════════════════════════════`);
console.log(`${pass}/${pass + fail} tests passed`);
if (fail) process.exit(1);
