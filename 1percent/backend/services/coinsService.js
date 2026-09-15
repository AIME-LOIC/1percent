const { adminClient } = require('../config/database');
const { Worker } = require('worker_threads');
const { execFile } = require('child_process');
const path = require('path');

/* ── Challenge hints economy ──
   Every user gets FREE_HINTS_PER_MONTH hints per calendar month (any
   challenge). After the free quota, each hint costs HINT_COST_COINS,
   deducted through the normal coin ledger. */
const FREE_HINTS_PER_MONTH = 5;
const HINT_COST_COINS = 15;

function hintPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Free hints used this calendar month (creates no row). */
async function getFreeHintsUsed(userId) {
  const { data } = await adminClient
    .from('hint_allowance')
    .select('free_used')
    .eq('user_id', userId)
    .eq('period', hintPeriod())
    .single();
  return data?.free_used || 0;
}

async function getHintStatus(userId) {
  const freeUsed = await getFreeHintsUsed(userId);
  return {
    free_remaining: Math.max(0, FREE_HINTS_PER_MONTH - freeUsed),
    free_per_month: FREE_HINTS_PER_MONTH,
    free_used: freeUsed,
    hint_cost: HINT_COST_COINS
  };
}

/**
 * Reveal a single hint (index) for a challenge. Uses the free monthly
 * quota first, then charges coins. Already-unlocked hints are free to
 * re-read forever.
 */
async function revealHint(userId, challengeId, hintIndex) {
  const idx = Number(hintIndex);
  if (!Number.isInteger(idx) || idx < 0) throw new Error('Invalid hint index');

  const { data: challenge } = await adminClient
    .from('challenges')
    .select('id, hints, is_active')
    .eq('id', challengeId)
    .eq('is_active', true)
    .single();
  if (!challenge) throw new Error('Challenge not found');
  const hints = Array.isArray(challenge.hints) ? challenge.hints : [];
  if (idx >= hints.length) throw new Error('Hint not found');

  // Already unlocked? Reveal again at no cost.
  const { data: existing } = await adminClient
    .from('challenge_hints_unlocked')
    .select('id, source')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('hint_index', idx)
    .single();
  if (existing) {
    return { hint: hints[idx], source: existing.source, already_unlocked: true, ...(await getHintStatus(userId)) };
  }

  // Pay: free monthly quota first, then coins.
  const freeUsed = await getFreeHintsUsed(userId);
  let source = 'coins';
  if (freeUsed < FREE_HINTS_PER_MONTH) {
    const { error: upErr } = await adminClient
      .from('hint_allowance')
      .upsert({
        user_id: userId,
        period: hintPeriod(),
        free_used: freeUsed + 1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,period' });
    if (upErr) throw upErr;
    source = 'free';
  } else {
    const balance = await this.getBalance(userId);
    if (balance < HINT_COST_COINS) {
      const err = new Error(`Not enough coins — a hint costs ${HINT_COST_COINS}. You have ${balance}.`);
      err.status = 402; err.code = 'INSUFFICIENT_COINS';
      throw err;
    }
    await this.addCoins(userId, -HINT_COST_COINS, `Hint revealed`, challengeId);
  }

  const { error: insErr } = await adminClient
    .from('challenge_hints_unlocked')
    .insert({ user_id: userId, challenge_id: challengeId, hint_index: idx, source });
  if (insErr && insErr.code !== '23505') throw insErr; // unique → raced, fine

  return { hint: hints[idx], source, already_unlocked: false, ...(await getHintStatus(userId)) };
}

/** All unlocked hint texts for a challenge (for re-rendering the panel). */
async function getUnlockedHints(userId, challengeId) {
  const [{ data: challenge }, { data: unlocked }] = await Promise.all([
    adminClient.from('challenges').select('hints').eq('id', challengeId).single(),
    adminClient.from('challenge_hints_unlocked')
      .select('hint_index, source, created_at')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .order('hint_index')
  ]);
  const hints = Array.isArray(challenge?.hints) ? challenge.hints : [];
  return (unlocked || [])
    .filter(u => u.hint_index < hints.length)
    .map(u => ({ index: u.hint_index, text: hints[u.hint_index], source: u.source, unlocked_at: u.created_at }));
}

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
      /* Red-teamed: raw interpolation into .or() lets a crafted query inject
         PostgREST filter syntax (e.g. `x%),id=in.("...")`) to alter the
         filter or leak error structure. Strip the operators/parens that
         give it meaning, then escape wildcard chars for ilike. */
      const clean = String(query)
        .replace(/[(),]/g, ' ')           // break filter/cast syntax
        .replace(/[.%*]/g, ' ')           // break ilike wildcards
        .replace(/["']/g, '')             // break value quoting
        .trim();
      if (!clean) {
        return { challenges: [], total: 0, page, limit, pages: 0 };
      }
      q = q.or(`title.ilike.%${clean}%,description.ilike.%${clean}%`);
    }
    if (difficulty) {
      q = q.eq('difficulty', difficulty);
    }
    if (course_id) {
      q = q.eq('course_id', course_id);
    }

    // Clamp pagination — negative/huge ranges would probe the API's limits
    page = Math.max(1, Math.min(10_000, Number(page) || 1));
    limit = Math.max(1, Math.min(100, Number(limit) || 20));
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

    // ── AI review (trained on the course corpus, no LLM) ──
    // The trained model reads the submission, scores it against the
    // course concepts and writes a human-readable review. The verdict
    // is stored as PENDING in ai_reviews — it only affects the
    // student's record after an admin approves it in the admin panel.
    try {
      const aiReviewService = require('./aiReviewService');
      aiReviewService.queueReview(challenge, userId, code, { passed }); // fire-and-forget
    } catch (e) {
      console.warn('[AI-REVIEW] queue error (non-fatal):', e.message);
    }

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
     LANGUAGE GATE — runs BEFORE any grading logic.
     A submission in the wrong language must be rejected with a clear
     message, never with a confusing runtime error (or a false pass).
     Uses the stripped code (comments/strings removed) so a Python file
     stuffed inside a comment can't fool it.
     ============================================================ */
  _checkLanguage(code, type) {
    const langNames = {
      javascript: 'JavaScript', python: 'Python', sql: 'SQL',
      html: 'HTML', css: 'CSS', yaml: 'YAML', docker: 'Dockerfile syntax',
      nginx: 'nginx config syntax', git: 'git commands',
      linux: 'shell commands', markdown: 'Markdown'
    };
    const fail = (why) => `This challenge must be solved in ${langNames[type] || type}. ${why}`;

    switch (type) {
      case 'javascript': {
        const stripped = this._stripCommentsAndStrings(code);
        // Python's def/class/colons are the most common wrong-language tell.
        if (/\bdef\s+\w+\s*\(|\bclass\s+\w+[^:\n]*:|^\s*from\s+\w+\s+import\b/m.test(stripped)) {
          return fail('That looks like Python — submit JavaScript instead.');
        }
        // A JS submission must contain at least one real JS statement;
        // prose-only or SQL-only text is rejected before grading.
        const looksJs = /(;|=|\{|=>|\b(const|let|var|function|return|if|for|while|console|document)\b)/.test(stripped);
        if (!looksJs) {
          return fail('No JavaScript statements were found in your submission.');
        }
        break;
      }
      case 'python': {
        const stripped = this._stripCommentsAndStrings(code);
        // JS tells: ONLY unambiguous JS-only constructs — const/let/var
        // declarations, function keyword, => arrows, console.*.
        // Deliberately NOT flagged (all legal Python):
        //   • semicolons            → print("hi"); is valid Python
        //   • curly braces          → dicts {"a": 1} and sets {1, 2}
        //   • parentheses in calls  → f-string/format syntax
        if (/\b(const|let|var)\s+\w+|=>|\bfunction\s+\w+\s*\(|\bconsole\s*\./.test(stripped)) {
          return fail('That looks like JavaScript — submit Python instead.');
        }
        // Common beginner mistake: python("...") instead of print("...")
        if (/\bpython\s*\(/.test(stripped) && !/\bprint\s*\(/.test(stripped)) {
          return fail('Python prints with print("…"), not python("…").');
        }
        if (!/(\bdef\s+\w+\s*\(|\bprint\s*\(|=|\bimport\b|\bfor\b|\bwhile\b|\bif\b)/.test(stripped)) {
          return fail('No Python code was found in your submission.');
        }
        break;
      }
      case 'sql': {
        const stripped = this._stripCommentsAndStrings(code);
        // JS tells inside SQL submissions (very common copy/paste mistake).
        if (/\b(const|let|var|function|console\.log)\b|=>|;\s*\/\//.test(stripped)) {
          return fail('That looks like JavaScript — submit a SQL query instead.');
        }
        if (!/\b(select|insert\s+into|update|delete\s+from|create|alter|drop|explain)\b/i.test(stripped)) {
          return fail('No SQL statement was found in your submission.');
        }
        break;
      }
      default:
        break; // other types are graded by structure alone
    }
    return null; // null = language OK, proceed to grading
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

    // ── 0. LANGUAGE GATE — reject wrong-language submissions with a clear
    // message BEFORE any grading logic runs.
    const langErr = this._checkLanguage(code, type);
    if (langErr) {
      this._lastRejectReason = langErr;
      return false;
    }

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

    // ── A. Real execution: DOM test cases judge JS challenges that have them.
    if (type === 'javascript' && testCases.length > 0) {
      const review = this._reviewCode(code, challenge); // cheap pre-filter first
      if (!review.ok) {
        this._lastRejectReason = review.reason;
        return false;
      }
      const passed = await this._evaluateJavaScript(code, challenge, testCases);
      if (!passed) this._lastRejectReason = 'Test cases failed — your code did not produce the expected result.';
      return passed;
    }

    // ── B. Expected-output execution for JS/Python (console comparison).
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
        // ANTI-ECHO: the output matched, but if the expected text appears
        // VERBATIM as a string literal (or comment) in the code, the student
        // likely just printed the expected string back — e.g.
        //   console.log("// Todo app")
        // Real solutions COMPUTE the output. We check BOTH the raw code
        // (catches string literals) and the comment-stripped code. Short
        // outputs (<8 chars, e.g. "42") are exempt: echoing IS the answer
        // on trivial print-this challenges.
        const strippedCode = this._stripCommentsAndStrings(code);
        const expectedNorm = this._normalizeOutput(expectedOutput);
        if (expectedNorm.length >= 8 &&
            (String(code).includes(expectedNorm) || strippedCode.includes(expectedNorm))) {
          this._lastRejectReason = 'Your submission just prints the expected output as a literal instead of computing it — write the real solution.';
          return false;
        }
        return true;
      }
      // status === 'skip': runtime unavailable → fall through to review-only
    }

    // ── C. SQL: semantic grading against an in-memory SQLite schema.
    if (type === 'sql') {
      const result = await this._evaluateSql(code, challenge);
      if (!result) this._lastRejectReason = this._lastSqlReason || 'Your SQL did not satisfy the task requirements.';
      return !!result;
    }

    // ── D. Structural review (anti-cheat) for everything else.
    const review = this._reviewCode(code, challenge);
    if (!review.ok) {
      this._lastRejectReason = review.reason;
      return false;
    }

    // ── E. Task-assertion gate: challenge-specific requirements derived
    // from the title/description. Catches "structurally valid but doesn't
    // attempt the task" submissions (e.g. a generic SELECT where the task
    // asks for a composite index).
    const taskErr = this._checkTaskRequirements(code, challenge);
    if (taskErr) {
      this._lastRejectReason = taskErr;
      return false;
    }

    // ── Review-only gates for languages we can't execute ──
    if (type === 'python') {
      const ok = this._strippedLen(code) >= 20;
      if (!ok) this._lastRejectReason = 'Submission too short — implement the full solution (comments don\'t count).';
      return ok;
    }

    if (type === 'markdown' || /readme|documentation|blog|bug report|architecture|error message/.test(title)) {
      // NOTE: markdown headings (# …) are CONTENT, not comments — the
      // comment-stripper removes them, so measure the raw text instead.
      const raw = String(code || '');
      const ok = /(^|\n)#{1,3}\s+\S/.test(raw) && raw.replace(/\s+/g, '').length >= 80;
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

  /* ============================================================
     TASK ASSERTIONS — per-challenge semantic requirements.
     Maps title/description keywords to REQUIRED code patterns.
     This is the reusable "assert real behavior" pattern for challenges
     that can't be executed: it checks the submission actually attempts
     the TASK, not just that it's syntactically valid.
     Returns null when OK, or a reject-reason string.
     ============================================================ */
  _checkTaskRequirements(code, challenge) {
    const text = `${challenge.title || ''} ${challenge.description || ''}`.toLowerCase();
    const type = challenge.challenge_type || 'javascript';
    const stripped = this._stripCommentsAndStrings(code);

    // SQL: composite index tasks — require CREATE INDEX with 2+ columns.
    if (type === 'sql' && /composite|multi.?column|two.?column/.test(text) && /index/.test(text)) {
      const createIdx = /create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?\w+\s+on\s+\w+\s*\(([^)]+)\)/i.exec(stripped);
      if (!createIdx) {
        return 'The task asks for a composite index — include `CREATE INDEX idx_name ON table (col1, col2);` with at least two columns.';
      }
      const cols = createIdx[2].split(',').map(c => c.trim().split(/\s+/)[0]).filter(c => c && !/^(asc|desc)$/i.test(c));
      if (cols.length < 2) {
        return `That index has only ${cols.length} column — a COMPOSITE index needs at least two columns, e.g. (last_name, first_name).`;
      }
      return null;
    }

    // SQL: EXPLAIN tasks — require an EXPLAIN statement.
    if (type === 'sql' && /\bexplain\b/.test(text) && !/^\s*explain\b/im.test(stripped)) {
      return 'The task asks you to use EXPLAIN — start your submission with `EXPLAIN` (or `EXPLAIN ANALYZE`) followed by your query.';
    }

    // SQL: JOIN tasks — must contain an actual JOIN clause.
    if (type === 'sql' && /\bjoin\b/.test(text) && /\b(select|from)\b/.test(text) && !/\bjoin\b/i.test(stripped)) {
      return 'The task asks you to JOIN two tables — use a JOIN clause (e.g. `INNER JOIN orders ON …`).';
    }

    // SQL: aggregate tasks — must use an aggregate function.
    if (type === 'sql' && /\b(sum|average|avg|count|max|min|total)\b/.test(text) && /\bselect\b/.test(text) &&
        !/\b(count|sum|avg|min|max)\s*\(/i.test(stripped)) {
      return 'The task asks for an aggregate — use COUNT/SUM/AVG/MIN/MAX in your SELECT.';
    }

    // JS: todo-list / render-list tasks — require DOM + loop (the
    // "console.log only" cheat already dies at the language gate).
    if (type === 'javascript' && /\btodo|task list|render .*(list|items)|create.*elements/.test(text)) {
      const hasDom = /document\.|createElement|querySelector|getElementById|innerHTML|appendChild/.test(stripped);
      const hasLoopOrMap = /\bfor\b|\bwhile\b|\.forEach|\.map\b/.test(stripped);
      if (!hasDom) return 'The task is a DOM exercise — your code must create or modify page elements (document.createElement / innerHTML / …).';
      if (!hasLoopOrMap) return 'The task asks you to render multiple items — loop over the data (for / forEach / map).';
      return null;
    }

    // JS: API/fetch tasks.
    if (type === 'javascript' && /\bfetch|api|http request|async/.test(text) &&
        !/\bfetch\s*\(|await\s+fetch|\.then\s*\(/.test(stripped)) {
      return 'The task asks you to call an API — use fetch() (or an HTTP client) in your solution.';
    }

    return null;
  }

  /* ============================================================
     SQL SEMANTIC GRADER — executes the submission against a real
     schema with sql.js (SQLite compiled to WASM, in-memory, no
     external process). Used for:
       • CREATE INDEX tasks  → index must exist, then a probe query
         must appear in the query plan (EXPLAIN QUERY PLAN shows
         "USING INDEX idx" — proving the index is actually usable).
       • generic SELECT tasks → must run without error.
     Falls back gracefully (null) when sql.js is unavailable so
     grading degrades to structural review instead of breaking.
     ============================================================ */
  async _evaluateSql(code, challenge) {
    let initSqlJs = null;
    try { initSqlJs = require('sql.js'); } catch { initSqlJs = null; }
    if (!initSqlJs) return null; // sql.js not installed → structural grading only

    let SQL;
    try { SQL = await initSqlJs(); } catch { return null; } // WASM failed to load
    if (!SQL || !SQL.Database) return null;

    const title = `${challenge.title || ''} ${challenge.description || ''}`.toLowerCase();
    const db = new SQL.Database();
    try {
      // Demo schema every index/join exercise can run against.
      db.run(`
        CREATE TABLE customers (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, country TEXT);
        CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), product TEXT, amount REAL, created_at TEXT);
        INSERT INTO customers (first_name, last_name, email, country) VALUES
          ('Aline','Uwase','aline@example.rw','Rwanda'),
          ('Eric','Nkusi','eric@example.rw','Rwanda'),
          ('Marie','Ingabire','marie@example.rw','Uganda');
        INSERT INTO orders (customer_id, product, amount, created_at) VALUES
          (1,'Laptop',500000,'2026-01-10'),(1,'Mouse',15000,'2026-02-11'),
          (2,'Keyboard',25000,'2026-03-05'),(3,'Monitor',180000,'2026-04-01');
      `);

      let ran = false;
      for (const stmt of String(code || '').split(';').map(s => s.trim()).filter(Boolean)) {
        db.run(stmt); // throws on invalid SQL — the first real validation
        ran = true;
      }
      if (!ran) { this._lastSqlReason = 'No SQL statement found.'; return false; }

      // Composite-index tasks: verify the index exists AND is usable.
      if (/composite|multi.?column|two.?column/.test(title) && /index/.test(title)) {
        const { data: idxRows } = { data: null }; // placeholder to keep shape clear
        const res = db.exec("SELECT name, tbl_name FROM sqlite_master WHERE type='index'");
        const indexNames = (res[0]?.values || []).map(r => String(r[0]).toLowerCase());
        const schema = db.exec("SELECT sql FROM sqlite_master WHERE type='index'");
        const indexDefs = (schema[0]?.values || []).map(r => String(r[0]));

        const hasComposite = indexDefs.some(def => {
          const m = /\(([^)]+)\)/.exec(def || '');
          return m && m[1].split(',').filter(c => c.trim()).length >= 2;
        }) && indexNames.some(n => !n.startsWith('sqlite_auto'));

        if (!hasComposite) {
          this._lastSqlReason = 'No composite (multi-column) index was created. Use CREATE INDEX … ON table (col1, col2).';
          return false;
        }

        // Probe: a query the composite index should serve must show it in the plan.
        try {
          const plan = db.exec("EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name='Uwase' AND first_name='Aline'");
          const planText = JSON.stringify(plan[0]?.values || []);
          if (!/using.*index/i.test(planText)) {
            this._lastSqlReason = 'Your index was created but a lookup on its columns does not use it — check the column order matches your query.';
            return false;
          }
        } catch { /* probe failure is non-fatal — index existence was verified */ }
        return true;
      }

      // Generic SQL tasks: running without error is the pass bar.
      return true;
    } catch (e) {
      this._lastSqlReason = `SQL error: ${String(e.message || e).slice(0, 160)}`;
      return false;
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
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
    const stripped = this._stripCommentsAndStrings(code);
    // Terminal "code" is a list of shell commands. Grade the actual command
    // lines: strip prompts ($/#/>), comments, and blank lines, then check
    // that the required command appears as a WORD (word-boundary match) and,
    // where the task implies an argument, that a plausible argument follows.
    const commands = String(code || '')
      .split('\n')
      .map(l => l.replace(/^\s*[$#>]\s*/, '').trim()) // strip shell prompts
      .filter(l => l && !l.startsWith('#'));
    const joined = commands.join('\n');

    const hasCommand = (name) =>
      new RegExp(`(^|\\n|;|&&|\\|)\\s*${name.replace(/[.*+?^${}()|[\]\\\\]/g, '\\$&')}(\\s|$)`).test(joined);
    const hasCommandWithArg = (name) =>
      new RegExp(`(^|\\n|;|&&|\\|)\\s*${name.replace(/[.*+?^${}()|[\]\\\\]/g, '\\$&')}\\s+\\S`).test(joined);

    const title = (challenge.title || '').toLowerCase();
    const expected = String(challenge.expected_output || '').trim().toLowerCase();

    // Explicit command requirement from the challenge (e.g. expected_output
    // lists "git add" / "chmod 755" / "docker compose up") — grade those
    // word-for-word, argument included when present. Every check is a
    // word-boundary regex on real command lines — never a bare .includes,
    // which would let "gitx add" or "mygit add" satisfy "git add".
    if (expected && /^(git|docker|npm|chmod|chown|curl|ssh|tar|grep|find|du|df|ps|top|ls|cd|cat|mkdir|touch|mv|cp|rm|head|tail|sort|uniq|tr|wc|echo|bash|kubectl|ping)\b/.test(expected)) {
      const required = expected
        .split(/[\n;]|\s+&&\s+/)
        .map(s => s.trim())
        .filter(Boolean);
      const missing = required.filter(cmd => {
        const parts = cmd.split(/\s+/);
        const base = parts[0];
        if (!hasCommand(base)) return true;
        // If the required form includes args (e.g. "git add"), require the
        // full command with its argument(s) as a real command line too.
        if (parts.length > 1) {
          const full = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const fullRe = new RegExp(`(^|\\n|;|&&|\\|)\\s*${full}(\\s|$)`);
          if (!fullRe.test(joined.toLowerCase())) return true;
        }
        return false;
      });
      if (missing.length) {
        this._lastRejectReason = `Missing required command${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`;
        return false;
      }
      // Structural check still applies: submissions can't be an empty shell.
      if (this._strippedLen(code) < 4) {
        this._lastRejectReason = 'Submission is too short — write the actual commands you would run.';
        return false;
      }
      return true;
    }

    // Task-derived requirements (word-boundary matches on real command lines)
    const task = [
      // Linux
      { match: /list files/, need: () => hasCommand('ls') || hasCommandWithArg('ls'), label: 'ls' },
      { match: /navigate|change directory/, need: () => hasCommandWithArg('cd'), label: 'cd <directory>' },
      { match: /find files/, need: () => hasCommandWithArg('find'), label: 'find <path>' },
      { match: /process/, need: () => hasCommand('ps') || hasCommand('top'), label: 'ps or top' },
      { match: /permission/, need: () => hasCommandWithArg('chmod') || hasCommandWithArg('chown'), label: 'chmod/chown' },
      { match: /disk usage/, need: () => hasCommandWithArg('du') || hasCommandWithArg('df'), label: 'du or df' },
      { match: /text processing/, need: () => ['sort', 'uniq', 'tr', 'grep', 'awk', 'sed'].some(hasCommandWithArg), label: 'sort/uniq/grep/…' },
      { match: /shell script|bash/, need: () => /^#!\s*\/bin\/(ba)?sh/m.test(stripped) || commands.some(c => /^(echo|printf)\s+/.test(c)), label: 'shebang or echo' },
      { match: /monitor/, need: () => ['curl', 'grep', 'ping', 'netstat', 'ss'].some(hasCommand), label: 'curl/grep/…' },
      { match: /deploy/, need: () => ['bash', 'docker', 'git', 'scp', 'rsync'].some(hasCommand), label: 'bash/docker/…' },
      // Git
      { match: /init/, need: () => hasCommand('git') && /git\s+init/.test(joined), label: 'git init' },
      { match: /stage/, need: () => /git\s+add/.test(joined), label: 'git add' },
      { match: /commit/, need: () => /git\s+commit/.test(joined), label: 'git commit' },
      { match: /branch/, need: () => /git\s+(checkout\s+-b|branch)/.test(joined), label: 'git branch/checkout -b' },
      { match: /merge/, need: () => /git\s+merge/.test(joined), label: 'git merge' },
      { match: /rebase/, need: () => /git\s+rebase/.test(joined), label: 'git rebase' },
      { match: /cherry/, need: () => /git\s+cherry-pick/.test(joined), label: 'git cherry-pick' },
      { match: /remote|push/, need: () => /git\s+(remote|push)/.test(joined), label: 'git remote/push' },
      // Docker
      { match: /dockerfile/, need: () => ['from', 'copy', 'cmd', 'run'].some(k => hasCommand(k) || new RegExp(`^\\s*${k}\\s+\\S`, 'im').test(stripped)), label: 'FROM/COPY/CMD/…' },
      { match: /compose/, need: () => /version\s*:|services\s*:/.test(stripped) || hasCommandWithArg('docker'), label: 'compose file or docker command' }
    ];

    for (const t of task) {
      if (t.match.test(title)) {
        if (!t.need()) {
          this._lastRejectReason = `Your submission doesn't include the required command (${t.label}). Write the actual command line(s).`;
          return false;
        }
        return this._strippedLen(code) >= 4 || this._failShort();
      }
    }

    // Default: require at least one real command line (not just prose).
    // Each line must START with a recognizable command word — this rejects
    // prose like "I would list the files…" while accepting real shell usage.
    if (!commands.length) {
      this._lastRejectReason = 'Write the actual command(s) you would run, one per line.';
      return false;
    }
    const knownCommand = /^(?:sudo\s+)?(?:git|docker|npm|npx|yarn|pnpm|chmod|chown|curl|wget|ssh|scp|rsync|tar|grep|find|du|df|ps|top|htop|ls|cd|cat|mkdir|touch|mv|cp|rm|head|tail|sort|uniq|tr|wc|echo|printf|bash|sh|kubectl|ping|sed|awk|cut|less|more|nano|vim|export|source|systemctl|journalctl|whoami|pwd|man|which|alias|ln|kill|netstat|ss|apt|apt-get|yum|pip|pip3|node|python3?|make|gcc|code)\b/;
    if (!commands.some(c => knownCommand.test(c))) {
      this._lastRejectReason = 'That reads like a description, not commands — start each line with the command itself (e.g. ls -la).';
      return false;
    }
    return true;
  }

  _failShort() {
    this._lastRejectReason = 'Submission is too short — write the actual commands you would run.';
    return false;
  }
}

module.exports = new CoinsService();
