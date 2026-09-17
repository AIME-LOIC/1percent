/**
 * routes/labRoutes.js
 *
 * PURPOSE:
 *   Code Lab routes: CRUD the signed-in user's lab_files (quota enforced per subscription tier:
 *   free/starter 5, pro 10, unlimited).
 *
 * ENDPOINTS:
 *   POST /run
 *
 * EXPORTS: router
 * DEPENDENCIES: express, https
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const https = require('https');
const { authenticate } = require('../middlewares/auth');
const { authRateLimit } = require('../middlewares/rateLimit');

const router = Router();

// Map frontend language names to compiler identifiers
const COMPILER_MAP = {
  python: 'python-3.14',
  html: null,  // handled locally (iframe preview)
  c: 'gcc-15',
  cpp: 'g++-15',
  java: 'openjdk-25',
  go: 'go-1.26',
  rust: 'rust-1.93',
  php: 'php-8.5',
  ruby: 'ruby-4.0'
};

// Client-side execution languages (Web Worker in the browser)
const CLIENT_RUN = new Set(['javascript', 'typescript']);

// Hard caps — anything bigger is rejected before it goes anywhere
const MAX_CODE_LENGTH = 64_000;
const MAX_COMPILER_BODY = 80_000;

// All lab endpoints require authentication — unauthenticated calls get 401
router.use(authenticate);

// Relay abuse guard: a shared cap per user (15 min window), tighter than
// the global limiter so the compiler relay can't be hammered.
const relayHits = new Map();
setInterval(() => relayHits.clear(), 15 * 60 * 1000).unref();

function relayLimit(req, res, next) {
  const key = req.user?.id || req.ip;
  const now = Date.now();
  const entry = relayHits.get(key);
  if (!entry || now - entry.start > 15 * 60 * 1000) {
    relayHits.set(key, { start: now, count: 1 });
    return next();
  }
  entry.count++;
  if (entry.count > 60) {
    return res.status(429).json({ error: 'Too many executions. Please wait a few minutes.' });
  }
  next();
}

router.post('/run', authRateLimit, relayLimit, async (req, res) => {
  try {
    const { code, language } = req.body || {};

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(422).json({ error: 'Code is required' });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return res.status(413).json({ error: 'Code too large (64KB max).' });
    }

    // HTML — render locally in the client iframe (never executed server-side)
    if (language === 'html') {
      if (code.length > MAX_CODE_LENGTH) {
        return res.status(413).json({ error: 'HTML too large.' });
      }
      return res.json({
        output: '',
        html_preview: true,
        html: code,
        message: 'HTML rendered in preview panel'
      });
    }

    // JavaScript / TypeScript — run in the USER'S browser (Web Worker).
    // The server only tells the client how to execute it; no user code is
    // ever evaluated here. (This keeps the existing response contract while
    // the actual sandbox lives in the client.)
    if (CLIENT_RUN.has(language)) {
      return res.json({
        output: '',
        client_run: true,
        language,
        code,
        message: 'Executed in your browser sandbox (Web Worker)'
      });
    }

    // Python and compiled languages — external sandboxed compiler
    const compiler = COMPILER_MAP[language];
    if (!compiler) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const apiKey = process.env.COMPILER_API_KEY || '';
    if (!apiKey) {
      return res.status(503).json({
        error: 'Compiler service not configured for this language. JavaScript and TypeScript still run in your browser.'
      });
    }

    const postData = JSON.stringify({ compiler, code, input: '' });
    if (postData.length > MAX_COMPILER_BODY) {
      return res.status(413).json({ error: 'Payload too large.' });
    }

    const options = {
      hostname: 'api.onlinecompiler.io',
      path: '/api/run-code-sync/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => {
        data += chunk;
        if (data.length > 256 * 1024) apiReq.destroy(); // response size cap
      });
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          res.json({
            output: String(result.output || '').slice(0, 16_000),
            error: String(result.error || '').slice(0, 4_000),
            exitCode: result.exit_code,
            time: result.time
          });
        } catch {
          res.json({ output: data.slice(0, 16_000), error: '' });
        }
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      res.json({ output: '', error: 'Execution timed out (15s limit).' });
    });

    apiReq.on('error', () => {
      res.status(502).json({ output: '', error: 'Compiler service unavailable. JavaScript and TypeScript still run in your browser.' });
    });

    apiReq.write(postData);
    apiReq.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to run code.' });
  }
});

module.exports = router;
