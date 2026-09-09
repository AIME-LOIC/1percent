#!/usr/bin/env node
const vm = require('vm');
const { JSDOM } = require('jsdom');

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
    document, window, console,
    setTimeout, setInterval, clearTimeout, clearInterval,
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
        console.warn(`  [VM] selector "${tc.selector}" matched nothing`);
        return false;
      }
      let value = el;
      for (const p of (tc.property || '').split('.').filter(Boolean)) {
        if (value == null) break;
        value = value[p];
      }
      if (Array.isArray(tc.expected)) {
        const arr = Array.isArray(value) ? Array.from(value) : [];
        if (arr.length !== tc.expected.length) return false;
        for (let i = 0; i < tc.expected.length; i++) {
          if (String(arr[i]) !== String(tc.expected[i])) return false;
        }
      } else {
        if (value != tc.expected) return false;
      }
    }
  } catch (err) {
    console.warn(`  [VM] Error evaluating test cases: ${err.message}`);
    return false;
  }
  return true;
}

const c1 = {
  title: 'Fix the missing appendChild',
  starter_html: '<ul id="task-list"></ul>',
  test_cases: [
    { selector: '#task-list', property: 'children.length', expected: 2, description: 'Task list should have 2 items' },
    { selector: '#task-list li:nth-child(1)', property: 'textContent', expected: 'Call mom', description: 'First item should be Call mom' },
    { selector: '#task-list li:nth-child(2)', property: 'textContent', expected: 'Clean room', description: 'Second item should be Clean room' }
  ]
};

const c2 = {
  title: 'Render colors from scratch',
  starter_html: '<ul id="color-list"></ul>',
  test_cases: [
    { selector: '#color-list', property: 'children.length', expected: 3, description: 'Color list should have 3 items' },
    { selector: '#color-list li:nth-child(1)', property: 'textContent', expected: 'red', description: 'First color should be red' },
    { selector: '#color-list li:nth-child(2)', property: 'textContent', expected: 'green', description: 'Second color should be green' },
    { selector: '#color-list li:nth-child(3)', property: 'textContent', expected: 'blue', description: 'Third color should be blue' }
  ]
};

let passed = 0, failed = 0;
function test(label, result, expected) {
  const ok = result === expected;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: got ${result}, expected ${expected}`);
  if (ok) passed++; else failed++;
}

console.log('\n═══ Challenge 1 ═══\n');

test('Broken (no appendChild)',
  evaluateJavaScript(`const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");
tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
});`, c1, c1.test_cases), false);

test('Correct (with appendChild)',
  evaluateJavaScript(`const tasks = ["Call mom", "Clean room"];
const list = document.querySelector("#task-list");
tasks.forEach(function(task) {
  const li = document.createElement("li");
  li.textContent = task;
  list.appendChild(li);
});`, c1, c1.test_cases), true);

console.log('\n═══ Challenge 2 ═══\n');

test('Broken (empty string)',
  evaluateJavaScript('', c2, c2.test_cases), false);

test('Correct (renders 3 colors)',
  evaluateJavaScript(`const colors = ["red", "green", "blue"];
const list = document.querySelector("#color-list");
colors.forEach(function(color) {
  const li = document.createElement("li");
  li.textContent = color;
  list.appendChild(li);
});`, c2, c2.test_cases), true);

console.log('\n═══ Edge cases ═══\n');

test('Runtime error → fails',
  evaluateJavaScript(`throw new Error("oops");`, c1, c1.test_cases), false);

test('Partial (1 of 2 items) → fails',
  evaluateJavaScript(`const list = document.querySelector("#task-list");
const li = document.createElement("li");
li.textContent = "Call mom";
list.appendChild(li);`, c1, c1.test_cases), false);

test('Wrong selector → fails',
  evaluateJavaScript(`const list = document.querySelector("#wrong-id");
if (list) { list.appendChild(document.createElement("li")); }`, c1, c1.test_cases), false);

console.log(`\n══════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`══════════════════════════════════════\n`);
process.exit(failed > 0 ? 1 : 0);
