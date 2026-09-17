/* ============================================================
   Challenge checker tests — no DB needed.
   Exercises _evaluateCode and its helpers directly so the
   grading semantics (real execution, word-boundary command
   matching, structural review) are verified in isolation.
   ============================================================ */
require('dotenv').config();
// coinsService exports a singleton instance
const svc = require('./backend/services/coinsService');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

const run = async (code, challenge) => {
  svc._lastRejectReason = null;
  const passed = await svc._evaluateCode(code, challenge);
  return { passed, reason: svc._lastRejectReason };
};

(async () => {
  /* ── 1. Terminal: explicit command requirement via expected_output ── */
  console.log('\n[1] Terminal — explicit expected_output commands');
  const gitChallenge = {
    title: 'Stage your changes',
    challenge_type: 'git',
    expected_output: 'git add'
  };

  let r = await run('git add .', gitChallenge);
  ok('git add . passes', r.passed, r.reason);

  r = await run('$ git add .', gitChallenge);
  ok('prompt-stripped "$ git add ." passes', r.passed, r.reason);

  r = await run('# stage the files\ngit add .', gitChallenge);
  ok('comment lines ignored', r.passed, r.reason);

  r = await run('echo git add', gitChallenge);
  ok('"echo git add" does NOT pass (command boundary respected)', !r.passed, `passed: ${r.passed}`);

  r = await run('gitx add .', gitChallenge);
  ok('"gitx add ." does NOT pass (word boundary, no bare .includes)', !r.passed, `passed: ${r.passed}`);

  r = await run('mygit add .', gitChallenge);
  ok('"mygit add ." does NOT pass', !r.passed, `passed: ${r.passed}`);

  r = await run('git', gitChallenge);
  ok('bare "git" without add does NOT pass', !r.passed, r.reason);

  r = await run('git commit -m "x"', gitChallenge);
  ok('git commit does NOT satisfy git add', !r.passed, r.reason);

  r = await run('git add . && git commit -m "x"', gitChallenge);
  ok('chained && with git add passes', r.passed, r.reason);

  const twoCmd = { title: 'Stage and commit', challenge_type: 'git', expected_output: 'git add\ngit commit' };
  r = await run('git add .', twoCmd);
  ok('missing second required command rejected', !r.passed, r.reason);
  r = await run('git add .\ngit commit -m "done"', twoCmd);
  ok('both required commands pass', r.passed, r.reason);

  /* ── 2. Terminal: task-derived requirements ── */
  console.log('\n[2] Terminal — task-derived requirements');
  // Title contains the literal trigger phrase "list files" → task gate active
  const lsTask = { title: 'List files in the current directory', challenge_type: 'linux', expected_output: '' };
  r = await run('ls -la', lsTask);
  ok('ls -la passes list-files task', r.passed, r.reason);
  r = await run('echo ls', lsTask);
  ok('"echo ls" does NOT pass list-files task (echo is not an ls invocation)', !r.passed, `passed: ${r.passed}`);

  const chmodTask = { title: 'Fix the file permissions', challenge_type: 'linux', expected_output: '' };
  r = await run('chmod 755 deploy.sh', chmodTask);
  ok('chmod with arg passes permissions task', r.passed, r.reason);
  r = await run('chmod', chmodTask);
  ok('bare "chmod" without arg rejected', !r.passed, r.reason);

  const gitInit = { title: 'Initialize a new repository', challenge_type: 'git', expected_output: '' };
  r = await run('git init', gitInit);
  ok('git init passes init task', r.passed, r.reason);
  r = await run('git status', gitInit);
  ok('git status does NOT pass init task', !r.passed, r.reason);

  /* ── 3. Real execution: JavaScript output matching ── */
  console.log('\n[3] JavaScript — real execution with expected_output');
  const jsChallenge = {
    title: 'Print the sum',
    challenge_type: 'javascript',
    expected_output: '15'
  };

  r = await run('console.log(7 + 8)', jsChallenge);
  ok('console.log(7 + 8) passes (real execution)', r.passed, r.reason);

  r = await run('console.log(7 + 9)', jsChallenge);
  ok('wrong output rejected with mismatch reason', !r.passed && /Output mismatch/.test(r.reason || ''), r.reason);

  r = await run('// just a comment saying console.log(16)', jsChallenge);
  ok('comment-only submission rejected', !r.passed, r.reason);

  const jsShort = { title: 'Say hello', challenge_type: 'javascript', expected_output: 'Hello, World!' };
  r = await run('console.log("Hello, World!")', jsShort);
  ok('short-but-correct one-liner passes (not blocked by length review)', r.passed, r.reason);

  /* ── 4. Real execution: Python output matching ── */
  console.log('\n[4] Python — real execution with expected_output');
  const pyChallenge = { title: 'Print 42', challenge_type: 'python', expected_output: '42' };

  r = await run('print(6 * 7)', pyChallenge);
  if (r.passed || !/skip/i.test(r.reason || '')) {
    ok('print(6 * 7) passes (real execution)', r.passed, r.reason);
    r = await run('print(6 * 6)', pyChallenge);
    ok('wrong python output rejected', !r.passed && /Output mismatch/.test(r.reason || ''), r.reason);
  } else {
    console.log('  ⚠ python3 unavailable in this environment — skipping execution asserts');
  }

  /* ── 5. Worker DOM test cases (javascript with test_cases) ── */
  console.log('\n[5] JavaScript — worker DOM test cases');
  const domChallenge = {
    title: 'Create three list items',
    challenge_type: 'javascript',
    starter_html: '<ul id="list"></ul>',
    test_cases: JSON.stringify([
      { selector: '#list', property: 'children.length', expected: 3, description: 'list has 3 items' }
    ])
  };
  r = await run(`const list = document.querySelector('#list');
for (let i = 0; i < 3; i++) {
  const li = document.createElement('li');
  li.textContent = 'Item ' + i;
  list.appendChild(li);
}`, domChallenge);
  ok('DOM test case passes for correct code', r.passed, r.reason);

  r = await run(`const list = document.querySelector('#list');
list.appendChild(document.createElement('li'));`, domChallenge);
  ok('DOM test case fails for wrong count', !r.passed, r.reason);

  /* ── 6. Structural review (languages without runtime) ── */
  console.log('\n[6] Structural review — anti-cheat for non-executed languages');
  const sqlCh = { title: 'Query users', challenge_type: 'sql', expected_output: '' };
  r = await run('SELECT id, name FROM users WHERE active = true;', sqlCh);
  ok('valid SQL passes', r.passed, r.reason);
  r = await run('This is just prose about selecting users from a table', sqlCh);
  ok('prose rejected for SQL', !r.passed, r.reason);

  const dockerCh = { title: 'Build an image', challenge_type: 'docker', expected_output: '' };
  r = await run('FROM node:18\nWORKDIR /app\nCOPY . .\nCMD ["node", "index.js"]', dockerCh);
  ok('valid Dockerfile passes', r.passed, r.reason);
  r = await run('RUN everything', dockerCh);
  ok('Dockerfile without FROM rejected', !r.passed, r.reason);

  const mdCh = { title: 'Write a README', challenge_type: 'markdown', expected_output: '' };
  r = await run('# My Project\n\n## Installation\n\nRun npm install to set up the project locally.\n\n## Usage\n\nImport the module and call the main function.', mdCh);
  ok('markdown with headings passes', r.passed, r.reason);
  r = await run('no headings here just some plain text content that is long enough to pass the length check easily', mdCh);
  ok('markdown without headings rejected', !r.passed, r.reason);

  /* ── 7. Terminal prose-only submission ── */
  console.log('\n[7] Terminal — prose rejection');
  const proseTask = { title: 'Some unknown terminal task', challenge_type: 'linux', expected_output: '' };
  r = await run('I would list the files and then navigate around the system', proseTask);
  ok('prose-only terminal submission rejected', !r.passed, r.reason);

  /* ── 8. Terminal — full-transcript submissions (the playground bug) ──
     The playground used to submit the terminal SCREEN (prompts + output).
     These are the shapes that must grade correctly. */
  console.log('\n[8] Terminal — transcript shapes');
  r = await run('user@host:~/app$ git add .', gitChallenge);
  ok('bash-style prompt line passes', r.passed, r.reason);

  r = await run('root@srv:/var/www# git add .', gitChallenge);
  ok('root prompt line passes', r.passed, r.reason);

  r = await run('bash-5.1$ git add .', gitChallenge);
  ok('container-style prompt line passes', r.passed, r.reason);

  r = await run('[user@host ~]$ git add .', gitChallenge);
  ok('RHEL-style prompt line passes', r.passed, r.reason);

  r = await run('$ git add .\n-bash: gti: command not found\n$ git commit -m "x"', twoCmd);
  ok('typo + command-not-found noise tolerated, both real commands found', r.passed, r.reason);

  r = await run('git add .\n fatal: not a git repository (user@host:~/x$ git add .)', gitChallenge);
  ok('commands survive surrounding transcript noise', r.passed, r.reason);

  r = await run('echo $USER', gitChallenge);
  ok('real $ inside a command is NOT mangled (echo fails git add gate)', !r.passed, `passed: ${r.passed}`);

  r = await run('$ git status', gitChallenge);
  ok('bare prompt + wrong command still rejected', !r.passed, r.reason);

  console.log(`\n══════════════════════════════`);
  console.log(`Challenge checker: ${pass} passed, ${fail} failed`);
  console.log(`══════════════════════════════`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
