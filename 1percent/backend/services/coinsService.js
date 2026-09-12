const { adminClient } = require('../config/database');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const path = require('path');

class CoinsService {
  async getBalance(userId) {
    const { data, error } = await adminClient
      .from('profiles').select('coins').eq('id', userId).single();
    if (error) throw error;
    return data.coins || 0;
  }

  async getTransactions(userId, limit = 20) {
    const { data, error } = await adminClient
      .from('coin_transactions')
      .select('id, amount, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async addCoins(userId, amount, reason, referenceId = null) {
    const { error } = await adminClient.rpc('add_coins', {
      uid: userId, amt: amount, rsn: reason, ref: referenceId
    });
    if (error) {
      // Fallback: direct update
      const { data: profile } = await adminClient
        .from('profiles').select('coins').eq('id', userId).single();
      const newBalance = (profile?.coins || 0) + amount;
      await adminClient.from('profiles').update({ coins: newBalance }).eq('id', userId);
      await adminClient.from('coin_transactions').insert({
        user_id: userId, amount, reason, reference_id: referenceId
      });
    }
  }

  async isLessonLocked(userId, lessonId) {
    const { data: lock } = await adminClient
      .from('lesson_locks').select('coins_required, is_free')
      .eq('lesson_id', lessonId).single();

    if (!lock || lock.is_free) return false;

    const coins = await this.getBalance(userId);
    return coins < lock.coins_required;
  }

  async unlockLesson(userId, lessonId) {
    const { data: lock } = await adminClient
      .from('lesson_locks').select('coins_required')
      .eq('lesson_id', lessonId).single();

    if (!lock) return { unlocked: true, cost: 0 };

    const coins = await this.getBalance(userId);
    if (coins < lock.coins_required) {
      throw new Error(`Need ${lock.coins_required} coins to unlock. You have ${coins}.`);
    }

    await this.addCoins(userId, -lock.coins_required, `Unlocked lesson`, lessonId);
    return { unlocked: true, cost: lock.coins_required, remaining: coins - lock.coins_required };
  }

  async getChallenges(courseId) {
    const { data, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data;
  }

  async getAllChallenges() {
    const { data, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      course_title: c.courses?.title || '',
      course_slug: c.courses?.slug || '',
      courses: undefined
    }));
  }

  async searchChallenges({ query = '', difficulty = '', course_id = '', page = 1, limit = 20 } = {}) {
    let q = adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)', { count: 'exact' })
      .eq('is_active', true);

    if (query) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (difficulty) {
      q = q.eq('difficulty', difficulty);
    }
    if (course_id) {
      q = q.eq('course_id', course_id);
    }

    const offset = (page - 1) * limit;
    q = q.order('sort_order').range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw error;

    return {
      challenges: (data || []).map(c => ({
        ...c,
        course_title: c.courses?.title || '',
        course_slug: c.courses?.slug || '',
        courses: undefined
      })),
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit)
    };
  }

  async getDailyChallenge() {
    // Use date-based seed to pick a consistent daily challenge
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get all active challenges
    const { data: challenges, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error || !challenges?.length) return null;

    // Simple hash of date string to pick a consistent challenge for the day
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % challenges.length;
    const daily = challenges[index];

    // Bonus coins for daily challenge (50% extra)
    const bonusCoins = Math.ceil(daily.coins_reward * 0.5);

    return {
      ...daily,
      course_title: daily.courses?.title || '',
      course_slug: daily.courses?.slug || '',
      courses: undefined,
      is_daily: true,
      daily_date: dateStr,
      bonus_coins: bonusCoins,
      total_reward: daily.coins_reward + bonusCoins
    };
  }

  async getUserPassedChallenges(userId) {
    const { data, error } = await adminClient
      .from('challenge_submissions')
      .select('challenge_id')
      .eq('user_id', userId)
      .eq('passed', true);
    if (error) throw error;
    return (data || []).map(s => s.challenge_id);
  }

  async getUserSubmissions(userId, courseId) {
    const { data, error } = await adminClient
      .from('challenge_submissions')
      .select('challenge_id, passed, submitted_at')
      .eq('user_id', userId);
    if (error) throw error;

    const challengeIds = (data || []).filter(s => s.passed).map(s => s.challenge_id);
    return challengeIds;
  }

  async submitChallenge(userId, challengeId, code, isDaily = false) {
    // Get challenge details
    const { data: challenge } = await adminClient
      .from('challenges').select('*').eq('id', challengeId).single();
    if (!challenge) throw new Error('Challenge not found');

    // Check if already passed
    const { data: existing } = await adminClient
      .from('challenge_submissions')
      .select('id').eq('user_id', userId).eq('challenge_id', challengeId).eq('passed', true).single();
    if (existing) return { passed: true, already: true, coins: 0 };

    // Evaluate code — may be async for JavaScript type with test_cases
    const passed = await this._evaluateCode(code, challenge);

    // Save submission
    await adminClient.from('challenge_submissions').upsert({
      user_id: userId, challenge_id: challengeId, code, passed
    }, { onConflict: 'user_id,challenge_id' });

    // Award coins if passed
    let coinsAwarded = 0;
    if (passed) {
      coinsAwarded = challenge.coins_reward;
      // Daily challenge bonus: 50% extra coins
      if (isDaily) {
        const bonus = Math.ceil(challenge.coins_reward * 0.5);
        coinsAwarded += bonus;
        await this.addCoins(userId, bonus, `Daily Challenge Bonus: ${challenge.title}`, challengeId);
      }
      await this.addCoins(userId, challenge.coins_reward, `Challenge: ${challenge.title}`, challengeId);
    }

    return { passed, coins: coinsAwarded, total: await this.getBalance(userId), is_daily: isDaily };
  }

  /* ============================================================
     Structural code review — the anti-cheat layer.
     Strips comments and string literals so keyword checks can't be
     fooled by prose (e.g. a comment containing "console.log"), then
     applies real code-structure requirements per language.
     Returns { ok, reason } instead of a bare boolean.
     ============================================================ */
  _stripCommentsAndStrings(code) {
    return String(code || '')
      // block comments
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      // line comments (// or # — covers JS, Python, Dockerfile, nginx, YAML)
      .replace(/(^|\s)(?:\/\/|#)[^\n\r]*/g, '$1')
      // string literals
      .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
      .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
  }

  _strippedLen(code) {
    return this._stripCommentsAndStrings(code).replace(/\s+/g, '').length;
  }

  _reviewCode(code, challenge) {
    const type = challenge.challenge_type || 'javascript';
    const stripped = this._stripCommentsAndStrings(code);
    const fails = (reason) => ({ ok: false, reason });

    // Universal: reject trivial submissions
    if (stripped.replace(/\s+/g, '').length < 20) {
      return fails('Submission is too short — write a real implementation.');
    }

    switch (type) {
      case 'javascript': {
        const hasStatement = /;|\n\s*(const|let|var|function|class|return|for|while|if|document\.|console\.)/.test(stripped);
        if (!hasStatement) return fails('No real JavaScript statements found — write actual code, not just words.');
        const hasLogic = /(function|=>|\bfor\b|\bwhile\b|\bif\b|\bswitch\b|\bclass\b|document\.|querySelector|createElement|addEventListener)/.test(stripped);
        if (!hasLogic) return fails('Your code has no logic — define a function, loop, condition, or DOM operation.');
        // Prose filter: real JS has calls (parens) AND assignment/termination punctuation
        const hasCall = /\w+\s*\(/.test(stripped);
        const hasPunct = /(=|;|\{|=>)/.test(stripped);
        if (!hasCall || !hasPunct) return fails('That reads like a description, not JavaScript — write executable statements (assignments, calls, loops).');
        break;
      }
      case 'python': {
        // Require real structure: def/class with parens+colon, control flow
        // ending with ":", or a top-level call statement like print(6 * 7)
        const hasStructure = /(\bdef\s+\w+\s*\([^)]*\)\s*:|\bclass\s+\w+[^:\n]*:|^\s*(if|for|while|elif|else|try|except|with)\b[^:\n]*:|^\s*[A-Za-z_][\w.]*\s*\(.+\))/m.test(stripped);
        if (!hasStructure) return fails('No Python structures found — define a function (def …():) or a loop/condition ending with ":".');
        break;
      }
      case 'sql': {
        const hasStatement = /\b(select|insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\b/i.test(stripped);
        if (!hasStatement) return fails('No SQL statement found (SELECT / INSERT / CREATE TABLE / …).');
        const hasClause = /\b(from|into|values|set|table|where|join|group\s+by|order\s+by|primary\s+key|references)\b/i.test(stripped);
        const hasSqlPunct = /[;*(),=`]|\b(between|is\s+not|null|like|in)\b/i.test(stripped);
        if (!hasClause || !hasSqlPunct) return fails('Write a complete SQL statement — e.g. SELECT columns FROM table WHERE condition.');
        break;
      }
      case 'docker': {
        if (!/^\s*FROM\s+\S+/im.test(stripped)) return fails('A Dockerfile must start with a FROM instruction.');
        const hasBuildStep = /^\s*(RUN|COPY|ADD|CMD|ENTRYPOINT|WORKDIR|EXPOSE|ENV)\s+\S+/im.test(stripped);
        if (!hasBuildStep) return fails('Add real Dockerfile instructions (RUN / COPY / CMD / …).');
        break;
      }
      case 'yaml': {
        const hasKeys = /^\s*[A-Za-z_][\w-]*\s*:(\s|$)/m.test(stripped);
        if (!hasKeys) return fails('YAML must define keys (key: value).');
        if (stripped.split('\n').filter(l => /:\s/.test(l)).length < 2) {
          return fails('YAML is too minimal — define your configuration structure.');
        }
        break;
      }
      case 'nginx': {
        if (!/(server|http|location|events)\s*\{/i.test(stripped)) return fails('nginx config needs a server { } or location { } block.');
        if (!/\b(listen|proxy_pass|root|server_name)\b/i.test(stripped)) {
          return fails('Add real directives (listen / root / proxy_pass / server_name).');
        }
        break;
      }
      case 'css': {
        if (!/[^{}]+\{[^}]*:[^}]*\}/.test(stripped)) return fails('Write at least one complete CSS rule (selector { property: value; }).');
        break;
      }
      case 'html': {
        if (!(/<\w+[^>]*>[\s\S]*<\/\w+>/i.test(stripped) || /<(div|span|ul|li|p|h[1-6]|section|button|input|a)\b/i.test(stripped))) {
          return fails('Write real HTML elements, not plain text.');
        }
        break;
      }
      default:
        break;
    }

    return { ok: true, reason: null };
  }

  /* ── Real execution: run the code and capture what it prints ── */

  _normalizeOutput(s) {
    return String(s || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .join('\n')
      .replace(/\n+$/, '')
      .trim();
  }

  _outputsMatch(actual, expected) {
    return this._normalizeOutput(actual) === this._normalizeOutput(expected);
  }

  _runCodeCaptureOutput(code, type) {
    if (type === 'javascript') return this._runWorkerCaptureOutput(code);
    if (type === 'python') return this._runPythonCaptureOutput(code);
    return Promise.resolve({ status: 'skip' });
  }

  /** Run JS in the sandboxed VM worker, capturing console output. */
  _runWorkerCaptureOutput(code) {
    return new Promise((resolve) => {
      const timeout = 3000;
      const workerPath = path.join(__dirname, '..', 'workers', 'challenge-evaluator.js');
      const worker = new Worker(workerPath, { workerData: null });
      worker.unref(); // never let a lingering worker block process exit
      let settled = false;
      let timer = null;
      // Boot failsafe: if the worker never becomes ready (hung require, etc.),
      // give up after 4× the execution budget instead of hanging forever.
      let bootTimer = setTimeout(() => settle({ status: 'error', reason: 'Sandbox failed to start. Please try again.' }), timeout * 4);
      const armTimer = () => {
        clearTimeout(bootTimer);
        // Armed only after the worker reports ready — the cold-start require()
        // of jsdom must not eat into the execution timeout.
        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            worker.terminate();
            resolve({ status: 'error', reason: 'Execution timed out (3s limit).' });
          }
        }, timeout);
      };
      const settle = (result) => {
        if (settled) return;
        settled = true;
        if (bootTimer) clearTimeout(bootTimer);
        if (timer) clearTimeout(timer);
        try { worker.terminate(); } catch { } // free the thread; we have our answer
        resolve(result);
      };
      worker.on('message', (msg) => {
        if (msg && msg.ready) { armTimer(); return; }
        if (msg.error) settle({ status: 'error', reason: `Runtime error: ${msg.error}`, output: msg.output || '' });
        else settle({ status: 'ok', output: msg.output || '' });
      });
      worker.on('error', (err) => settle({ status: 'error', reason: err.message }));
      worker.postMessage({ code, starterHtml: '', testCases: [], captureOutput: true });
    });
  }

  /** Run Python via the system interpreter. status 'skip' = no python3. */
  _runPythonCaptureOutput(code) {
    return new Promise((resolve) => {
      try {
        execFile('python3', ['-I', '-c', code], { timeout: 5000, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
          if (err) {
            if (err.killed || err.signal === 'SIGTERM') {
              return resolve({ status: 'error', reason: 'Execution timed out (5s limit).' });
            }
            if (err.code === 'ENOENT') return resolve({ status: 'skip' });
            const tail = String(stderr || err.message || '').trim().split('\n').slice(-3).join('\n');
            return resolve({ status: 'error', reason: `Python error: ${tail}` });
          }
          resolve({ status: 'ok', output: String(stdout || '') });
        });
      } catch {
        resolve({ status: 'skip' });
      }
    });
  }

  async _evaluateCode(code, challenge) {
    const type = challenge.challenge_type || 'javascript';
    const title = (challenge.title || '').toLowerCase();

    // Terminal (Linux/Git) challenges: check command output in the submitted text
    if (type === 'linux' || type === 'git') {
      return this._evaluateTerminal(code, challenge);
    }

    let testCases = challenge.test_cases;
    // Supabase may return jsonb as a string — parse it
    if (typeof testCases === 'string') {
      try { testCases = JSON.parse(testCases); } catch { testCases = []; }
    }
    if (!Array.isArray(testCases)) testCases = [];
    const expectedOutput = String(challenge.expected_output || '').trim();

    // ── Real execution first: when a challenge defines test cases or an
    // expected output, that result IS the judge. Short-but-correct
    // one-liners must not be rejected by structural review, and junk
    // can't sneak through because it produces the wrong output anyway.
    if (type === 'javascript' && testCases.length > 0) {
      const passed = await this._evaluateJavaScript(code, challenge, testCases);
      if (!passed) this._lastRejectReason = 'Test cases failed — your code did not produce the expected result.';
      return passed;
    }

    if (expectedOutput && (type === 'javascript' || type === 'python')) {
      const run = await this._runCodeCaptureOutput(code, type);
      if (run.status === 'error') {
        this._lastRejectReason = run.reason;
        return false;
      }
      if (run.status === 'ok') {
        const matched = this._outputsMatch(run.output, expectedOutput);
        if (!matched) {
          this._lastRejectReason = `Output mismatch — expected "${this._normalizeOutput(expectedOutput).slice(0, 120)}" but your code printed "${this._normalizeOutput(run.output).slice(0, 120) || '(nothing)'}".`;
          return false;
        }
        return true;
      }
      // status === 'skip': runtime unavailable → fall through to review-only
    }

    // ── Structural review (anti-cheat) for challenges we can't grade by
    // execution: strips comments/strings so keyword soup fails.
    const review = this._reviewCode(code, challenge);
    if (!review.ok) {
      this._lastRejectReason = review.reason;
      return false;
    }

    // ── Review-only gates for languages we can't execute ──
    if (type === 'python') {
      const ok = this._strippedLen(code) >= 20;
      if (!ok) this._lastRejectReason = 'Submission too short — implement the full solution (comments don\'t count).';
      return ok;
    }

    if (type === 'markdown' || /readme|documentation|blog|bug report|architecture|error message/.test(title)) {
      const ok = /(^|\n)#{1,3}\s+\S/.test(String(code || '')) && this._strippedLen(code) >= 80;
      if (!ok) this._lastRejectReason = 'A proper document needs headings (## …) and substantial written content.';
      return ok;
    }

    // Languages that already passed structural review: require substance
    // (threshold mirrors the universal review minimum — short-but-real
    // submissions like `SELECT * FROM users;` or a minimal Dockerfile pass)
    const ok = this._strippedLen(code) >= 20;
    if (!ok) this._lastRejectReason = 'Submission too short — comments and whitespace don\'t count.';
    return ok;
  }

  /**
   * Run submitted JavaScript in a worker thread with a JSDOM document.
   * The worker is terminated after vm_timeout_ms (default 2000 ms),
   * so even infinite loops are killed reliably.
   *
   * test_case shape:
   *   { selector, property, expected, description? }
   *
   *   selector   — CSS selector string passed to document.querySelector()
   *   property   — dot-path on the result of querySelector (e.g. "children.length")
   *   expected   — the value to compare against (loose equality ==)
   */
  _evaluateJavaScript(code, challenge, testCases) {
    return new Promise((resolve) => {
      const timeout = challenge.vm_timeout_ms || 2000;
      const workerPath = path.join(__dirname, '..', 'workers', 'challenge-evaluator.js');

      const worker = new Worker(workerPath, {
        workerData: null
      });
      worker.unref(); // never let a lingering worker block process exit

      let settled = false;
      let timer = null;
      // Boot failsafe: never hang forever if the worker never becomes ready.
      const bootTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[VM] Worker never signalled ready');
          worker.terminate();
          resolve(false);
        }
      }, timeout * 4);

      // Arm the timeout only after the worker reports ready, so the
      // cold-start require() of jsdom doesn't consume execution time.
      const armTimer = () => {
        clearTimeout(bootTimer);
        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            console.warn(`[VM] Worker terminated after ${timeout}ms (timeout)`);
            worker.terminate();
            resolve(false);
          }
        }, timeout);
      };

      worker.on('message', (msg) => {
        if (msg && msg.ready) { armTimer(); return; }
        if (!settled) {
          settled = true;
          clearTimeout(bootTimer);
          if (timer) clearTimeout(timer);
          try { worker.terminate(); } catch { } // free the thread; we have our answer
          if (msg.reason) console.warn(`[VM] ${msg.reason}`);
          resolve(!!msg.passed);
        }
      });

      worker.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(bootTimer);
          if (timer) clearTimeout(timer);
          console.warn(`[VM] Worker error: ${err.message}`);
          resolve(false);
        }
      });

      worker.postMessage({
        code,
        starterHtml: challenge.starter_html || '',
        testCases
      });
    });
  }

  _evaluateTerminal(code, challenge) {
    const text = (code || '').toLowerCase();
    const title = challenge.title.toLowerCase();
    const expected = (challenge.expected_output || '').toLowerCase();

    // Linux commands
    if (title.includes('list files')) return text.includes('ls');
    if (title.includes('navigate')) return text.includes('cd');
    if (title.includes('find files')) return text.includes('find');
    if (title.includes('process')) return text.includes('ps') || text.includes('top');
    if (title.includes('permission')) return text.includes('chmod');
    if (title.includes('disk usage')) return text.includes('du') || text.includes('sort');
    if (title.includes('text processing')) return text.includes('sort') || text.includes('uniq') || text.includes('tr');
    if (title.includes('shell script') || title.includes('bash')) return text.includes('#!/bin/bash') || text.includes('echo');
    if (title.includes('monitor')) return text.includes('curl') || text.includes('grep') || text.includes('ping');
    if (title.includes('deploy')) return text.includes('bash') || text.includes('docker') || text.includes('git');

    // Git commands
    if (title.includes('init')) return text.includes('git init');
    if (title.includes('stage') && title.includes('commit')) return text.includes('git add') && text.includes('git commit');
    if (title.includes('branch') && title.includes('create')) return text.includes('git checkout -b') || text.includes('git branch');
    if (title.includes('merge')) return text.includes('git merge');
    if (title.includes('conflict')) return text.includes('git merge') || text.includes('conflict');
    if (title.includes('rebase')) return text.includes('git rebase');
    if (title.includes('cherry')) return text.includes('git cherry');

    // Docker
    if (title.includes('dockerfile')) return text.includes('from ') || text.includes('copy') || text.includes('cmd');
    if (title.includes('compose')) return text.includes('version') || text.includes('services');

    // Default: if they ran commands
    return text.includes('git ') || text.includes('ls') || text.includes('cd ') || code.length > 20;
  }
}

module.exports = new CoinsService();
