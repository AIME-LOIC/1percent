#!/usr/bin/env node
/* ============================================================
   Manual test: vm + jsdom grading for challenge submissions
   ============================================================
   Run:  node test_vm_grading.js

   Tests both seeded challenges with broken starter code
   (should FAIL) and correct code (should PASS).
   ============================================================ */

const coinsService = require('./backend/services/coinsService');

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

const c1a = coinsService._evaluateJavaScript(c1_broken, challenge1, challenge1.test_cases);
test('Broken code (no appendChild)', c1a, false);

const c1b = coinsService._evaluateJavaScript(c1_correct, challenge1, challenge1.test_cases);
test('Correct code (with appendChild)', c1b, true);

console.log('\n═══ Challenge 2: "Render colors from scratch" ═══\n');

const c2a = coinsService._evaluateJavaScript(c2_broken, challenge2, challenge2.test_cases);
test('Broken code (empty string)', c2a, false);

const c2b = coinsService._evaluateJavaScript(c2_correct, challenge2, challenge2.test_cases);
test('Correct code (renders 3 colors)', c2b, true);

// ── Edge case: runtime error ─────────────────────────────────

console.log('\n═══ Edge case: runtime error in submitted code ═══\n');

const c_runtime_err = `document.querySelector("#task-list").appendChild(document.createElement("li"));
throw new Error("oops");`;

const c1_err = coinsService._evaluateJavaScript(c_runtime_err, challenge1, challenge1.test_cases);
test('Runtime error → should fail gracefully', c1_err, false);

// ── Edge case: infinite loop (timeout) ───────────────────────

console.log('\n═══ Edge case: infinite loop (vm timeout) ═══\n');

const c_infinite = `while(true) {}`;

const challenge_timeout = { ...challenge1, vm_timeout_ms: 500 };
const c1_timeout = coinsService._evaluateJavaScript(c_infinite, challenge_timeout, challenge1.test_cases);
test('Infinite loop → should fail (timeout)', c1_timeout, false);

// ── Summary ──────────────────────────────────────────────────

console.log(`\n══════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`══════════════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);
