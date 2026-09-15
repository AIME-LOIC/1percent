/* ============================================================
   Challenge grading audit — run: node audit_challenges.js
   Fetches every active challenge from Supabase and classifies
   how it is graded today, flagging weak/superficial paths.
   Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
   ============================================================ */
require('dotenv').config();
const { adminClient } = require('./backend/config/database');

const WEAK_LEVELS = { OK: 0, SOFT: 1, WEAK: 2 };

function classify(ch) {
  const hasTests = Array.isArray(ch.test_cases) && ch.test_cases.length > 0;
  const hasExpected = !!ch.expected_output && String(ch.expected_output).trim().length > 0;
  const lang = (ch.language || ch.challenge_type || '').toLowerCase();
  const desc = `${ch.title || ''} ${ch.description || ''}`.toLowerCase();

  const flags = [];
  let level = 'OK';

  if (!hasTests && !hasExpected) {
    flags.push('no test_cases AND no expected_output → review-only grading');
    level = 'WEAK';
  } else if (!hasTests && hasExpected && lang.includes('sql')) {
    flags.push('expected_output only → old SQL grader checked surface keywords only');
    level = 'WEAK';
  } else if (!hasTests && hasExpected) {
    flags.push('expected_output only → vulnerable to echo-trick (mitigated by anti-echo guard)');
    level = 'SOFT';
  }

  if (lang.includes('sql') && !/explain|index|join|group by|where/.test(desc)) {
    flags.push('SQL challenge with no semantic target in description');
    level = WEAK_LEVELS[level] >= WEAK_LEVELS.WEAK ? level : 'SOFT';
  }

  return { level, flags };
}

(async () => {
  try {
    const { data, error } = await adminClient
      .from('challenges')
      .select('id, title, challenge_type, language, difficulty, test_cases, expected_output, description, courses(title)')
      .eq('is_active', true)
      .order('course_id')
      .order('order_index');

    if (error) throw error;

    const counts = { OK: 0, SOFT: 0, WEAK: 0 };
    const byCourse = {};

    for (const ch of data || []) {
      const { level, flags } = classify(ch);
      counts[level]++;
      if (level !== 'OK') {
        const course = ch.courses?.title || 'No course';
        (byCourse[course] = byCourse[course] || []).push({ ch, level, flags });
      }
    }

    console.log(`\n=== CHALLENGE GRADING AUDIT — ${data?.length || 0} active challenges ===`);
    console.log(`OK: ${counts.OK}   SOFT: ${counts.SOFT}   WEAK: ${counts.WEAK}\n`);

    for (const [course, items] of Object.entries(byCourse)) {
      console.log(`\n── ${course} ──`);
      for (const { ch, level, flags } of items) {
        console.log(`  [${level}] #${ch.id} ${ch.title} (${ch.challenge_type || ch.language || '?'})`);
        for (const f of flags) console.log(`        • ${f}`);
      }
    }

    if (counts.WEAK) {
      console.log(`\n⚠️  ${counts.WEAK} challenges still grade on structure only — add test_cases or semantic checks.`);
    }
  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exit(1);
  }
})();
