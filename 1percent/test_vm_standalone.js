#!/usr/bin/env node
/* ============================================================
   Standalone test: vm + jsdom grading (no Supabase needed)
   ============================================================
   Run:  node test_vm_standalone.js
   ============================================================ */

const vm = require('vm');
const { JSDOM } = require('jsdom');

/**
 * Exact copy of _evaluateJavaScript from coinsService.js
 * so we can test it in isolation.
 */
function evaluateJavaScript(code, challenge, testCases) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });
  const { window } = dom;
  const { document } = window;

  if (challenge.starter_html) {
    document.body.innerHTML = challenge.starter_html;
  }

  const sandbox = {
    document,
    window,
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Array, Object, String, Number, Boolean, RegExp, Date, Math,
    JSON, parseInt, parseFloat, isNaN, isFinite,
    TypeError, RangeError, SyntaxError, ReferenceError, Error
  };

  const context = vm.createContext(sandbox);

  try {
    const script = new vm.Script(code, {
      filename: 'challenge-submission.js',
      timeout: challenge.vm_timeout_ms || 2000
    });
    script.runInContext(context);
  } catch (err) {
    console.warn(`  [VM] Runtime error: ${err.message}`);
    return false;
  }

  try {
    for (const tc of testCases) {
      const el = document.querySelector(tc.selector);
      if (!el) {
        console.warn(`  [VM] test failed: selector "${tc.selector}" matched nothing`);
        return false;
      }

      let value = el;
      const parts = (tc.property || '').split('.').filter(Boolean);
      for (const p of parts) {
        if (value == null) break;
        value = value[p];
      }

      if (Array.isArray(tc.expected)) {
        const arr = Array.isArray(value) ? Array.from(value) : [];
        if (arr.length !== tc.expected.length) {
          console.warn(`  [VM] test failed (${tc.description || tc.selector}): expected array length ${tc.expected.length}, got ${arr.length}`);
          return false;
        }
        for (let i = 0; i < tc.expected.length; i++) {
          if (String(arr[i]) !== String(tc.expected[i])) {
            console.warn(`  [VM] test failed (${tc.description || tc.selector}): index ${i} expected "${tc.expected[i]}", got "${arr[i]}"`);
            return false;
          }
        }
      } else {
        if (value != tc.expected) {
          console.warn(`  [VM] test failed (${tc.description || tc.selector}): expected ${tc.expected}, got ${value}`);
          return false;
        }
      }
    }
  } catch (err) {
    console.warn(`  [VM] Error evaluating test cases: ${err.message}`);
    return false;
  }

  return true;
}

// ── Challenge fixtures ───────────────────────────────────────

const challenge1 = {
  title: 'Fix the missing appendChild',
  challenge_type: 'javascript',
  starter_html: '<ul id="task-list"></ul>',
  test_cases: [
    { selector: '#task-list', property: 'children.length', expected: 2, description: 'Task list should have 2 items' },
    { selector: '#task-list li:nth-child(1)', property: 'textContent', expected: 'Call mom', description: 'First item should be Call mom' },
    { selector: '#task-list li:nth-child(2)', property: 'textContent', expected: 'Clean room', description: 'Second item should be Clean room' }
  ]
};

const challenge2 = {
  title: 'Render colors from scratch',
  challenge_type: 'javascript',
  starter_html: '<ul id="color-list"></ul>',
  test_cases: [
    { selector: '#color-list', property: 'children.length', expected: 3, description: 'Color list should have 3 items' },
    { selector: '#color-list li:nth-child(1)', property: 'textContent', expected: 'red', description: 'First color should be red' },
    { selector: '#color-list li:nth-child(2)', property: 'textContent', expected: 'green', description: 'Second color should be green' },
    { selector: '#color-list li:nth-child(3)', property: 'textContent', expected: 'blue', description: 'Third color should be blue' }
  ]
};

// ── Submission code snippets ─────────────────────────────────

// Challenge 1 — BROKEN (missing appendChild)
const c1_broken = `const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");

tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
  // missing something here
});`;

// Challenge 1 — CORRECT (has appendChild)
const c1_correct = `const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");

tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
  list.appendChild(li);
});`;

// Challenge 2 — BROKEN (empty / no code)
const c2_broken = '';

// Challenge 2 — CORRECT (renders colors)
const c2_correct = `const colors = ["red", "green", "blue"];
const list = document.querySelector("#color-list");

colors.forEach(function(color) {
  const li = document.createElement("li");
  li.textContent = color;
  list.appendChild(li);
});`;

// ── Run tests ────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, result, expected) {
  const ok = result === expected;
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} ${label}: got ${result}, expected ${expected}`);
  if (ok) passed++; else failed++;
}

console.log('\n═══ Challenge 1: "Fix the missing appendChild" ═══\n');

const c1a = evaluateJavaScript(c1_broken, challenge1, challenge1.test_cases);
test('Broken code (no appendChild)', c1a, false);

const c1b = evaluateJavaScript(c1_correct, challenge1, challenge1.test_cases);
test('Correct code (with appendChild)', c1b, true);

console.log('\n═══ Challenge 2: "Render colors from scratch" ═══\n');

const c2a = evaluateJavaScript(c2_broken, challenge2, challenge2.test_cases);
test('Broken code (empty string)', c2a, false);

const c2b = evaluateJavaScript(c2_correct, challenge2, challenge2.test_cases);
test('Correct code (renders 3 colors)', c2b, true);

// ── Edge case: runtime error ─────────────────────────────────

console.log('\n═══ Edge case: runtime error in submitted code ═══\n');

const c_runtime_err = `document.querySelector("#task-list").appendChild(document.createElement("li"));
throw new Error("oops");`;

const c1_err = evaluateJavaScript(c_runtime_err, challenge1, challenge1.test_cases);
test('Runtime error → should fail gracefully', c1_err, false);

// ── Edge case: infinite loop (timeout) ───────────────────────

console.log('\n═══ Edge case: infinite loop (vm timeout) ═══\n');

const c_infinite = `while(true) {}`;
const challenge_timeout = { ...challenge1, vm_timeout_ms: 500 };
const c1_timeout = evaluateJavaScript(c_infinite, challenge_timeout, challenge1.test_cases);
test('Infinite loop → should fail (timeout)', c1_timeout, false);

// ── Edge case: wrong element ─────────────────────────────────

console.log('\n═══ Edge case: code targets wrong element ═══\n');

const c_wrong_element = `const list = document.querySelector("#wrong-id");
if (list) {
  const li = document.createElement("li");
  li.textContent = "Call mom";
  list.appendChild(li);
}`;

const c1_wrong = evaluateJavaScript(c_wrong_element, challenge1, challenge1.test_cases);
test('Wrong selector → should fail', c1_wrong, false);

// ── Edge case: partial correct (only 1 of 2 items) ───────────

console.log('\n═══ Edge case: partial correct (only 1 item) ═══\n');

const c_partial = `const tasks = ["Call mom"];
const list = document.querySelector("#task-list");

tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
  list.appendChild(li);
});`;

const c1_partial = evaluateJavaScript(c_partial, challenge1, challenge1.test_cases);
test('Partial code (1 of 2 items) → should fail', c1_partial, false);

// ── Summary ──────────────────────────────────────────────────

console.log(`\n══════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`══════════════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);
