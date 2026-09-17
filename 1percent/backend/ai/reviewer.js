/**
 * ai/reviewer.js
 *
 * PURPOSE:
 *   Model inference: loads ai/model.json, scores a submission's features, returns verdict
 *   (pass/fail/needs_review), score, and quality band. Deterministic and offline — no external AI
 *   calls.
 *
 * EXPORTS: reviewSubmission, loadModel, isModelReady, detectConcepts, shapeSignature, MODEL_PATH
 * DEPENDENCIES: fs, path
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const fs = require('fs');
const path = require('path');
const { tokenize, meaningfulTokens, wordSequence } = require('./tokenizer');
const { extractFeatures, shapeSignature } = require('./features');
const { proseWords } = require('./train');

const MODEL_PATH = path.join(__dirname, 'model.json');

/* ── Model loading with hot-reload ──────────────────────────
   The reviewer keeps the compiled model in memory. When an
   admin retrains, the file changes and the next review picks
   it up automatically (checked at most once per 30s). */
let cachedModel = null;
let cachedAt = 0;
let lastStatCheck = 0;
let lastMtime = 0;

function loadModel(force = false) {
  const now = Date.now();
  if (!force && cachedModel && now - lastStatCheck < 30000) return cachedModel;
  try {
    const stat = fs.statSync(MODEL_PATH);
    if (force || !cachedModel || stat.mtimeMs !== lastMtime) {
      cachedModel = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
      lastMtime = stat.mtimeMs;
      cachedAt = now;
    }
    lastStatCheck = now;
    return cachedModel;
  } catch {
    return cachedModel; // no model file yet → reviewer degrades gracefully
  }
}

function isModelReady() {
  try { return !!loadModel(true); } catch { return false; }
}

/* ────────────────────────────────────────────────────────────
   Concept detection: which trained concepts does this code use?
   ──────────────────────────────────────────────────────────── */

/**
 * @param {object} profile - feature profile of the submission
 * @param {string} prose   - challenge title+description (intent)
 * @param {object} model   - trained model
 * @returns {Array<{concept:string, evidence:string[], strength:number}>}
 */
function detectConcepts(profile, prose, model) {
  const concepts = model.concepts || {};
  const idf = model.idf || {};
  const results = [];

  // Build the "text view" of the code: identifiers + method names +
  // keywords (lowercased) — this is what a concept word can match.
  const codeWords = new Set();
  for (const w of profile.vocab) codeWords.add(w);
  for (const c of profile.calls) { codeWords.add(c.toLowerCase()); }
  for (const mc of profile.methodCalls) {
    codeWords.add(mc.toLowerCase());
    const parts = mc.split('.');
    for (const p of parts) codeWords.add(p.toLowerCase());
  }

  // Challenge intent words (what the task is ASKING for)
  const intentWords = new Set(proseWords(prose));

  for (const [concept, seeds] of Object.entries(concepts)) {
    const evidence = [];
    let score = 0;

    for (const seed of seeds) {
      const s = seed.toLowerCase();

      // Strongest signal: the exact API/keyword appears in the code
      if (codeWords.has(s)) {
        // IDF-weight: distinctive words (e.g. 'queryselector') prove
        // more than generic ones (e.g. 'for'), so weight evidence.
        const w = 1 + (idf[s] || 0.5);
        score += w;
        evidence.push(s);
        continue;
      }

      // Secondary signal: the concept word appears in the task prose
      // AND something code-ish from that concept family appears too.
      if (intentWords.has(s) && (profile.calls.length || profile.keywordCounts['if'] || profile.keywordCounts['for'])) {
        score += 0.4;
      }
    }

    if (score > 0) {
      results.push({
        concept,
        evidence: evidence.slice(0, 6),
        strength: Math.round(Math.min(1, score / 5) * 100) / 100, // saturate at 5 hits
      });
    }
  }

  return results.sort((a, b) => b.strength - a.strength);
}

/* ────────────────────────────────────────────────────────────
   Structural scoring — rubric-based, explainable
   ──────────────────────────────────────────────────────────── */

/**
 * @returns {{score:number, max:number, notes:string[]}}
 */
function scoreStructure(profile, challengeType) {
  const notes = [];
  let score = 0;
  const max = 40;

  if (profile.tokenCount < 5) {
    return { score: 0, max, notes: ['Submission is nearly empty.'] };
  }

  // Definitions present (functions/variables/classes)
  const defCount = profile.defines.functions.length + profile.defines.variables.length + profile.defines.classes.length;
  if (defCount > 0) { score += 10; notes.push(`Defines ${defCount} named thing${defCount > 1 ? 's' : ''} (functions/variables).`); }

  // Real calls (the code actually does something)
  const callCount = profile.calls.length + profile.methodCalls.length;
  if (callCount > 0) { score += 8; notes.push(`Makes ${callCount} call${callCount > 1 ? 's' : ''} — the code executes real operations.`); }

  // Control flow
  if (profile.hasLoop) { score += 6; notes.push('Uses a loop.'); }
  if (profile.hasConditional) { score += 5; notes.push('Uses conditional logic.'); }
  if (profile.hasErrorHandling) { score += 3; notes.push('Handles errors (try/catch).'); }
  if (profile.hasReturn) { score += 3; notes.push('Returns a value.'); }

  // Reasonable complexity (not trivial, not spaghetti)
  if (profile.maxNesting >= 2 && profile.maxNesting <= 5) { score += 5; notes.push('Healthy nesting depth.'); }
  else if (profile.maxNesting > 5) { notes.push(`Deep nesting (${profile.maxNesting} levels) — consider extracting functions.`); }

  return { score: Math.min(max, score), max, notes };
}

/* Concept coverage score: how much of the challenge's expected
   concept set the submission actually uses. */
function scoreConcepts(detected, challengeConcepts) {
  const max = 30;
  if (!detected.length) return { score: 0, max, notes: ['No course concepts detected in the code.'] };

  const detectedSet = new Set(detected.map(d => d.concept));
  const overlap = challengeConcepts.filter(c => detectedSet.has(c));
  const notes = [];
  let score = 0;

  if (overlap.length) {
    score += Math.min(20, overlap.length * 7);
    notes.push(`Applies course concepts: ${overlap.join(', ')}.`);
  }
  // Any detected concept at all shows the code is on-topic
  score += Math.min(10, detected.length * 2.5);

  return { score: Math.round(Math.min(max, score)), max, notes };
}

/* Effort/quality score: length, comments, naming style. */
function scoreEffort(profile, source) {
  const max = 30;
  let score = 0;
  const notes = [];

  // Meaningful length
  if (profile.tokenCount >= 15) score += 10;
  else if (profile.tokenCount >= 8) score += 5;
  else notes.push('Very short submission — little code to evaluate.');

  // Comments that explain (not required, but rewarded)
  if (profile.commentLines >= 1 && profile.commentLines <= profile.lineCount) score += 5;

  // Descriptive naming: identifiers longer than 2 chars and not single letters
  const meaningfulNames = profile.identifiers.filter(n => n.length > 2 && !/^[a-z]$/i.test(n)).length;
  if (meaningfulNames >= 2) { score += 8; notes.push('Uses descriptive names.'); }
  else if (meaningfulNames === 1) score += 4;

  // No monster lines (readability)
  const longest = Math.max(0, ...String(source || '').split('\n').map(l => l.length));
  if (longest <= 120) score += 4;
  else notes.push('Some lines are very long — consider wrapping for readability.');

  // String/number usage shows the code manipulates real data
  if (profile.stringLiterals > 0 || profile.numbersUsed.length > 0) score += 3;

  return { score: Math.round(Math.min(max, score)), max, notes };
}

/* ────────────────────────────────────────────────────────────
   Cheat/duplicate detection via trained shape signatures
   ──────────────────────────────────────────────────────────── */

/**
 * Compare a submission's shape signature against the stored
 * per-challenge shapes of previously approved submissions.
 * @returns {{suspicious:boolean, matches:number, detail:string}}
 */
function checkDuplication(shapeSig, challengeId, model) {
  const shapes = (model.challengeShapes && model.challengeShapes[challengeId]) || [];
  if (!shapes.length || !shapeSig) return { suspicious: false, matches: 0, detail: '' };

  // Exact duplicate shape with different identifiers = likely copied
  const exact = shapes.filter(s => s === shapeSig).length;
  if (exact > 0) {
    return {
      suspicious: true,
      matches: exact,
      detail: `Submission is structurally identical to ${exact} previously approved submission${exact > 1 ? 's' : ''} for this challenge (only names differ).`,
    };
  }

  // Near-duplicate: >92% of shape tokens shared
  let near = 0;
  for (const s of shapes) {
    const dist = levenshtein(shapeSig, s);
    const maxLen = Math.max(shapeSig.length, s.length);
    if (maxLen > 0 && 1 - dist / maxLen > 0.92) near++;
  }
  if (near > 0) {
    return { suspicious: true, matches: near, detail: `Submission is near-identical (${near} similar) to existing approved submissions.` };
  }

  return { suspicious: false, matches: 0, detail: '' };
}

/* Classic DP edit distance — small inputs, fine to compute. */
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/* ────────────────────────────────────────────────────────────
   THE MAIN ENTRY: review(challenge, code)
   ──────────────────────────────────────────────────────────── */

/**
 * Review a submission against the trained model.
 *
 * @param {object} challenge - { id, title, description, challenge_type, expected_output, starter_code, test_cases }
 * @param {string} code      - the student's submission
 * @returns {object} review artifact (to be stored as pending)
 */
function reviewSubmission(challenge, code) {
  const model = loadModel();
  const type = challenge.challenge_type || 'generic';
  const source = String(code || '');

  /* ── 1. Read the code ── */
  const profile = extractFeatures(source, type);
  const shapeSig = shapeSignature(source, type);

  /* ── 2. Detect concepts (code + task intent) ── */
  const detected = detectConcepts(profile, `${challenge.title || ''} ${challenge.description || ''}`, model || { concepts: {}, idf: {} });

  /* ── 3. Rubric scores ── */
  const structure = scoreStructure(profile, type);
  const conceptMatch = scoreConcepts(detected, challengeConcepts(challenge, model));
  const effort = scoreEffort(profile, source);

  const total = structure.score + conceptMatch.score + effort.score;
  const totalMax = structure.max + conceptMatch.max + effort.max;
  const percent = totalMax ? Math.round((total / totalMax) * 100) : 0;

  /* ── 4. Cheat detection ── */
  const dup = model ? checkDuplication(shapeSig, challenge.id, model) : { suspicious: false, matches: 0, detail: '' };

  /* ── 5. Verdict ──
     The deterministic test-cases/execution result (computed by
     coinsService BEFORE calling this) is authoritative for pass/
     fail. The review interprets and grades QUALITY:
       percent >= 55            → 'proficient'
       30 <= percent < 55       → 'developing'
       percent < 30             → 'beginner'
     Cheat suspicion always escalates to needs_review. */
  let quality = 'beginner';
  if (percent >= 55) quality = 'proficient';
  else if (percent >= 30) quality = 'developing';

  let verdict = 'pass';
  let flags = [];
  if (dup.suspicious) { verdict = 'needs_review'; flags.push('possible_duplicate'); }
  if (profile.tokenCount < 5) { verdict = 'needs_review'; flags.push('too_short'); }

  /* ── 6. Human-readable review ── */
  const strengths = [
    ...structure.notes.filter(n => !/consider|Deep nesting|Very short/.test(n)),
    ...conceptMatch.notes.filter(n => /Applies course concepts/.test(n)),
    ...effort.notes.filter(n => /descriptive|Healthy/.test(n)),
  ];
  const improvements = [
    ...structure.notes.filter(n => /Deep nesting|consider/.test(n)),
    ...effort.notes.filter(n => /Very short|long lines/.test(n)),
  ];
  if (!profile.hasLoop && needsLoops(challenge)) improvements.push('The task looks like it needs iteration — consider a for/while loop.');
  if (detected.length && detected[0].strength < 0.4) improvements.push(`Only weak signals of "${detected[0].concept}" — use its APIs more directly.`);

  const conceptLine = detected.length
    ? detected.slice(0, 4).map(d => `${d.concept} (${Math.round(d.strength * 100)}%)`).join(', ')
    : 'none detected';

  const summary =
    `The reviewer read ${profile.tokenCount} tokens across ${profile.lineCount} lines. ` +
    `It detected ${detected.length} course concept${detected.length === 1 ? '' : 's'}: ${conceptLine}. ` +
    `Structure ${structure.score}/${structure.max}, concept use ${conceptMatch.score}/${conceptMatch.max}, effort ${effort.score}/${effort.max}.`;

  return {
    verdict,              // 'pass' | 'fail' | 'needs_review'
    quality,              // 'beginner' | 'developing' | 'proficient'
    score: percent,       // 0-100
    breakdown: {
      structure: { got: structure.score, max: structure.max, notes: structure.notes },
      concepts: { got: conceptMatch.score, max: conceptMatch.max, notes: conceptMatch.notes },
      effort: { got: effort.score, max: effort.max, notes: effort.notes },
    },
    detectedConcepts: detected.slice(0, 6),
    strengths,
    improvements,
    flags,
    duplication: dup,
    shapeSignature: shapeSig,
    engine: {
      name: '1percent-local-engine',
      llm: false,
      modelTrainedAt: model?.trainedAt || null,
      modelVersion: model?.version || null,
    },
    summary,
    reviewedAt: new Date().toISOString(),
  };
}

/* Which concepts SHOULD a challenge exercise? From the trained
   challenge profile + concept matching against its own text. */
function challengeConcepts(challenge, model) {
  if (!model) return [];
  const cp = (model.challengeProfiles || []).find(c => c.id === challenge.id);
  if (cp && cp.concepts && cp.concepts.length) {
    // Map challenge words to concept names via the seed lexicons
    const words = new Set(cp.concepts);
    const matches = [];
    for (const [concept, seeds] of Object.entries(model.concepts || {})) {
      if (seeds.some(s => words.has(s.toLowerCase()))) matches.push(concept);
    }
    return matches.slice(0, 5);
  }
  return [];
}

/* Heuristic: does this challenge look like it needs iteration? */
function needsLoops(challenge) {
  const text = `${challenge.title || ''} ${challenge.description || ''}`.toLowerCase();
  return /list|items|each|every|array|all|loop|repeat|sum|average|total|fizzbuzz/.test(text);
}

module.exports = { reviewSubmission, loadModel, isModelReady, detectConcepts, shapeSignature, MODEL_PATH };
