/* ============================================================
   Grading regression tests — run: node test_grading_fix.js
   Proves the false-pass holes are closed:
     1. console.log("// Todo app")            → FAIL (echo-trick)
     2. SELECT index FROM index WHERE id=1    → FAIL (no composite index)
   And that genuine solutions still PASS.
   ============================================================ */

const coinsService = require('./backend/services/coinsService');

const RESULTS = [];
function record(name, expected, actual, reason) {
  const ok = expected === actual;
  RESULTS.push({ name, expected, actual, ok, reason: reason || '' });
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  console.log(`   expected=${expected} actual=${actual}${reason ? '  reason: ' + reason : ''}`);
}

async function grade(code, challenge) {
  coinsService._lastRejectReason = null;
  coinsService._lastSqlReason = null;
  const passed = await coinsService._evaluateCode(code, challenge);
  return { passed, reason: coinsService._lastRejectReason || coinsService._lastSqlReason || '' };
}

async function main() {
  console.log('── 1. JS echo-trick regression ──────────────────────\n');
  const todoChallenge = {
    id: 'test-todo',
    title: 'AI Pair Program: Build a todo list with AI',
    description: 'Use document.createElement and a loop to render your todo items into the page list.',
    challenge_type: 'javascript',
    expected_output: '',
    starter_code: '',
    test_cases: []
  };
  let r = await grade('console.log("// Todo app")', todoChallenge);
  record('echo-trick console.log must FAIL', false, r.passed, r.reason);

  r = await grade('console.log("// Todo app");\n// TODO list rendering with AI pairing', todoChallenge);
  record('echo-trick with padding comment must FAIL', false, r.passed, r.reason);

  r = await grade('const todos = ["a", "b", "c"];\nconst list = document.querySelector("#list");\ntodos.forEach(t => {\n  const li = document.createElement("li");\n  li.textContent = t;\n  list.appendChild(li);\n});', todoChallenge);
  record('real todo-list solution must PASS', true, r.passed, r.reason);

  console.log('\n── 2. SQL composite-index regression ────────────────\n');
  const sqlChallenge = {
    id: 'test-sql-idx',
    title: 'Index Design: Write a query that benefits from a composite index',
    description: 'Create a composite index on the customers table covering last_name and first_name, and write a query that uses it.',
    challenge_type: 'sql',
    expected_output: '',
    starter_code: '',
    test_cases: []
  };
  r = await grade('SELECT index FROM index WHERE id=1', sqlChallenge);
  record('SELECT index FROM index must FAIL', false, r.passed, r.reason);

  r = await grade('SELECT * FROM customers WHERE email = "x@y.z";', sqlChallenge);
  record('single-column index / no CREATE INDEX must FAIL', false, r.passed, r.reason);

  r = await grade('CREATE INDEX idx_cust_name ON customers (last_name, first_name);\nSELECT * FROM customers WHERE last_name = \'Uwase\' AND first_name = \'Aline\';', sqlChallenge);
  record('real composite index + query must PASS', true, r.passed, r.reason);

  console.log('\n── 3. Language gate ─────────────────────────────────\n');
  r = await grade('def solve():\n    print("hello")', todoChallenge);
  record('Python into JS challenge must FAIL with clear message', false, r.passed, r.reason);
  console.log(`   message: ${r.reason}`);

  r = await grade('const x = 1; console.log("SELECT * FROM t");', sqlChallenge);
  record('JavaScript into SQL challenge must FAIL', false, r.passed, r.reason);

  console.log('\n── 4. Previously-working graders still work ─────────\n');
  r = await grade('console.log(6 * 7)', { title: 'Print the answer', description: 'print 42', challenge_type: 'javascript', expected_output: '42', test_cases: [] });
  record('JS output-match (6*7 -> 42) still PASSES', true, r.passed, r.reason);

  // Trivial "print 42" challenges: echoing IS the solution (guard exempts
  // outputs shorter than 8 chars by design). Long-output echo must fail.
  r = await grade('console.log("// Todo app — rendered with createElement and a loop")', { title: 'Todo output', description: 'print the banner', challenge_type: 'javascript', expected_output: '// Todo app — rendered with createElement and a loop', test_cases: [] });
  record('JS echo of LONG expected string must FAIL', false, r.passed, r.reason);

  r = await grade('print(6 * 7)', { title: 'Answer', description: '', challenge_type: 'python', expected_output: '42', test_cases: [] });
  record('Python real computation still PASSES', true, r.passed, r.reason);

  const domCh = {
    id: 'dom', title: 'Render colors', description: 'Render colors into #color-list',
    challenge_type: 'javascript', expected_output: '', starter_html: '<ul id="color-list"></ul>',
    test_cases: [{ selector: '#color-list', property: 'children.length', expected: 2 }]
  };
  r = await grade('const c=["red","blue"];const l=document.querySelector("#color-list");c.forEach(x=>{const li=document.createElement("li");li.textContent=x;l.appendChild(li);});', domCh);
  record('DOM test-case challenge still PASSES', true, r.passed, r.reason);

  console.log('\n═════════════════════════════════════════════════════');
  const fails = RESULTS.filter(x => !x.ok);
  console.log(`${RESULTS.length - fails.length}/${RESULTS.length} tests passed`);
  if (fails.length) { process.exit(1); }
}

main().catch(e => { console.error('Test runner error:', e); process.exit(1); });
