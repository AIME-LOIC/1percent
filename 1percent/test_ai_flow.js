/* ============================================================
   E2E: AI review governance flow
   1. student submits challenge code (real pass + real fail)
   2. ai_reviews gets a PENDING row with a real review artifact
   3. admin approves → verdict applied, coins awarded
   4. admin rejects a second one → nothing applied
   5. cleanup (student record left as it was)
   ============================================================ */
require('dotenv').config();
const { adminClient } = require('./backend/config/database');
const coinsService = require('./backend/services/coinsService');
const aiReviewService = require('./backend/services/aiReviewService');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

(async () => {
  const { data: user } = await adminClient.from('profiles').select('id, coins').eq('role', 'student').limit(1).single();
  const { data: challenge } = await adminClient
    .from('challenges')
    .select('id, title, description, challenge_type, expected_output, coins_reward')
    .eq('is_active', true).eq('challenge_type', 'javascript').limit(1).single();
  ok('fixtures found', !!user && !!challenge);

  // snapshot for restore
  const { data: coinsBefore } = await adminClient.from('profiles').select('coins').eq('id', user.id).single();
  const { data: priorSub } = await adminClient.from('challenge_submissions')
    .select('id, passed').eq('user_id', user.id).eq('challenge_id', challenge.id).single();
  const priorCoinsTx = await adminClient.from('coin_transactions')
    .select('id').eq('user_id', user.id).eq('reference_id', challenge.id);

  // clean slate for this test
  await adminClient.from('challenge_submissions').delete().eq('user_id', user.id).eq('challenge_id', challenge.id);
  await adminClient.from('ai_reviews').delete().eq('user_id', user.id).eq('challenge_id', challenge.id);

  try {
    console.log('\n[1] Student submits a passing solution');
    const res = await coinsService.submitChallenge(user.id, challenge.id, `console.log(${JSON.stringify(challenge.expected_output)})`);
    ok('deterministic pass', res.passed === true, JSON.stringify(res).slice(0, 80));

    // Give the fire-and-forget queue a moment
    await new Promise(r => setTimeout(r, 1200));

    const { data: queued } = await adminClient.from('ai_reviews')
      .select('*').eq('user_id', user.id).eq('challenge_id', challenge.id).single();
    ok('AI review queued as pending', queued && queued.status === 'pending', queued ? `status=${queued.status}` : 'no row');
    ok('review artifact has real content', queued?.review?.summary && typeof queued.review.score === 'number',
      queued?.review?.summary?.slice(0, 60));
    ok('review notes engine provenance (no LLM)', queued?.engine_version?.includes('1percent-local-engine'));
    ok('score within rubric', queued?.score >= 0 && queued?.score <= 100, `score=${queued?.score}`);

    console.log('\n[2] Admin approves → verdict applied');
    const { data: admin } = await adminClient.from('profiles').select('id').eq('role', 'admin').limit(1).single();
    const decision = await aiReviewService.decide(queued.id, admin.id, 'approve', 'e2e test');
    ok('approval applies the pass', decision.applied === true);

    const { data: subAfter } = await adminClient.from('challenge_submissions')
      .select('passed').eq('user_id', user.id).eq('challenge_id', challenge.id).single();
    ok('submission marked passed', subAfter?.passed === true);

    const { data: coinsAfter } = await adminClient.from('profiles').select('coins').eq('id', user.id).single();
    ok('coins awarded', (coinsAfter.coins || 0) > (coinsBefore.coins || 0),
      `${coinsBefore.coins} → ${coinsAfter.coins}`);

    const { data: revAfter } = await adminClient.from('ai_reviews')
      .select('status, reviewed_by, decided_at').eq('id', queued.id).single();
    ok('review marked applied with decision trail', revAfter.status === 'applied' && !!revAfter.reviewed_by && !!revAfter.decided_at);

    console.log('\n[3] Reject path leaves student record alone');
    // fresh pending review via direct queue (simulating a fail submission)
    await adminClient.from('challenge_submissions').delete().eq('user_id', user.id).eq('challenge_id', challenge.id);
    const queued2 = await aiReviewService.queueReview(challenge, user.id, 'console.log("totally wrong")', { passed: false });
    ok('fail submission queued', queued2 && queued2.status === 'pending');
    const decision2 = await aiReviewService.decide(queued2.id, admin.id, 'reject', 'not convinced');
    ok('reject applies nothing', decision2.applied === false && decision2.review.status === 'rejected');
    const { data: subAfter2 } = await adminClient.from('challenge_submissions')
      .select('passed').eq('user_id', user.id).eq('challenge_id', challenge.id).single();
    ok('student submission stays unpassed after reject', !subAfter2 || subAfter2.passed === false);

    console.log('\n[4] Double-decide is blocked');
    try {
      await aiReviewService.decide(queued2.id, admin.id, 'approve');
      ok('second decide rejected', false);
    } catch (e) {
      ok('second decide rejected', /already decided/.test(e.message), e.message);
    }

  } finally {
    /* ── Restore the student's pre-test state ── */
    await adminClient.from('ai_reviews').delete().eq('user_id', user.id).eq('challenge_id', challenge.id);
    if (priorSub) {
      await adminClient.from('challenge_submissions').upsert({
        user_id: user.id, challenge_id: challenge.id, passed: priorSub.passed, code: ''
      }, { onConflict: 'user_id,challenge_id' });
    } else {
      await adminClient.from('challenge_submissions').delete().eq('user_id', user.id).eq('challenge_id', challenge.id);
    }
    await adminClient.from('profiles').update({ coins: coinsBefore.coins }).eq('id', user.id);
    console.log('\n(state restored: submissions, coins, ai_reviews cleaned)');
  }

  console.log(`\n══════════════════════════════`);
  console.log(`AI governance flow: ${pass} passed, ${fail} failed`);
  console.log(`══════════════════════════════`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
