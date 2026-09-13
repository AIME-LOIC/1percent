/* ============================================================
   E2E: course-update cache bust + real challenge submission flow
   Boots the server in-process, hits the HTTP endpoints.
   ============================================================ */
require('dotenv').config();
const { adminClient } = require('./backend/config/database');

process.env.PORT = process.env.PORT || '3000';
const app = require('./backend/index');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

const PORT = 3101;
const BASE = `http://127.0.0.1:${PORT}`;

const startServer = () => new Promise((resolve) => {
  const server = app.listen(PORT, () => resolve(server));
});
const stopServer = (server) => new Promise((r) => server.close(() => r()));

(async () => {
  const server = await startServer();
  console.log('Server booted on', PORT);

  try {
    /* ── 1. Course cache invalidation ── */
    console.log('\n[1] Course cache invalidation on admin update');
    const sitemapRoutes = require('./backend/routes/sitemapRoutes');
    const hasBust = typeof sitemapRoutes.invalidateCourseCache === 'function';
    ok('invalidateCourseCache is exported', hasBust);

    // Prime the cache, then bust it, and confirm the next fetch re-reads the DB
    const before = await fetch(`${BASE}/courses`).then(r => r.text());
    ok('/courses renders with course data', before.includes('course-card'), `len=${before.length}`);

    // Grab the first course title to modify
    const { data: firstCourse } = await adminClient
      .from('courses').select('id, title, is_published').eq('is_published', true).order('sort_order').limit(1).single();

    if (firstCourse) {
      // The page HTML-escapes titles (& → &amp;) — compare in escaped form
      const esc = s => String(s).replace(/&/g, '&amp;');
      const origTitle = firstCourse.title;
      const tempTitle = origTitle + ' QA';
      const upd = await adminClient.from('courses').update({ title: tempTitle }).eq('id', firstCourse.id).select().single();
      ok('DB update committed', !upd.error, upd.error?.message || '');

      sitemapRoutes.invalidateCourseCache();
      const after = await fetch(`${BASE}/courses`).then(r => r.text());
      ok('course title change visible immediately after bust', after.includes(esc(tempTitle)),
        `looking for "${esc(tempTitle)}"`);

      // Restore
      await adminClient.from('courses').update({ title: origTitle }).eq('id', firstCourse.id).select().single();
      sitemapRoutes.invalidateCourseCache();
      const restored = await fetch(`${BASE}/courses`).then(r => r.text());
      ok('title restored + cache re-busted', restored.includes(esc(origTitle)) && !restored.includes(esc(tempTitle)));
    } else {
      console.log('  ⚠ no published course found — skipping live title flip');
    }

    /* ── 2. Challenge submission flow (real pass / real fail) ── */
    console.log('\n[2] Challenge submit flow (service + route wiring)');
    const { data: jsChallenge } = await adminClient
      .from('challenges')
      .select('id, title, challenge_type, expected_output, coins_reward')
      .eq('is_active', true)
      .eq('challenge_type', 'javascript')
      .limit(1)
      .single();

    const { data: testUser } = await adminClient
      .from('profiles').select('id, full_name, coins').eq('role', 'student').limit(1).single();

    // Route wired? Unauthenticated POST must get 401 from the middleware
    const unauth = jsChallenge
      ? await fetch(`${BASE}/api/coins/challenges/${jsChallenge.id}/submit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.status)
      : 404;
    ok('submit route wired (401 without token)', unauth === 401, `status=${unauth}`);

    if (jsChallenge && testUser) {
      const coinsService = require('./backend/services/coinsService');
      // Clean any prior pass so we get a fresh grading decision
      await adminClient.from('challenge_submissions')
        .delete().eq('user_id', testUser.id).eq('challenge_id', jsChallenge.id);

      // A wrong answer must be graded FAIL (real execution, no keyword pass)
      const badRes = await coinsService.submitChallenge(
        testUser.id, jsChallenge.id, 'console.log("I have completed this challenge correctly")');
      ok('keyword-soup submission FAILS', badRes.passed === false, JSON.stringify(badRes).slice(0, 120));

      // Check what expected_output this challenge has — if none, we can't do the pass half
      if (jsChallenge.expected_output) {
        const goodCode = `console.log(${JSON.stringify(jsChallenge.expected_output)})`;
        const goodRes = await coinsService.submitChallenge(testUser.id, jsChallenge.id, goodCode);
        ok('correct-output submission PASSES', goodRes.passed === true,
          JSON.stringify(goodRes).slice(0, 120));
        ok('coins awarded on pass', (goodRes.coins || 0) >= (jsChallenge.coins_reward || 0),
          `coins=${goodRes.coins}`);
        // Clean up so the test is re-runnable and the student record stays clean
        await adminClient.from('challenge_submissions')
          .delete().eq('user_id', testUser.id).eq('challenge_id', jsChallenge.id);
      } else {
        console.log('  ⚠ challenge has no expected_output — pass-half skipped (structural grading)');
      }
    } else {
      console.log('  ⚠ no active JS challenge or student user found — skipping service submit');
    }

    /* ── 3. Sanity: key public pages still up ── */
    console.log('\n[3] Regression sanity');
    for (const p of ['/', '/courses', '/pricing', '/payments', '/faq', '/sitemap.xml', '/robots.txt']) {
      const res = await fetch(`${BASE}${p}`);
      ok(`${p} → 200`, res.status === 200, `status=${res.status}`);
    }

  } finally {
    await stopServer(server);
  }

  console.log(`\n══════════════════════════════`);
  console.log(`E2E: ${pass} passed, ${fail} failed`);
  console.log(`══════════════════════════════`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
