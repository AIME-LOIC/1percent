/**
 * Regression tests for backend/services/streakService.js
 *
 * No test framework (jest/mocha) is installed in this repo, so this is a
 * dependency-free runner using Node's built-in `assert`. Run it directly:
 *
 *   node backend/tests/streakService.test.js
 *
 * It fakes the Supabase admin client and coinsService so no real database
 * or network access is required, and fakes `Date` so "today" can be moved
 * forward deterministically to simulate multi-day usage.
 */

const assert = require('assert/strict');
const Module = require('module');
const path = require('path');

const STREAK_SERVICE_PATH = path.join(__dirname, 'backend', 'services', 'streakService.js');

// ---------------------------------------------------------------------------
// Fake in-memory "profiles" table + fake Supabase query builder
// ---------------------------------------------------------------------------
let profiles = [];
let coinLog = [];

function findById(id) {
  return profiles.find(p => p.id === id);
}

function queryBuilder() {
  let filters = [];
  let mode = 'list';
  let updateFields = null;

  const builder = {
    select() { return builder; },
    eq(col, val) { filters.push(r => r[col] === val); return builder; },
    gt(col, val) { filters.push(r => (r[col] ?? 0) > val); return builder; },
    lt(col, val) { filters.push(r => r[col] != null && r[col] < val); return builder; },
    order() { return builder; },
    limit() { return builder; },
    single() { mode = 'single'; return builder; },
    update(fields) {
      updateFields = fields;
      return {
        eq(col, val) {
          const row = profiles.find(r => r[col] === val);
          if (row) Object.assign(row, updateFields);
          return Promise.resolve({ data: row, error: null });
        }
      };
    },
    then(resolve) {
      const rows = profiles.filter(r => filters.every(f => f(r)));
      if (mode === 'single') {
        resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } });
      } else {
        resolve({ data: rows, error: null });
      }
    }
  };
  return builder;
}

function installFakeModules() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request.endsWith('config/database')) {
      return { adminClient: { from: () => queryBuilder() }, anonClient: {} };
    }
    if (request.endsWith('coinsService')) {
      return {
        async addCoins(userId, amount, reason) {
          coinLog.push({ userId, amount, reason });
          return { ok: true };
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };
}

// ---------------------------------------------------------------------------
// Fake clock — lets tests set "today" without real waiting
// ---------------------------------------------------------------------------
let simulatedDate = null;
function installFakeClock() {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0 && simulatedDate) super(simulatedDate);
      else super(...args);
    }
    static now() {
      return simulatedDate ? new RealDate(simulatedDate).getTime() : RealDate.now();
    }
  };
}
function setToday(dateStr) {
  simulatedDate = dateStr + 'T09:00:00Z';
}

installFakeModules();
installFakeClock();

// Require after mocks are installed so streakService picks up the fakes.
const streakService = require(STREAK_SERVICE_PATH);

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function resetState(seedProfiles) {
  profiles = seedProfiles.map(p => ({ ...p }));
  coinLog = [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('daily use increments the streak by 1 each day', async () => {
  resetState([{ id: 'u1', streak_count: 0, last_active_date: null }]);

  setToday('2026-09-01'); await streakService.updateStreak('u1');
  setToday('2026-09-02'); await streakService.updateStreak('u1');
  setToday('2026-09-03'); await streakService.updateStreak('u1');

  assert.equal(findById('u1').streak_count, 3);
});

test('completing multiple lessons the same day does not double-increment', async () => {
  resetState([{ id: 'u1', streak_count: 0, last_active_date: null }]);

  setToday('2026-09-01');
  await streakService.updateStreak('u1');
  await streakService.updateStreak('u1'); // same day, second lesson

  assert.equal(findById('u1').streak_count, 1);
});

test('a 1-day gap (came back the very next calendar day) continues the streak', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-02'); // diff = 1 — strict daily streak, this is the only gap that survives
  await streakService.updateStreak('u1');

  assert.equal(findById('u1').streak_count, 6, 'streak should continue, not reset');
});

test('a single missed day (2-day gap) resets the streak to 1 but is forgiven — no coin penalty', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-03'); // diff = 2 -> exactly 1 day beyond the grace window
  await streakService.updateStreak('u1');

  assert.equal(findById('u1').streak_count, 1, 'streak still visibly resets');
  const penalty = coinLog.find(c => c.reason.includes('Streak broken'));
  assert.equal(penalty, undefined, 'a single missed day must not cost coins');
});

test('a second consecutive missed day (3-day gap) does charge the penalty', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-04'); // diff = 3 -> 2 days beyond the grace window
  await streakService.updateStreak('u1');

  assert.equal(findById('u1').streak_count, 1);
  const penalty = coinLog.find(c => c.reason.includes('Streak broken'));
  assert.ok(penalty, 'expected a penalty once the forgiveness allowance is used up');
  assert.equal(penalty.amount, -6, '2 missed days beyond grace = 6 coins');
});

test('REGRESSION: the daily cron must not kill a streak that is still exactly 1 day old', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-02'); // diff = 1, same boundary as the getStreak/updateStreak test above
  const before = await streakService.getStreak('u1');
  assert.equal(before.streak, 5, 'app considers this streak alive');

  const result = await streakService.penalizeMissedStreaks();

  assert.equal(result.penalized, 0, 'cron must not touch a streak inside the grace window');
  assert.equal(findById('u1').streak_count, 5, 'streak_count must be untouched');
});

test('the cron resets a streak past the grace window but also forgives a single missed day', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-03'); // diff = 2, same gap as the forgiven updateStreak test above
  const result = await streakService.penalizeMissedStreaks();

  assert.equal(result.penalized, 1, 'streak_count reset still counts as a real event');
  assert.equal(findById('u1').streak_count, 0);
  const penalty = coinLog.find(c => c.reason.includes('Streak lost'));
  assert.equal(penalty, undefined, 'cron must match updateStreak: 1 missed day is forgiven');
});

test('the cron DOES charge coins once the forgiveness allowance is used up, matching updateStreak', async () => {
  resetState([{ id: 'u1', streak_count: 5, last_active_date: '2026-09-01' }]);

  setToday('2026-09-04'); // diff = 3, same gap as the "second consecutive missed day" test above
  const result = await streakService.penalizeMissedStreaks();

  assert.equal(result.penalized, 1);
  assert.equal(findById('u1').streak_count, 0);
  const penalty = coinLog.find(c => c.reason.includes('Streak lost'));
  assert.equal(penalty.amount, -6, 'must match the 2-missed-days penalty updateStreak would charge for the same gap');
});

test('REGRESSION: a lesson finished just after midnight Kigali time counts as that Kigali day, not the UTC day before', async () => {
  resetState([{ id: 'u1', streak_count: 0, last_active_date: null }]);

  // 11:00 PM UTC on the 5th = 1:00 AM on the 6th in Kigali (UTC+2).
  // Before the timezone fix, _today() read the UTC day and this would have
  // been stored as "2026-09-05" — a full day earlier than the student
  // actually experienced.
  simulatedDate = '2026-09-05T23:00:00Z';
  await streakService.updateStreak('u1');

  assert.equal(findById('u1').last_active_date, '2026-09-06',
    'a 1am Kigali lesson must be recorded as the 6th, not the UTC 5th');

  // Student studies again the next evening: 6 PM UTC on the 7th = 8 PM Kigali
  // on the 7th — the calendar day right after the first session's Kigali day.
  simulatedDate = '2026-09-07T18:00:00Z';
  await streakService.updateStreak('u1');
  assert.equal(findById('u1').streak_count, 2, 'consecutive Kigali calendar days must both count');
});

test('a last_active_date returned as a full timestamp does not break the diff calculation', async () => {
  resetState([{ id: 'u1', streak_count: 3, last_active_date: '2026-09-01T00:00:00.000Z' }]);

  setToday('2026-09-02'); // diff should be 1, not NaN
  const info = await streakService.getStreak('u1');

  assert.equal(info.streak, 3, 'streak must not be zeroed out by a NaN diff');
  assert.equal(info.broken, false);
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
(async () => {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`      ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
