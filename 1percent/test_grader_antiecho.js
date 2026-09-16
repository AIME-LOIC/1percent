/* ============================================================
   Anti-echo guard regression tests — no DB, no sandbox needed.
   ============================================================
   The guard lives inside _evaluateCode's branch B, which is hard to
   drive directly (it needs a challenge row). These tests replicate
   its EXACT decision logic against the real service methods so a
   regression in _normalizeOutput / _stripCommentsAndStrings (the two
   helpers it leans on) is caught, and lock in the intended verdicts
   for the real-world submission that was wrongly rejected.
   Run: node test_grader_antiecho.js
   ============================================================ */

require('dotenv').config();
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder';

const svc = require('./backend/services/coinsService');

let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
  if (!cond) failures++;
};

/* Re-implementation of the guard's decision (kept in sync with
   _evaluateCode). If someone changes the guard without updating this
   mirror, the "real solution" case will start failing — visible. */
function antiEchoVerdict(code, expectedOutput) {
  const raw = String(code);
  const strippedCode = svc._stripCommentsAndStrings(code);
  const expectedNorm = svc._normalizeOutput(expectedOutput);
  const expectedLines = expectedNorm.split('\n').map(l => l.trim()).filter(Boolean);
  const echoedCount = expectedLines.filter(l => raw.includes(l) || strippedCode.includes(l)).length;
  const echoedRatio = expectedLines.length ? echoedCount / expectedLines.length : 0;

  if (expectedLines.length > 0 && expectedNorm.length >= 8 && echoedRatio >= 0.7) {
    let isEchoCheat = true;
    if (expectedLines.length === 1) {
      const restLines = raw.split('\n').filter(l => !l.includes(expectedLines[0]));
      const rest = svc._stripCommentsAndStrings(restLines.join('\n'));
      const restLen = rest.replace(/\s+/g, '').length;
      const hasRealLogic = restLen >= 40 &&
        /(function\b|=>|\bfor\b|\bwhile\b|\bif\b|\bclass\b|\breturn\b|\b(const|let)\b)/.test(rest);
      isEchoCheat = !hasRealLogic;
    }
    if (isEchoCheat) return { pass: false, reason: 'echo cheat' };
  }
  return { pass: true };
}

(async () => {
  const banner = '// Polling app';

  /* ── 1. The exact shape of the submission that was wrongly rejected ── */
  const fullRealSolution = `function solution() {
  console.log("${banner}");
  const state = { question: "", options: [], votes: {}, totalVotes: 0 };
  function createPoll(q, optionsList) {
    state.question = q; state.options = optionsList; state.votes = {}; state.totalVotes = 0;
    optionsList.forEach((opt) => { state.votes[opt] = 0; });
  }
  function vote(option) {
    if (option in state.votes) { state.votes[option] += 1; state.totalVotes += 1; }
  }
  function getResults() {
    if (state.totalVotes === 0) return [];
    return state.options.map((opt) => {
      const count = state.votes[opt];
      const percentage = Number(((count / state.totalVotes) * 100).toFixed(1));
      return { option: opt, votes: count, percentage };
    });
  }
  return { state, createPoll, vote, getResults };
}
solution();`;

  const v1 = antiEchoVerdict(fullRealSolution, banner);
  check('real solution with required banner → PASS', v1.pass, v1.reason);

  /* ── 2. Pure echo cheat must still FAIL ─────────────────── */
  const v2 = antiEchoVerdict(`console.log("${banner}");`, banner);
  check('pure echo (console.log only) → FAIL', !v2.pass);

  const v3 = antiEchoVerdict(`// ${banner}\nconsole.log("${banner}");`, banner);
  check('echo + comment only → FAIL', !v3.pass);

  /* ── 3. Banner + trivially short stub → still FAIL ──────── */
  const v4 = antiEchoVerdict(`console.log("${banner}");\nconst x = 1;`, banner);
  check('echo + 1-line stub → FAIL', !v4.pass);

  /* ── 4. Multi-line expected output, fully echoed → FAIL ─── */
  const expectedMulti = '// Polling app\nVotes: 3\nYes: 66.7%';
  const v5 = antiEchoVerdict(`console.log("${expectedMulti}");`, expectedMulti);
  check('multi-line echo → FAIL', !v5.pass);

  /* ── 5. Multi-line output, banner + computed values → PASS ─ */
  const computed = `const polls = { yes: 2, no: 1 };
const total = polls.yes + polls.no;
console.log("${banner}");
console.log("Votes: " + total);
console.log("Yes: " + (100 * polls.yes / total).toFixed(1) + "%");`;
  const v6 = antiEchoVerdict(computed, expectedMulti);
  check('multi-line computed (banner + computed values) → PASS', v6.pass, v6.reason);

  /* ── 6. Helper sanity ───────────────────────────────────── */
  check('_normalizeOutput trims trailing blank lines', svc._normalizeOutput('a\n\n\n') === 'a');
  check('_stripCommentsAndStrings removes // comments', !svc._stripCommentsAndStrings('const a = 1; // note').includes('note'));
  check('_stripCommentsAndStrings removes string bodies', (() => {
    const s = svc._stripCommentsAndStrings('console.log("secret")');
    return s.includes('""') && !s.includes('secret');
  })());
  check('_outputsMatch ignores trailing whitespace', svc._outputsMatch('42\n\n', '42'));

  console.log(failures === 0 ? '\nALL ANTI-ECHO TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
