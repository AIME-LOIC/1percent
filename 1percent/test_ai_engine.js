/* ============================================================
   Local AI engine tests — no LLM, uses the real trained model.
   ============================================================ */
require('dotenv').config();
const { reviewSubmission, loadModel, isModelReady } = require('./backend/ai/reviewer');
const { tokenize, meaningfulTokens } = require('./backend/ai/tokenizer');
const { extractFeatures, shapeSignature } = require('./backend/ai/features');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

const challenge = {
  id: 'test-challenge-id',
  title: 'Sum the Numbers',
  description: 'Write a function that takes a list of numbers and returns the total. Use a loop to iterate over each item.',
  challenge_type: 'javascript',
  expected_output: '',
  starter_code: 'function sumNumbers(numbers) {\n  // your code here\n}',
};

(async () => {
  console.log('\n[0] Model');
  ok('trained model loads', isModelReady());
  const model = loadModel();
  ok('model has course profiles', (model.courseProfiles || []).length >= 15, `got ${(model.courseProfiles || []).length}`);
  ok('model has concepts', Object.keys(model.concepts || {}).length >= 25);

  console.log('\n[1] Tokenizer');
  const toks = meaningfulTokens('const x = 42; // answer', 'javascript');
  ok('tokenizes keywords', toks.some(t => t.type === 'keyword' && t.value === 'const'));
  ok('tokenizes numbers', toks.some(t => t.type === 'number' && t.value === '42'));
  ok('captures comments separately', toks.some(t => t.type === 'comment'));
  const pyToks = meaningfulTokens('def greet(name):\n    return f"hi"', 'python');
  ok('python def recognized', pyToks.some(t => t.value === 'def' && t.type === 'keyword'));

  console.log('\n[2] Feature extraction');
  const feats = extractFeatures('function add(a, b) { return a + b; }\nconst n = add(1, 2);', 'javascript');
  ok('detects function definition', feats.defines.functions.includes('add'));
  ok('detects calls', feats.calls.includes('add'));
  ok('detects return', feats.hasReturn === true);
  const loopFeats = extractFeatures('for (let i = 0; i < 10; i++) { console.log(i); }', 'javascript');
  ok('detects loops', loopFeats.hasLoop === true);
  ok('method calls', loopFeats.methodCalls.includes('console.log'));

  console.log('\n[3] Shape fingerprint (rename-invariant)');
  const s1 = shapeSignature('function f(a, b) { return a + b; }', 'javascript');
  const s2 = shapeSignature('function g(x, y) { return x + y; }', 'javascript');
  const s3 = shapeSignature('if (a) { b(); }', 'javascript');
  ok('renamed code → same shape', s1 === s2);
  ok('different code → different shape', s1 !== s3);

  console.log('\n[4] Reviewer — good submission');
  const good = reviewSubmission(challenge, `function sumNumbers(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}`);
  ok('good code → pass verdict', good.verdict === 'pass', good.verdict);
  ok('score is solid', good.score >= 50, `score=${good.score}`);
  ok('detects loop concept', good.detectedConcepts.some(c => c.concept === 'loops'), JSON.stringify(good.detectedConcepts.map(c => c.concept)));
  ok('summary is human-readable', /tokens|concept/i.test(good.summary));
  ok('no flags on honest code', good.flags.length === 0, good.flags.join(','));

  console.log('\n[5] Reviewer — weak submission');
  const weak = reviewSubmission(challenge, 'const t = 0;');
  ok('weak code scores lower', weak.score < good.score, `score=${weak.score}`);
  ok('weak code notes the shortness', weak.breakdown.effort.notes.some(n => /short/i.test(n)));

  console.log('\n[6] Reviewer — prose (not code)');
  const prose = reviewSubmission(challenge, 'I would write a function that loops over the numbers and adds them together to get the total sum.');
  ok('prose gets flagged/needs review', prose.verdict === 'needs_review' || prose.score < 40, `verdict=${prose.verdict} score=${prose.score}`);

  console.log('\n[7] Reviewer — duplicate detection');
  const first = reviewSubmission(challenge, `function sumNumbers(nums) {
  let total = 0;
  for (const n of nums) { total += n; }
  return total;
}`);
  ok('first honest submission not suspicious', first.duplication.suspicious === false);

  // Simulate a trained shape for this challenge, then re-review the SAME
  // shape with different identifiers (what a copier would do)
  const model2 = loadModel();
  model2.challengeShapes = model2.challengeShapes || {};
  model2.challengeShapes[challenge.id] = [first.shapeSignature];
  const copy = reviewSubmission(challenge, `function computeSum(values) {
  let acc = 0;
  for (const v of values) { acc += v; }
  return acc;
}`);
  ok('renamed copy of approved code flagged', copy.verdict === 'needs_review' && copy.flags.includes('possible_duplicate'),
    `verdict=${copy.verdict} flags=${copy.flags.join(',')}`);

  console.log('\n[8] Reviewer — determinism');
  const stripVolatile = r => JSON.stringify({ ...r, reviewedAt: null, engine: { ...r.engine, modelTrainedAt: null } });
  const again = reviewSubmission(challenge, `function sumNumbers(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}`);
  ok('same input → same output (deterministic, no LLM)', stripVolatile(again) === stripVolatile(good));

  console.log('\n[9] Python review');
  const py = reviewSubmission({ ...challenge, challenge_type: 'python', title: 'Print numbers', description: 'Use a for loop with range to print each number.' },
    'for i in range(10):\n    print(i)');
  ok('python code reviewed without crash', py && typeof py.score === 'number');
  ok('python detects loops', py.detectedConcepts.some(c => c.concept === 'loops'), JSON.stringify(py.detectedConcepts.map(c => c.concept)));

  console.log(`\n══════════════════════════════`);
  console.log(`AI engine: ${pass} passed, ${fail} failed`);
  console.log(`══════════════════════════════`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
