/* ============================================================
   AI ENGINE · TRAINING PIPELINE
   ------------------------------------------------------------
   "Training" here means: read the ENTIRE course corpus
   (courses → lessons → challenges → solved submissions) from
   your own Supabase, extract code features from every code
   sample, count how concepts co-occur, and COMPILE the result
   into a static knowledge base (model.json).

   It is classical statistical learning (TF-IDF + co-occurrence
   + per-course concept profiling) — deterministic, offline,
   fully inspectable, and requires NO LLM, NO API keys, and NO
   data leaving your infrastructure.

   Run it with:  node backend/ai/train.js
   Re-run it any time course content changes (or wire it to the
   admin "Rebuild AI model" action in adminController).
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { adminClient } = require('../config/database');
const { extractFeatures } = require('./features');
const { meaningfulTokens, wordSequence } = require('./tokenizer');

const MODEL_PATH = path.join(__dirname, 'model.json');

/* Stopwords: words too generic to carry concept meaning. */
const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','is','are','was','were','be','been','being',
  'this','that','these','those','it','its','as','at','by','from','into','if','then','than','so','such',
  'we','you','your','they','them','their','he','she','his','her','not','no','yes','but','can','will',
  'would','should','could','do','does','did','have','has','had','how','what','when','where','which','who',
  'use','using','used','make','made','let','lets','also','more','most','some','any','all','each','other',
  'function','code','example','lesson','course','chapter','step','next','first','second','one','two','three',
]);

/* Concept seed lexicons: canonical concept → trigger words.
   The training corpus refines these weights, but the seeds
   anchor every concept so the model stays stable even when
   the corpus is small. */
const CONCEPT_SEEDS = {
  loops:            ['for', 'while', 'loop', 'iterate', 'iteration', 'range', 'foreach', 'do'],
  conditionals:     ['if', 'else', 'elif', 'switch', 'case', 'condition', 'branch', 'ternary'],
  functions:        ['function', 'def', 'return', 'parameter', 'argument', 'call', 'arrow', 'closure', 'lambda'],
  arrays:           ['array', 'list', 'push', 'pop', 'map', 'filter', 'reduce', 'slice', 'splice', 'index', 'length'],
  objects:          ['object', 'key', 'value', 'property', 'entries', 'keys', 'literal'],
  strings:          ['string', 'concat', 'split', 'join', 'substring', 'template', 'char', 'tolowercase', 'touppercase', 'trim'],
  numbers:          ['number', 'int', 'float', 'math', 'round', 'floor', 'ceil', 'abs', 'parseint', 'parsefloat', 'modulo', 'remainder'],
  dom:              ['document', 'queryselector', 'queryselectorall', 'createelement', 'appendchild', 'addeventlistener', 'innerhtml', 'textcontent', 'dom', 'event', 'click', 'element', 'classlist', 'getelementbyid'],
  async:            ['async', 'await', 'promise', 'then', 'fetch', 'callback', 'setTimeout', 'setInterval', 'resolve', 'reject'],
  errors:           ['try', 'catch', 'except', 'finally', 'throw', 'error', 'exception', 'raise'],
  classes_oop:      ['class', 'constructor', 'extends', 'super', 'this', 'instance', 'method', 'inheritance', 'encapsulation', 'polymorphism'],
  recursion:        ['recursion', 'recursive', 'base', 'case', 'callstack'],
  modules:          ['import', 'export', 'require', 'module', 'default', 'named', 'namespace', 'package', 'npm'],
  variables:        ['const', 'let', 'var', 'variable', 'scope', 'hoisting', 'declaration', 'assignment', 'mutate'],
  operators:        ['operator', 'equality', 'assignment', 'comparison', 'logical', 'increment', 'decrement', 'typeof', 'instanceof'],
  data_structures:  ['stack', 'queue', 'set', 'map', 'dictionary', 'hash', 'linked', 'tree', 'graph', 'heap'],
  algorithms:       ['algorithm', 'complexity', 'bigo', 'sort', 'search', 'binary', 'linear', 'bubble', 'merge', 'quicksort', 'efficiency'],
  sql_basics:       ['select', 'from', 'where', 'insert', 'update', 'delete', 'join', 'group', 'order', 'table', 'query', 'database', 'schema', 'primary', 'foreign'],
  git:              ['git', 'commit', 'branch', 'merge', 'rebase', 'push', 'pull', 'remote', 'clone', 'stash', 'log', 'diff', 'conflict', 'github'],
  terminal:         ['terminal', 'shell', 'bash', 'command', 'chmod', 'chown', 'ls', 'mkdir', 'grep', 'find', 'pipe', 'permission', 'sudo', 'process'],
  docker:           ['docker', 'container', 'image', 'dockerfile', 'compose', 'volume', 'port', 'build', 'registry'],
  testing:          ['test', 'testing', 'assert', 'expect', 'unit', 'integration', 'debug', 'debugging', 'breakpoint', 'tdd', 'coverage'],
  css_fundamentals: ['css', 'selector', 'flexbox', 'grid', 'display', 'position', 'margin', 'padding', 'color', 'background', 'font', 'responsive', 'media', 'specificity', 'box'],
  html_structure:   ['html', 'tag', 'element', 'attribute', 'semantic', 'heading', 'form', 'input', 'anchor', 'list', 'table', 'div', 'span'],
  api_http:         ['api', 'http', 'request', 'response', 'rest', 'get', 'post', 'put', 'delete', 'endpoint', 'json', 'status', 'header', 'cors'],
  security:         ['auth', 'authentication', 'authorization', 'password', 'hash', 'salt', 'jwt', 'token', 'session', 'xss', 'sql', 'injection', 'https', 'encryption'],
  devops:           ['deploy', 'deployment', 'ci', 'cd', 'pipeline', 'environment', 'production', 'server', 'nginx', 'linux', 'ssh', 'monitoring'],
  documentation:    ['readme', 'markdown', 'documentation', 'comment', 'docstring', 'heading', 'changelog', 'readability'],
  python_specific:  ['python', 'pip', 'venv', 'numpy', 'pandas', 'list', 'tuple', 'dict', 'set', 'indentation'],
  ai_tools:         ['ai', 'copilot', 'prompt', 'chatgpt', 'llm', 'assistant', 'autocomplete', 'suggestion', 'review'],
  project_practice: ['project', 'portfolio', 'capstone', 'build', 'practice', 'exercise', 'challenge', 'ship', 'deploy'],
};

/* Technical vocabulary that marks a token as a "code concept word"
   (used to distinguish code-ish identifiers from plain prose). */
const CODE_HINTS = /^(for|while|if|else|function|def|return|const|let|var|class|import|export|from|try|catch|except|async|await|document|console|window|array|string|number|object|promise|queryselector|createelement|appendchild|addeventlistener|map|filter|reduce|push|pop|split|join|select|insert|update|delete|where|git|commit|docker|chmod|print|input|len|range|self|this)$/i;

/* ────────────────────────────────────────────────────────────
   Text utilities
   ──────────────────────────────────────────────────────────── */

/* Split prose into normalized word tokens. */
function proseWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s+#-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/* All course text for one course: descriptions + lesson content. */
function courseCorpusText(course) {
  const parts = [course.title, course.description, course.level || ''];
  for (const l of course.lessons || []) {
    parts.push(l.title, l.description, l.content_md);
  }
  return parts.join('\n');
}

/* ────────────────────────────────────────────────────────────
   THE TRAINER
   ──────────────────────────────────────────────────────────── */

async function trainModel({ verbose = true } = {}) {
  const t0 = Date.now();
  if (verbose) console.log('[AI TRAIN] Fetching course corpus from Supabase…');

  /* ── 1. Pull the full corpus in three parallel queries ── */
  const [coursesRes, challengesRes, solvedRes] = await Promise.all([
    adminClient.from('courses')
      .select('id, slug, title, description, level, is_published, lessons(title, description, content_md, lesson_type, is_published)')
      .eq('is_published', true),
    adminClient.from('challenges')
      .select('id, title, description, challenge_type, difficulty, expected_output, starter_code, test_cases, course_id')
      .eq('is_active', true),
    // Solved submissions: real student code that PASSED — the strongest
    // signal of what "correct code for this course" looks like.
    adminClient.from('challenge_submissions')
      .select('challenge_id, code, passed')
      .eq('passed', true)
      .limit(500),
  ]);

  if (coursesRes.error) throw coursesRes.error;
  const courses = coursesRes.data || [];
  const challenges = challengesRes.data || [];
  const solved = solvedRes.data || [];

  /* ── 2. Global vocabulary with document frequency (for TF-IDF) ── */
  const docFreq = new Map();      // word → number of courses containing it
  const totalDocs = courses.length || 1;

  /* Per-course profiles: the heart of the model. */
  const courseProfiles = courses.map(course => {
    const text = courseCorpusText(course);
    const words = proseWords(text);

    // Term frequency for this course's vocabulary
    const tf = new Map();
    for (const w of words) tf.set(w, (tf.get(w) || 0) + 1);

    // Update document frequency (once per course)
    for (const w of new Set(tf.keys())) {
      docFreq.set(w, (docFreq.get(w) || 0) + 1);
    }

    /* Concept scores for this course:
       score(concept) = Σ over seed-words found in the course vocab,
       weighted by how DISTINCTIVE the word is across courses (IDF). */
    const vocab = new Set(tf.keys());
    const concepts = {};
    for (const [concept, seeds] of Object.entries(CONCEPT_SEEDS)) {
      let score = 0;
      let hits = [];
      for (const seed of seeds) {
        const w = seed.toLowerCase();
        if (vocab.has(w)) {
          const idf = Math.log(1 + totalDocs / (1 + (docFreq.get(w) || 0)));
          score += 1 + idf;   // base weight + distinctiveness
          hits.push(seed);
        }
      }
      if (score > 0) concepts[concept] = { score: Math.round(score * 100) / 100, hits };
    }

    /* Code features from lesson code fences (```lang … ``` blocks)
       and from the challenge starter code belonging to this course. */
    const codeSamples = [];
    const fenceRe = /```[a-zA-Z]*\n([\s\S]*?)```/g;
    let m;
    while ((m = fenceRe.exec(text)) !== null) {
      if (m[1] && m[1].trim().length > 20) codeSamples.push(m[1]);
    }
    for (const ch of challenges.filter(c => c.course_id === course.id)) {
      if (ch.starter_code && ch.starter_code.trim().length > 10) codeSamples.push(ch.starter_code);
    }

    // Feature-extract every sample and aggregate which APIs/patterns appear
    const patterns = new Map();       // "console.log" → count
    let sampleCount = 0;
    for (const sample of codeSamples.slice(0, 60)) {  // cap for train time
      try {
        const feats = extractFeatures(sample, course.detect_language || 'javascript');
        sampleCount++;
        for (const c of feats.calls) patterns.set(c, (patterns.get(c) || 0) + 1);
        for (const mc of feats.methodCalls) patterns.set(mc, (patterns.get(mc) || 0) + 1);
      } catch { /* a broken fence must never break training */ }
    }

    /* Challenge vocabulary: what words do the tasks of this course use?
       (Helps the reviewer match a submission to the challenge intent.) */
    const challengeWords = new Set();
    for (const ch of challenges.filter(c => c.course_id === course.id)) {
      for (const w of proseWords(`${ch.title} ${ch.description}`)) challengeWords.add(w);
    }

    return {
      slug: course.slug,
      title: course.title,
      level: course.level,
      is_published: course.is_published,
      conceptScores: concepts,
      topWords: [...tf.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 60)
        .map(([w, c]) => ({ w, c })),
      patterns: [...patterns.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([p, c]) => ({ p, c })),
      challengeWords: [...challengeWords].slice(0, 80),
      codeSampleCount: sampleCount,
    };
  });

  /* ── 3. Challenge profiles: expected code shape per challenge ──
     From starter_code we learn which APIs the task revolves
     around; from expected_output its output contract. */
  const challengeProfiles = challenges.map(ch => {
    let feats = null;
    try {
      if (ch.starter_code) feats = extractFeatures(ch.starter_code, ch.challenge_type);
    } catch { /* ignore */ }

    let testCases = ch.test_cases;
    if (typeof testCases === 'string') {
      try { testCases = JSON.parse(testCases); } catch { testCases = []; }
    }

    return {
      id: ch.id,
      title: ch.title,
      type: ch.challenge_type,
      difficulty: ch.difficulty,
      concepts: proseWords(`${ch.title} ${ch.description}`).slice(0, 20),
      starterCalls: feats ? [...new Set(feats.calls)].slice(0, 15) : [],
      starterMethods: feats ? [...new Set(feats.methodCalls)].slice(0, 15) : [],
      hasTests: Array.isArray(testCases) && testCases.length > 0,
      expectedOutput: ch.expected_output || '',
      courseSlug: courses.find(c => c.id === ch.course_id)?.slug || '',
    };
  });

  /* ── 4. Learn from solved submissions (the "ground truth" corpus) ── */
  const solvedStats = {
    count: solved.length,
    // Average structural metrics of human-passed code per challenge type.
    // These become the reviewer's "what does a pass normally look like" prior.
    byType: {},
  };
  const typeAgg = {};
  for (const s of solved) {
    const ch = challenges.find(c => c.id === s.challenge_id);
    if (!ch || !s.code) continue;
    try {
      const f = extractFeatures(s.code, ch.challenge_type);
      const agg = typeAgg[ch.challenge_type] || { n: 0, tokens: 0, defines: 0, calls: 0, loops: 0, conds: 0 };
      agg.n++;
      agg.tokens += f.tokenCount;
      agg.defines += f.defines.functions.length + f.defines.variables.length;
      agg.calls += f.calls.length + f.methodCalls.length;
      agg.loops += f.hasLoop ? 1 : 0;
      agg.conds += f.hasConditional ? 1 : 0;
      typeAgg[ch.challenge_type] = agg;
    } catch { /* ignore */ }
  }
  for (const [type, a] of Object.entries(typeAgg)) {
    if (a.n > 0) {
      solvedStats.byType[type] = {
        samples: a.n,
        avgTokens: Math.round(a.tokens / a.n),
        avgDefines: Math.round((a.defines / a.n) * 10) / 10,
        avgCalls: Math.round((a.calls / a.n) * 10) / 10,
        loopRate: Math.round((a.loops / a.n) * 100) / 100,
        condRate: Math.round((a.conds / a.n) * 100) / 100,
      };
    }
  }

  /* ── 5. Compile the model ── */
  const model = {
    version: 3,
    trainedAt: new Date().toISOString(),
    trainer: '1percent-local-engine (no LLM · statistical · offline)',
    stats: {
      courses: courses.length,
      lessons: courses.reduce((n, c) => n + (c.lessons?.length || 0), 0),
      challenges: challenges.length,
      solvedSubmissions: solved.length,
      vocabulary: docFreq.size,
      concepts: Object.keys(CONCEPT_SEEDS).length,
      trainMs: Date.now() - t0,
    },
    /* Global IDF table: word → idf weight. Lets the reviewer judge
       how distinctive a word is even for unseen courses. */
    idf: Object.fromEntries([...docFreq.entries()]
      .filter(([w]) => w.length > 2)
      .map(([w, df]) => [w, Math.round(Math.log(1 + totalDocs / (1 + df)) * 1000) / 1000])),
    /* Concept seeds are shipped with the model so the reviewer can
       detect concepts in ANY submission, not just trained courses. */
    concepts: CONCEPT_SEEDS,
    courseProfiles,
    challengeProfiles,
    solvedStats,
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(model));
  if (verbose) {
    console.log(`[AI TRAIN] Done in ${model.stats.trainMs}ms`);
    console.log(`  courses=${model.stats.courses} lessons=${model.stats.lessons} challenges=${model.stats.challenges}`);
    console.log(`  solved submissions used=${solved.length} vocabulary=${model.stats.vocabulary}`);
    console.log(`  model size=${(fs.statSync(MODEL_PATH).size / 1024).toFixed(1)}KB → ${MODEL_PATH}`);
  }
  return model;
}

/* ── CLI entry: node backend/ai/train.js ── */
if (require.main === module) {
  require('dotenv').config();
  trainModel()
    .then(() => process.exit(0))
    .catch(err => { console.error('[AI TRAIN] FAILED:', err.message); process.exit(1); });
}

module.exports = { trainModel, MODEL_PATH, CONCEPT_SEEDS, proseWords, STOPWORDS, CODE_HINTS };
