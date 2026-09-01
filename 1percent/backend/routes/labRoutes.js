const { Router } = require('express');
const https = require('https');

const router = Router();

// Map frontend language names to compiler identifiers
const COMPILER_MAP = {
  javascript: 'typescript-deno',  // Use Deno for JS
  python: 'python-3.14',
  html: null,  // handled locally (iframe preview)
  c: 'gcc-15',
  cpp: 'g++-15',
  java: 'openjdk-25',
  go: 'go-1.26',
  rust: 'rust-1.93',
  php: 'php-8.5',
  ruby: 'ruby-4.0',
  typescript: 'typescript-deno'
};

router.post('/run', async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(422).json({ error: 'Code is required' });

    const apiKey = process.env.COMPILER_API_KEY || '';

    // HTML — render locally as iframe preview
    if (language === 'html') {
      return res.json({
        output: '',
        html_preview: true,
        html: code,
        message: 'HTML rendered in preview panel'
      });
    }

    // Local eval for JavaScript/Python (no API key needed)
    if ((language === 'javascript' || language === 'python' || language === 'typescript') && !apiKey) {
      try {
        const logs = [];
        const fakeConsole = {
          log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          info: (...args) => logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
        };
        // For Python: translate print() to console.log(), input() to a placeholder
        let runCode = code;
        if (language === 'python') {
          runCode = code
            .replace(/print\(([^)]*)\)/g, 'console.log($1)')
            .replace(/input\(([^)]*)\)/g, 'prompt($1 || "Enter: ")')
            .replace(/#.*$/gm, '// $&')  // convert Python comments
            .replace(/def (\w+)\(/g, 'function $1(')
            .replace(/elif /g, 'else if ')
            .replace(/:\s*$/gm, ' {')  // indent blocks
            .replace(/    /g, '  ');
          // Wrap in async to handle top-level code
          runCode = `(async () => { ${runCode} })();`;
        }
        const fn = new Function('console', 'prompt', runCode);
        fn(fakeConsole, (msg) => 'user-input');
        return res.json({ output: logs.join('\n') || '(no output)' });
      } catch (e) {
        return res.json({ output: '', error: e.message });
      }
    }

    // Determine compiler identifier
    const compiler = COMPILER_MAP[language];
    if (!compiler) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    if (!apiKey) {
      return res.json({
        output: '',
        error: 'Compiler API key not configured. JavaScript/Python runs locally. Add COMPILER_API_KEY to .env for other languages.'
      });
    }

    // Call onlinecompiler.io sync endpoint
    const postData = JSON.stringify({ compiler, code, input: '' });

    const options = {
      hostname: 'api.onlinecompiler.io',
      path: '/api/run-code-sync/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => data += chunk);
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          res.json({
            output: result.output || '',
            error: result.error || '',
            exitCode: result.exit_code,
            time: result.time
          });
        } catch {
          res.json({ output: data, error: '' });
        }
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      res.json({ output: '', error: 'Execution timed out (30s limit).' });
    });

    apiReq.on('error', (e) => {
      // Fallback: simple eval for JS
      if (language === 'javascript') {
        try {
          const logs = [];
          const fakeConsole = { log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')) };
          const fn = new Function('console', code);
          fn(fakeConsole);
          return res.json({ output: logs.join('\n') || '(no output)' });
        } catch (err) {
          return res.json({ output: '', error: err.message });
        }
      }
      res.json({ output: '', error: 'Compiler service unavailable. Try JavaScript for local execution.' });
    });

    apiReq.write(postData);
    apiReq.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to run code.' });
  }
});

module.exports = router;
