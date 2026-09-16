/* ============================================================
   fix_challenge_hints pipeline test — no live DB needed.
   Reuses the script's logic (filler detection + SQL emission)
   and EXECUTES the emitted SQL on a local Postgres to prove it
   is valid, re-runnable, and that hand-authored (non-filler)
   hints are skipped.
   ============================================================ */
const { execFileSync } = require('child_process');
const { generateHints } = require('./backend/services/hintGenerator');

const FILLER = [
  'Re-read the task carefully and identify exactly what output or behavior is expected.',
  'Break the problem into small steps and solve one step at a time.',
  'Check your syntax: variable names, brackets, and quotes must match exactly.'
];
function isFiller(hints) {
  if (!Array.isArray(hints) || hints.length === 0) return true;
  if (hints.length !== FILLER.length) return false;
  return hints.every((h, i) => String(h).trim() === FILLER[i]);
}
function dollarQuote(s, tag) {
  return `$${tag}$${s}$${tag}$`;
}

const PSQL = '/usr/lib/postgresql/18/bin/psql';
const PG = ['-h', '/tmp', '-p', '55433', '-U', 'testuser', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-A'];

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

function q(sql) {
  return execFileSync(PSQL, [...PG, '-t', '-c', sql], { encoding: 'utf8' }).trim();
}

const MOCK = [
  { id: '11111111-1111-1111-1111-111111111111', title: 'Top of the leaderboard', description: 'Given the scores list, print the highest score (just the number). Try max() — or find it with a loop.', starter_code: 'scores = [45, 82]', challenge_type: 'python', hints: FILLER },
  { id: '22222222-2222-2222-2222-222222222222', title: 'Fix the missing appendChild', description: 'The list stays empty. Fix it so the tasks appear.', starter_code: 'const list = document.querySelector("#task-list");', starter_html: '<ul id="task-list"></ul>', challenge_type: 'javascript', test_cases: [{ description: 'Task list should have 2 items' }], hints: FILLER },
  { id: '33333333-3333-3333-3333-333333333333', title: 'Stage your changes', description: 'Stage all modified files.', starter_code: '', challenge_type: 'git', expected_output: 'git add', hints: FILLER },
  { id: '44444444-4444-4444-4444-444444444444', title: 'Hand-authored challenge', description: 'Custom mentor challenge.', starter_code: '', challenge_type: 'sql', hints: ['My custom hint 1', 'My custom hint 2'] }
];

console.log('── Emitting SQL from mock challenges (script logic) ──');
const updates = [];
for (const ch of MOCK) {
  if (!isFiller(ch.hints)) continue; // skip custom
  updates.push({ ch, hints: generateHints(ch) });
}
ok('filler detection: 3 to update, custom skipped', updates.length === 3, `got ${updates.length}`);

const blocks = updates.map(({ ch, hints }) => {
  const tag = 'h' + String(ch.id).replace(/-/g, '');
  const arr = `jsonb_build_array(\n${hints.map(h => `    ${dollarQuote(h, tag)}`).join(',\n')}\n  )`;
  return `UPDATE public.challenges SET hints = ${arr} WHERE id = '${ch.id}';`;
});
const sql = blocks.join('\n\n');

console.log('\n── Seeding local Postgres (schema + filler rows) ──');
execFileSync(PSQL, [...PG, '-f', '-'], { input: `
  CREATE TABLE IF NOT EXISTS public.challenges (
    id uuid PRIMARY KEY, title text, description text, starter_code text,
    starter_html text, expected_output text, challenge_type text,
    test_cases jsonb DEFAULT '[]', hints jsonb DEFAULT '[]'::jsonb, is_active boolean DEFAULT true
  );
  DELETE FROM public.challenges;
  INSERT INTO public.challenges (id, title, hints) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Top of the leaderboard', '${JSON.stringify(FILLER).replace(/'/g, "''")}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'Fix the missing appendChild', '${JSON.stringify(FILLER).replace(/'/g, "''")}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'Stage your changes', '${JSON.stringify(FILLER).replace(/'/g, "''")}'::jsonb),
    ('44444444-4444-4444-4444-444444444444', 'Hand-authored challenge', '[{"a":1}]'::jsonb);
` });
ok('seeded 4 challenges with filler hints', q(`SELECT count(*) FROM public.challenges;`) === '4');

console.log('\n── Executing emitted SQL ──');
execFileSync(PSQL, [...PG, '-f', '-'], { input: sql });
ok('emitted SQL executes without error', true);

const shapes = JSON.parse(q(`SELECT coalesce(json_agg(x),'[]') FROM (SELECT id, jsonb_array_length(hints) AS n, hints->>0 AS first FROM public.challenges ORDER BY id) x;`));
const byId = Object.fromEntries(shapes.map(s => [s.id, s]));
ok('all filler challenges now have exactly 3 hints', ['1', '2', '3'].every(id => shapes.some(s => s.id.startsWith(id) && s.n === 3)), JSON.stringify(shapes));
ok('custom-hint challenge untouched (still 1 element)', shapes.some(s => s.id.startsWith('4') && s.n === 1), JSON.stringify(shapes));
ok('python hint names the intended tool (max)', /max\(\)/.test(shapes.find(s => s.id.startsWith('1')).first), shapes.find(s => s.id.startsWith('1')).first);
ok('js hints reference the task-list id', /task-list/.test(q(`SELECT array_to_string(ARRAY(SELECT jsonb_array_elements_text(hints)), ' ') FROM public.challenges WHERE id='22222222-2222-2222-2222-222222222222';`)));
ok('git hint references git add', /git add/.test(q(`SELECT array_to_string(ARRAY(SELECT jsonb_array_elements_text(hints)), ' ') FROM public.challenges WHERE id='33333333-3333-3333-3333-333333333333';`)));

console.log('\n── Re-run (idempotency) ──');
execFileSync(PSQL, [...PG, '-f', '-'], { input: sql });
const re = q(`SELECT json_agg(jsonb_array_length(hints) ORDER BY id) FROM public.challenges;`);
ok('re-run keeps exactly 3 hints per filler challenge', re === '[3, 3, 3, 1]', re);
console.log(`\n═════════════════════════════════════════════════════`);
console.log(`${pass}/${pass + fail} tests passed`);
process.exit(fail ? 1 : 0);
