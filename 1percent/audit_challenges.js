/* ============================================================
   Challenge grading audit — run: node audit_challenges.js
   Fetches every active challenge from Supabase and classifies
   how it is graded today, flagging weak/superficial paths so
   you can prioritize hardening them.
   Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
   ============================================================ */

require('dotenv').config();
const { adminClient } = require('./backend/config/database');

/* How the grader treats each challenge_type today (post-fix):
   - EXECUTED   → real runtime result decides pass/fail (strong)
   - SEMANTIC   → executed against a schema + task assertions (strong)
   - REVIEW     → structural review + task assertions (medium)
   - WEAK       → structural review only (flagged) */
const GRADE_PATH = {
  javascript: 'EXECUTED (VM worker / DOM tests / output match)',
  python: 'EXECUTED (python3 subprocess, stdout compare)',
  sql: 'SEMANTIC (in-memory SQLite + composite-index/task assertions)',
  linux: 'REVIEW (command-line pattern match)',
  git: 'REVIEW (command-line pattern match)',
  docker: 'REVIEW (Dockerfile structure)',
  nginx: 'REVIEW (config structure)',
  yaml: 'REVIEW (key structure)',
  html: 'REVIEW (element structure)',
  css: 'REVIEW (rule structure)',
  markdown: 'REVIEW (headings + length)'
};

const EXECUTED = new Set(['javascript', 'python', 'sql']);

async function main() {
  const { data: challenges, error } = await adminClient
    .from('challenges')
    .select('id, title, description, challenge_type, difficulty, coins_reward, is_active, test_cases, expected_output, starter_code, course_id, courses(title)')
    .eq('is_active', true)
    .order('course_id');

  if (error) { console.error('Query failed:', error.message); process.exit(1); }

  const rows = [];
  let weak = 0;

  for (const ch of challenges || []) {
    let testCases = ch.test_cases;
    if (typeof testCases === 'string') { try { testCases = JSON.parse(testCases); } catch { testCases = []; } }
    if (!Array.isArray(testCases)) testCases = [];

    const type = ch.challenge_type || 'javascript';
    const hasTests = testCases.length > 0;
    const hasExpected = String(ch.expected_output || '').trim().length > 0;
    const gradedBy = GRADE_PATH[type] || 'UNKNOWN TYPE — falls to generic length check (WEAK)';
    const text = `${ch.title} ${ch.description}`.toLowerCase();

    // Weakness detection
    const flags = [];
    if (!EXECUTED.has(type)) flags.push('not executed — review-only');
    if (EXECUTED.has(type) && type !== 'sql' && !hasTests && !hasExpected) flags.push('no test_cases AND no expected_output — structure only');
    if (type === 'javascript' && hasExpected && hasTests) flags.push('both output+tests defined (tests win) — OK but consider removing output');
    if (type === 'javascript' && hasExpected && hasExpected.length >= 8 && !hasTests) {
      // Expected output present → echo-guard applies, but plain "print X" tasks are inherently weak
      if (/print|display|output/.test(text) && !/compute|calculate|loop|function/.test(text)) {
        flags.push('echo-prone: task is "print X" — trivially satisfiable');
      }
    }
    if (type === 'linux' || type === 'git') flags.push('command-pattern only — can be gamed by listing commands');
    if (!flags.length) flags.push('OK');

    const isWeak = flags.some(f => f.includes('review-only') || f.includes('structure only') || f.includes('gamed') || f.includes('trivially') || f.includes('UNKNOWN'));

    const row = {
      title: ch.title,
      course: ch.courses?.title || ch.course_id || '—',
      type,
      difficulty: ch.difficulty,
      coins: ch.coins_reward,
      gradedBy,
      flags: flags.join('; ')
    };
    rows.push(row);
    if (isWeak) weak++;
  }

  console.log(`\nScanned ${rows.length} active challenges — ${weak} flagged as weak.\n`);
  console.log('=== FLAGGED (prioritize) ===\n');
  rows.filter(r => r.gradedBy.includes('UNKNOWN') || r.flags.includes('review-only') || r.flags.includes('structure only') || r.flags.includes('gamed') || r.flags.includes('trivially'))
    .forEach(r => {
      console.log(`• [${r.type}/${r.difficulty}] ${r.title}`);
      console.log(`  course: ${r.course} · reward: ${r.coins} coins`);
      console.log(`  graded by: ${r.gradedBy}`);
      console.log(`  flags: ${r.flags}\n`);
    });

  console.log('=== OK / ACCEPTABLE ===\n');
  rows.filter(r => !(r.gradedBy.includes('UNKNOWN') || r.flags.includes('review-only') || r.flags.includes('structure only') || r.flags.includes('gamed') || r.flags.includes('trivially')))
    .forEach(r => console.log(`✓ [${r.type}] ${r.title} — ${r.gradedBy}`));

  process.exit(0);
}

main().catch(e => { console.error('Audit error:', e.message); process.exit(1); });
