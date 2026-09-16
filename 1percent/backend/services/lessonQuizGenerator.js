/* ============================================================
   Lesson Quiz Generator — per-lesson fast-track questions
   ============================================================
   Generates 3 multiple-choice questions from a lesson's own
   content (title + markdown body) so EVERY lesson can offer a
   ⚡ Quick Quiz (fast-track completion) without hand-authoring.

   Design goals:
   - Pure and deterministic: same lesson → same questions, so the
     emitted SQL is stable and re-runnable.
   - Content-grounded: questions reference concepts actually
     present in the lesson text, never generic filler.
   - Fallback: content-light lessons still get title/concept
     identification questions, so no lesson is left out.

   Used by:
   - generate_lesson_quizzes.js  → emits migrations/*.sql
   - test_lesson_quiz_generator.js → unit tests
   ============================================================ */

/* Stopwords that never make good quiz "concepts" */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those', 'it',
  'its', 'you', 'your', 'we', 'our', 'they', 'their', 'he', 'she', 'his', 'her',
  'not', 'no', 'yes', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
  'will', 'shall', 'may', 'might', 'must', 'have', 'has', 'had', 'i', 'me', 'my',
  'use', 'used', 'using', 'uses', 'one', 'two', 'three', 'new', 'like', 'get',
  'into', 'about', 'than', 'more', 'most', 'some', 'all', 'any', 'each', 'very',
  'make', 'made', 'also', 'so', 'such', 'how', 'what', 'why', 'which', 'there',
  'here', 'out', 'up', 'down', 'over', 'under', 'between', 'after', 'before',
  'lesson', 'module', 'course', 'chapter', 'example', 'examples', 'note', 'tip',
  'step', 'steps', 'section', 'part', 'learn', 'learning', 'will', 'well'
]);

/* Concept extraction cap: enough signal, bounded work */
const MAX_CONTENT_WORDS = 4000;

function shaLikeHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic pick from a list using a numeric seed. */
function pickBySeed(list, seed) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[seed % list.length];
}

/** Split a string into lowercase word tokens (letters/digits/hyphen only). */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')   // code fences — too noisy for word frequency
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Extract candidate "concepts" from a lesson: capitalized technical
 * phrases, words that repeat with unusual frequency, and title words.
 * Returns a deterministic, de-duplicated, ordered list.
 */
function extractConcepts(lesson) {
  const title = String(lesson.title || '');
  const body = String(lesson.content_md || '').slice(0, MAX_CONTENT_WORDS);
  const tokens = tokenize(title + ' ' + body);

  // Frequency count (skip stopwords + very short words)
  const freq = new Map();
  for (const t of tokens) {
    if (t.length < 4 || STOPWORDS.has(t)) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  // Candidate ranking: frequency, then position (earlier = more important)
  const ranked = [...freq.entries()]
    .filter(([w, n]) => n >= 2 || title.toLowerCase().includes(w))
    .sort((a, b) => (b[1] - a[1]) || (tokens.indexOf(a[0]) - tokens.indexOf(b[0])))
    .map(([w]) => w);

  // Proper-noun-ish phrases (e.g. "Docker", "Supabase", "JWT") get priority
  const properNouns = [...new Set(
    (title + ' ' + body)
      .slice(0, MAX_CONTENT_WORDS)
      .match(/\b[A-Z][a-zA-Z0-9.+#-]{2,}\b/g) || []
  )]
    .filter(w => !STOPWORDS.has(w.toLowerCase()) && w.length >= 3)
    .map(w => w.trim());

  const seen = new Set();
  const concepts = [];
  for (const c of [...properNouns.slice(0, 6), ...ranked.slice(0, 10)]) {
    const key = c.toLowerCase();
    if (!seen.has(key) && key.length >= 3) { seen.add(key); concepts.push(c); }
  }
  return concepts;
}

/** Question 1 — concept identification (always available). */
function qIdentify(concepts, lesson) {
  const c = concepts[0] || lesson.title.split(/\s+/)[0];
  return {
    question: `Which concept is central to this lesson ("${lesson.title}")?`,
    options: [
      { id: 'a', text: c },
      { id: 'b', text: concepts[1] || 'Advanced cryptographic hashing' },
      { id: 'c', text: concepts[2] || 'Distributed consensus protocols' },
      { id: 'd', text: concepts[3] || 'Legacy COBOL integration' }
    ],
    correct_answer: 'a'
  };
}

/** Question 2 — topic association, seeded so it varies by lesson. */
function qAssociate(concepts, lesson, seed) {
  const c = pickBySeed(concepts.slice(1), seed) || concepts[0] || lesson.title;
  const distractors = [
    'Unrelated to this lesson’s topic',
    'A deprecated practice not covered here',
    'An unrelated operating-system detail'
  ];
  const pick = pickBySeed(distractors, seed + 1);
  const options = [
    { id: 'a', text: pick },
    { id: 'b', text: c },
    { id: 'c', text: pickBySeed(distractors, seed + 2) },
    { id: 'd', text: 'None of the above' }
  ];
  // Deterministic shuffle of option order via seed
  const rotated = seed % 2 === 0 ? options : [options[1], options[2], options[3], options[0]];
  const ci = rotated.findIndex(o => o.text === c);
  const idMap = ['a', 'b', 'c', 'd'];
  return {
    question: `In this lesson, "${lesson.title}", which item belongs to its core subject matter?`,
    options: rotated,
    correct_answer: idMap[ci]
  };
}

/** Question 3 — definition/completion, phrased around a key term. */
function qComplete(concepts, lesson, seed) {
  const c = pickBySeed(concepts, seed + 3) || lesson.title;
  return {
    question: `The lesson on "${lesson.title}" teaches that "${c}" is best understood as what?`,
    options: [
      { id: 'a', text: `A key topic of this lesson, central to understanding "${lesson.title}"` },
      { id: 'b', text: 'A decorative term with no technical meaning' },
      { id: 'c', text: 'A hardware specification' },
      { id: 'd', text: 'A deprecated API removed years ago' }
    ],
    correct_answer: 'a'
  };
}

/**
 * Generate 3 questions for one lesson. Deterministic.
 * Returns an array of { question, options, correct_answer, sort_order }.
 */
function generateLessonQuiz(lesson) {
  const title = String(lesson.title || 'Lesson');
  const seed = shaLikeHash(String(lesson.id || title));
  const concepts = extractConcepts(lesson);

  const base = [
    qIdentify(concepts, { title }),
    qAssociate(concepts, { title }, seed),
    qComplete(concepts, { title }, seed)
  ];
  return base.map((q, i) => ({
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    sort_order: i + 1
  }));
}

/* ── SQL emission helpers (deterministic escaping) ─────────── */

/** Escape a string for a SQL dollar-quoted literal with a unique tag. */
function dollarQuote(s, tag) {
  if (String(s).includes(`$${tag}$`)) throw new Error('dollar-tag collision');
  return `$${tag}$${s}$${tag}$`;
}

/** Serialize options to the compact JSONB shape used by quiz_questions. */
function optionsToJson(options) {
  return JSON.stringify(options.map(o => ({ id: o.id, text: o.text })));
}

module.exports = {
  generateLessonQuiz,
  extractConcepts,
  tokenize,
  pickBySeed,
  shaLikeHash,
  dollarQuote,
  optionsToJson,
  STOPWORDS
};
exports.generateLessonQuiz = generateLessonQuiz;
exports.extractConcepts = extractConcepts;
exports.tokenize = tokenize;
exports.pickBySeed = pickBySeed;
exports.shaLikeHash = shaLikeHash;
exports.dollarQuote = dollarQuote;
exports.optionsToJson = optionsToJson;
