/* ============================================================
   Challenge Evaluator — Worker Thread
   ============================================================
   Receives code + test_cases via parentPort, runs the code in
   a vm context with a JSDOM document, evaluates each test case,
   and posts back { passed: boolean }.

   Designed to be terminated externally via worker.terminate()
   for reliable infinite-loop protection.
   ============================================================ */

const { parentPort } = require('worker_threads');
const vm = require('vm');
const { JSDOM } = require('jsdom');

// Signal ready once all heavy modules (jsdom) are loaded, so the parent can
// start its execution timeout from here instead of from worker creation —
// a slow cold start then never eats into the user's execution budget.
parentPort.postMessage({ ready: true });

parentPort.on('message', ({ code, starterHtml, testCases, captureOutput }) => {
  let result = false;

  try {
    // 1. Create JSDOM with starter HTML
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    const { window } = dom;
    const { document } = window;

    if (starterHtml) {
      document.body.innerHTML = starterHtml;
    }

    // Console capture — every submission's console.* goes here
    const logs = [];
    const pushLog = (...args) => logs.push(args.map(a => {
      if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a); } catch { return String(a); } }
      return String(a);
    }).join(' '));
    const sandboxConsole = {
      log: pushLog, info: pushLog, warn: pushLog, error: pushLog, debug: pushLog
    };

    // 2. Build sandboxed vm context — safe globals only
    const sandbox = {
      document, window,
      console: sandboxConsole,
      setTimeout, setInterval, clearTimeout, clearInterval,
      Array, Object, String, Number, Boolean, RegExp, Date, Math,
      JSON, parseInt, parseFloat, isNaN, isFinite,
      TypeError, RangeError, SyntaxError, ReferenceError, Error
    };
    const context = vm.createContext(sandbox);

    // 3. Run submitted code (worker will be terminated if this hangs).
    // Challenge snippets often register DOMContentLoaded handlers — the
    // document is already interactive by the time the worker runs, so
    // fire the event right after the code executes.
    const script = new vm.Script(code, { filename: 'challenge-submission.js' });
    script.runInContext(context);

    try {
      document.dispatchEvent(new window.Event('DOMContentLoaded'));
      if (typeof window.onload === 'function') {
        try { window.onload(); } catch (e) { parentPort.postMessage({ passed: false, error: e.message }); return; }
      }
    } catch (e) {
      parentPort.postMessage({ passed: false, error: e.message });
      return;
    }

    // Output-capture mode: report console output instead of DOM assertions
    if (captureOutput) {
      parentPort.postMessage({ passed: true, output: logs.join('\n') });
      return;
    }

    // 4. Evaluate test cases
    for (const tc of testCases) {
      const el = document.querySelector(tc.selector);
      if (!el) {
        parentPort.postMessage({ passed: false, reason: `selector "${tc.selector}" matched nothing` });
        return;
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
          parentPort.postMessage({ passed: false, reason: `${tc.description || tc.selector}: expected array length ${tc.expected.length}, got ${arr.length}` });
          return;
        }
        for (let i = 0; i < tc.expected.length; i++) {
          if (String(arr[i]) !== String(tc.expected[i])) {
            parentPort.postMessage({ passed: false, reason: `${tc.description || tc.selector}: index ${i} expected "${tc.expected[i]}", got "${arr[i]}"` });
            return;
          }
        }
      } else {
        if (value != tc.expected) {
          parentPort.postMessage({ passed: false, reason: `${tc.description || tc.selector}: expected ${tc.expected}, got ${value}` });
          return;
        }
      }
    }

    result = true;
    parentPort.postMessage({ passed: true });

  } catch (err) {
    parentPort.postMessage({ passed: false, reason: `Runtime error: ${err.message}` });
  }
});
