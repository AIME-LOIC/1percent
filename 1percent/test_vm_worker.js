#!/usr/bin/env node
/* ============================================================
   Test: worker-based challenge evaluator
   Run:  node test_vm_worker.js
   ============================================================ */

const { Worker } = require('worker_threads');
const path = require('path');

function evaluateInWorker(code, starterHtml, testCases, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, 'backend', 'workers', 'challenge-evaluator.js');
    const worker = new Worker(workerPath);
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        worker.terminate();
        resolve({ passed: false, reason: 'timeout' });
      }
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(msg);
      }
    });

    worker.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ passed: false, reason: err.message });
      }
    });

    worker.postMessage({ code, starterHtml, testCases });
  });
}

// ── Challenge fixtures ───────────────────────────────────────

const c1_tests = [
  { selector: '#task-list', property: 'children.length', expected: 2, description: 'Task list should have 2 items' },
  { selector: '#task-list li:nth-child(1)', property: 'textContent', expected: 'Call mom', description: 'First item' },
  { selector: '#task-list li:nth-child(2)', property: 'textContent', expected: 'Clean room', description: 'Second item' }
];

const c2_tests = [
  { selector: '#color-list', property: 'children.length', expected: 3, description: 'Color list should have 3 items' },
  { selector: '#color-list li:nth-child(1)', property: 'textContent', expected: 'red', description: 'First color' },
  { selector: '#color-list li:nth-child(2)', property: 'textContent', expected: 'green', description: 'Second color' },
  { selector: '#color-list li:nth-child(3)', property: 'textContent', expected: 'blue', description: 'Third color' }
];

// ── Run all tests ────────────────────────────────────────────

async function run() {
  let passed = 0, failed = 0;
  function check(label, result, expected) {
    const ok = result === expected;
    console.log(`  ${ok ? '✅' : '❌'} ${label}: ${result ? 'PASS' : 'FAIL'} (expected ${expected ? 'PASS' : 'FAIL'})`);
    if (ok) passed++; else failed++;
  }

  // ── Challenge 1 ──────────────────────────────────────────────

  console.log('\n═══ Challenge 1: "Fix the missing appendChild" ═══\n');

  const c1_broken = `const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");
tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
});`;

  const c1_correct = `const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");
tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
  list.appendChild(li);
});`;

  const r1a = await evaluateInWorker(c1_broken, '<ul id="task-list"></ul>', c1_tests);
  check('Broken code (no appendChild)', r1a.passed, false);

  const r1b = await evaluateInWorker(c1_correct, '<ul id="task-list"></ul>', c1_tests);
  check('Correct code (with appendChild)', r1b.passed, true);

  // ── Challenge 2 ──────────────────────────────────────────────

  console.log('\n═══ Challenge 2: "Render colors from scratch" ═══\n');

  const c2_broken = '';

  const c2_correct = `const colors = ["red", "green", "blue"];
const list = document.querySelector("#color-list");
colors.forEach(function(color) {
  const li = document.createElement("li");
  li.textContent = color;
  list.appendChild(li);
});`;

  const r2a = await evaluateInWorker(c2_broken, '<ul id="color-list"></ul>', c2_tests);
  check('Broken code (empty string)', r2a.passed, false);

  const r2b = await evaluateInWorker(c2_correct, '<ul id="color-list"></ul>', c2_tests);
  check('Correct code (renders 3 colors)', r2b.passed, true);

  // ── Edge cases ───────────────────────────────────────────────

  console.log('\n═══ Edge cases ═══\n');

  const r_err = await evaluateInWorker('throw new Error("oops");', '<ul id="task-list"></ul>', c1_tests);
  check('Runtime error → fails', r_err.passed, false);

  const r_partial = await evaluateInWorker(`const list = document.querySelector("#task-list");
const li = document.createElement("li");
li.textContent = "Call mom";
list.appendChild(li);`, '<ul id="task-list"></ul>', c1_tests);
  check('Partial (1 of 2 items) → fails', r_partial.passed, false);

  const r_timeout = await evaluateInWorker('while(true){}', '<ul id="task-list"></ul>', c1_tests, 500);
  check('Infinite loop → fails (500ms timeout)', r_timeout.passed, false);

  const r_wrong = await evaluateInWorker(`const list = document.querySelector("#wrong-id");
if (list) { list.appendChild(document.createElement("li")); }`, '<ul id="task-list"></ul>', c1_tests);
  check('Wrong selector → fails', r_wrong.passed, false);

  // ── Summary ──────────────────────────────────────────────────

  console.log(`\n══════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
