/**
 * services/lessonQuizGenerator.js
 *
 * PURPOSE:
 *   Builds per-lesson quick quizzes from lesson content so fast learners can prove mastery and skip
 *   the study-time gate.
 *
 * EXPORTS: generateLessonQuiz, extractFacts, buildCoursePool, isEligibleLesson, MIN_QUESTIONS, extractConcepts, tokenize, pickBySeed, shaLikeHash, dollarQuote, optionsToJson, STOPWORDS
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

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

/* ── Fact-based quick-quiz generation ─────────────────────────
 * Questions come from real sentences and definitions in the lesson:
 *   • definition  — "**Term** is …" / "**Term** — …" / "`cmd` — …"
 *   • cloze       — a sentence with one bold or `code` term blanked out
 * Wrong options are real terms from the same lesson / course, so a
 * student who has not read the lesson cannot pass by elimination.
 * Lessons with too little material return [] (no quiz is better than
 * a free skip). Deterministic: same lesson + pool → same questions.
 * ─────────────────────────────────────────────────────────── */

const MIN_QUESTIONS = 5;   // 5 per lesson: the quick quiz needs 80%, so 4/5 passes — one weak question cannot block a student
const INELIGIBLE_TYPES = new Set(['project', 'lab', 'quiz']);

/* Bold/code terms that are labels, not concepts */
const TERM_STOPLIST = new Set([
  'status', 'duration', 'lessons', 'type', 'example', 'examples', 'tip', 'pro tip', 'note', 'warning',
  'bad', 'good', 'why', 'what', 'how', 'goal', 'output', 'input', 'result', 'answer', 'step', 'steps',
  'important', 'remember', 'free', 'reading', 'project', 'lab', 'quiz', 'try it yourself', 'common mistake',
  'before', 'after', 'wrong', 'right', 'rule', 'rules', 'key idea', 'summary', 'the 1% difference',
  'title', 'body', 'data', 'pros', 'cons', 'visit', 'assess', 'about', 'subject', 'opening', 'closing', 'format', 'template',
  'option', 'options', 'level', 'levels', 'topic', 'topics', 'part', 'parts', 'level 1', 'level 2', 'level 3'
]);

function isEligibleLesson(lesson) {
  return !INELIGIBLE_TYPES.has(String(lesson && lesson.lesson_type || '').toLowerCase());
}

/** Seeded PRNG (mulberry32) — deterministic shuffles. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(list, seed) {
  const r = rng(seed);
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Remove boilerplate that would pollute questions. */
function stripNoise(md) {
  let s = String(md || '').replace(/\r/g, '');
  s = s.replace(/\n#{1,4}[^\n]*Expert Layer[\s\S]*$/i, '\n');                    // repeated "Expert Layer" block
  s = s.replace(/\n#{1,4}\s*Try It Yourself[\s\S]*?(?=\n#{1,4}\s|$)/gi, '\n');   // instructions, not facts
  s = s.replace(/```[\s\S]*?```/g, '\n');                                        // code fences
  s = s.replace(/^\s*\|.*\|\s*$/gm, '');                                         // tables
  s = s.replace(/^\s*>\s?/gm, '');                                               // blockquote markers
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');                                 // links → text
  return s;
}

function plain(s) {
  return String(s || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

const LABEL_START = /^(what|why|how|when|where|who|step|action|day|week|lesson|module|goal|time|cost|tip|rule|the problem|the solution|your|this|these|that|you|we|do not|don't|never|always)\b/i;
const TRAILING_FUNCTION_WORD = /\b(with|of|to|for|and|or|in|on|at|by|the|a|an|from|as|is|are)$/i;
const IMPERATIVE_START = /^(create|upload|write|open|go|add|use|do|check|make|take|set|run|try|click|copy|download|install|send|ask|pick|choose|buy|call|put|get|list|name|build|test|find|read|fill|save|print|type|enter|press|select|keep|turn|connect|plug|wire|note|remember|imagine|look|see|visit|follow|start|stop|avoid|never|always)\b/i;

function cleanTerm(raw, kind) {
  const t = plain(raw).replace(/[:.]+$/, '').trim();
  if (t.length < 2 || t.length > 40) return null;
  if (t.split(/\s+/).length > 5) return null;
  if (/^[\d\s.,%=+\-*/×÷]+$/.test(t)) return null;      // pure numbers / maths
  if (/[=<>{}]/.test(t)) return null;
  if (TERM_STOPLIST.has(t.toLowerCase())) return null;
  if (LABEL_START.test(t) || TRAILING_FUNCTION_WORD.test(t)) return null;
  if (/[A-Z]{6,}/.test(t)) return null;                  // SHOUTING headings (short acronyms like DC/HTTP are fine)
  if (kind !== 'code' && /[\d()]/.test(t)) return null;  // "S3 (right)", "120 packets…" are labels, not concepts
  return t;
}

/** A description is usable if it reads like a definition, not an instruction. */
const COMPARATIVE_START = /^(simpler|more|less|faster|slower|better|worse|cheaper|cheap|easier|harder|free|easy|hard|similar|same|different|also|but|and|or|so)\b/i;
function goodDesc(desc) {
  if (desc.length < 14 || desc.length > 130) return false;
  if (desc.split(/\s+/).length < 3) return false;
  if (IMPERATIVE_START.test(desc) || COMPARATIVE_START.test(desc) || /^\d/.test(desc)) return false;
  if (/["“”\[\]→—:?!]/.test(desc)) return false;      // quoted examples, UI arrows, templates
  return true;
}

function mentionsStem(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^\\p{L}\\p{N}])' + esc, 'iu').test(text);
}

function mentions(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '($|[^\\p{L}\\p{N}])', 'iu').test(text);
}

/**
 * Extract quizzable facts from lesson markdown.
 * Returns [{ type: 'def'|'cloze', term, kind: 'bold'|'code', text }]
 */
function extractFacts(contentMd) {
  const facts = [];
  const seen = new Set();
  const add = f => {
    const key = f.term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(f);
  };

  const lines = stripNoise(contentMd).split('\n');
  for (let raw of lines) {
    let line = raw.trim();
    if (!line || /^#{1,6}\s/.test(line) || /^---+$/.test(line)) continue;
    line = line.replace(/^(?:[-*+]|\d+[.)])\s+/, '');

    /* definition: "**Term** — desc" / "**Term:** desc" / "`cmd` — desc" */
    let m = line.match(/^\*\*([^*\n]{2,40}?)(:?)\*\*(:?)\s*([—–-]+\s*)?(.+)$/);
    if (m && (m[2] || m[3] || m[4])) {
      const term = cleanTerm(m[1], 'bold');
      const desc = plain(m[5]).replace(/[.!?]+$/, '');
      if (term && goodDesc(desc) && !mentions(desc, term)) {
        add({ type: 'def', term, kind: 'bold', text: desc });
        continue;
      }
    }
    m = line.match(/^`([^`\n]{2,40})`\s*[—–:-]+\s*(.+)$/);
    if (m) {
      const term = cleanTerm(m[1], 'code');
      const desc = plain(m[2]).replace(/[.!?]+$/, '');
      if (term && goodDesc(desc) && !mentions(desc, term)) {
        add({ type: 'def', term, kind: 'code', text: desc });
        continue;
      }
    }

    for (const sentence of line.split(/(?<=[.!?])\s+(?=[A-Z0-9*`])/)) {
      /* definition: "**Term** is/are/means …" */
      const d = sentence.match(/^\*\*([^*\n]{2,40}?)\*\*\s+(?:is|are|means|refers to)\s+(.{12,200}?)[.!?]?$/i);
      if (d) {
        const term = cleanTerm(d[1], 'bold');
        const desc = plain(d[2]);
        if (term && goodDesc(desc) && !mentions(desc, term)) {
          add({ type: 'def', term, kind: 'bold', text: desc });
          continue;
        }
      }

      /* cloze: blank one bold / code term inside a full sentence */
      const flat = plain(sentence);
      if (flat.length < 35 || flat.length > 200 || flat.split(' ').length < 6) continue;
      if (/[→—:?!"“”\[]/.test(flat)) continue;   // UI paths, quotes, templates
      const cands = [];
      for (const c of sentence.matchAll(/`([^`\n]{2,30})`/g)) cands.push({ term: cleanTerm(c[1], 'code'), kind: 'code', idx: c.index });
      for (const b of sentence.matchAll(/\*\*([^*\n]{2,30})\*\*/g)) cands.push({ term: cleanTerm(b[1], 'bold'), kind: 'bold', idx: b.index });
      const pick = cands.filter(c => c.term && c.idx > 0 && !seen.has(c.term.toLowerCase()))[0];
      if (!pick) continue;
      if (pick.kind === 'bold' && IMPERATIVE_START.test(flat)) continue;   // "Go to **Tools** …" is an instruction; "Run `git add` to …" is a fact
      const esc = pick.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blanked = flat.replace(new RegExp(esc, 'gi'), '_____');
      if (!blanked.includes('_____')) continue;
      add({ type: 'cloze', term: pick.term, kind: pick.kind, text: blanked });
    }
  }
  /* Heading-pair facts: a "## while Loop" heading whose next paragraph is a
     one-line explanation ("Use when the number of iterations is unknown").
     The heading IS the term, the paragraph IS the definition — common shape
     in the reference-style lessons. The imperative wording is allowed here
     because a heading-scoped usage note is the definition, not an instruction
     to the reader. */
  let headingTerm = null;
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (/^#{1,6}\s/.test(line)) {
      headingTerm = cleanTerm(line.replace(/^#{1,6}\s+/, ''), 'bold');
      continue;
    }
    if (!line || /^---+$/.test(line) || /^```/.test(line)) continue;
    if (headingTerm) {
      const desc = plain(line).replace(/[.!?]+$/, '');
      const okLen = desc.length >= 14 && desc.length <= 130 && desc.split(/\s+/).length >= 3;
      if (headingTerm && okLen && goodDescPair(desc) && !mentions(desc, headingTerm)) {
        add({ type: 'def', term: headingTerm, kind: 'bold', text: desc });
      }
      headingTerm = null;    // only the text right under the heading counts
    }
  }

  return facts;
}

/** Like goodDesc, but heading-scoped definitions may read "Use when …". */
function goodDescPair(desc) {
  if (COMPARATIVE_START.test(desc) || /^\d/.test(desc)) return false;
  if (/["“”\[\]→—:?!]/.test(desc)) return false;
  return true;
}

/** Course-wide pool of real terms, used for plausible wrong options. */
function buildCoursePool(lessons) {
  const pool = { bold: new Set(), code: new Set() };
  for (const l of lessons || []) {
    if (!isEligibleLesson(l)) continue;
    for (const f of extractFacts(l.content_md)) pool[f.kind].add(f.term);
    for (const f of understandFacts(l.content_md, l.title)) pool[f.kind].add(f.term);
  }
  return { bold: [...pool.bold], code: [...pool.code] };
}

/** Lower = closer in look (same first-letter case, similar length, similar word count). */
function styleGap(a, b) {
  const caseMiss = (/^[A-Z]/.test(a) === /^[A-Z]/.test(b)) ? 0 : 20;
  const words = Math.abs(a.split(/\s+/).length - b.split(/\s+/).length) * 6;
  return caseMiss + words + Math.abs(a.length - b.length);
}

function pickDistractors(fact, questionText, localTerms, pool, seed) {
  const correct = fact.term.toLowerCase();
  const seen = new Set([correct]);
  const ok = t => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    if (mentionsStem(questionText, t)) return false;                   // never reveal via the stem (incl. plurals)
    if (k.includes(correct) || correct.includes(k)) return false;     // "merge" vs "merge commit"
    seen.add(k);
    return true;
  };
  const same = [...(localTerms[fact.kind] || []), ...((pool && pool[fact.kind]) || [])];
  const ordered = seededShuffle(same, seed)
    .sort((a, b) => styleGap(a, fact.term) - styleGap(b, fact.term));
  const out = [];
  for (const t of ordered) { if (ok(t)) out.push(t); if (out.length === 3) break; }
  return out;
}

/**
 * Generate quick-quiz questions for one lesson. Deterministic.
 * Returns [{ question, options:[{id,text}], correct_answer, sort_order }]
 * or [] when the lesson lacks enough material (or is a project/lab).
 * `pool` = buildCoursePool(lessons of the same course) — optional but recommended.
 */
function generateLessonQuiz(lesson, pool) {
  if (!isEligibleLesson(lesson)) return [];
  let facts = extractFacts(lesson.content_md);
  let terms = facts;
  if (facts.length < MIN_QUESTIONS) {
    // Understanding pass: the lesson has fewer marked-up facts than a quiz
    // needs, so rank the concepts the lesson actually TEACHES (frequency +
    // title emphasis) and cloze the sentences that explain them. Terms must
    // re-appear in the body (the "read it, understand it" signal).
    const extra = understandFacts(lesson.content_md, lesson.title)
      .filter(f => !facts.some(x => x.term.toLowerCase() === f.term.toLowerCase()));
    terms = facts.concat(extra);
  }
  if (terms.length < MIN_QUESTIONS) return [];

  const factList = terms;
  const seed = shaLikeHash(String(lesson.id || lesson.title || 'lesson'));
  const local = { bold: [], code: [] };
  for (const f of factList) local[f.kind].push(f.term);

  const questions = [];
  const shuffled = seededShuffle(factList, seed);
  for (const fact of shuffled) {
    if (questions.length === MIN_QUESTIONS) break;
    const stem = fact.type === 'def'
      ? `Which term is described this way: "${fact.text}"?`
      : `Fill in the blank: "${fact.text}"`;
    const wrong = pickDistractors(fact, stem, local, pool, seed + questions.length);
    if (wrong.length < 3) continue;
    const order = seededShuffle([fact.term, ...wrong], seed * 31 + questions.length);
    const ids = ['a', 'b', 'c', 'd'];
    const options = order.map((text, i) => ({ id: ids[i], text }));
    questions.push({
      question: stem,
      options,
      correct_answer: ids[order.indexOf(fact.term)],
      sort_order: questions.length + 1
    });
  }
  return questions.length === MIN_QUESTIONS ? questions : [];
}

/**
 * Understanding-based fact pass (best-effort completion of the strict facts).
 *
 * For each concept the lesson emphasizes (existing extractConcepts ranking:
 * proper nouns, repeated / title words), find the sentence that explains it
 * and blank the term — a cloze that tests comprehension of what the lesson
 * actually spends its words on. A term only qualifies when it genuinely
 * recurs in the lesson body, so questions stay grounded in the content.
 * Deterministic: same lesson → same facts in the same order.
 */
function understandFacts(contentMd, lessonTitle) {
  const concepts = extractConcepts({ title: lessonTitle || '', content_md: contentMd })
    .map(c => cleanTerm(c, 'bold'))
    .filter(Boolean);
  if (!concepts.length) return [];

  const text = stripNoise(contentMd);

  /* Sentences that could carry a blank. */
  const sentences = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || /^#{1,6}\s/.test(line) || /^---+$/.test(line)) continue;
    line = line.replace(/^(?:[-*+]|\d+[.)])\s+/, '');
    for (const sentence of line.split(/(?<=[.!?])\s+(?=[A-Z0-9*`])/)) {
      const flat = plain(sentence);
      if (flat.length < 35 || flat.length > 210 || flat.split(' ').length < 6) continue;
      if (/[→—?!"“”\[]/.test(flat)) continue;      // quotes/UI shapes/templates
      sentences.push(flat);
    }
  }
  if (!sentences.length) return [];

  const out = [];
  const seen = new Set();
  for (const term of concepts) {
    if (out.length >= MIN_QUESTIONS * 2) break;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;

    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const whole = new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '($|[^\\p{L}\\p{N}])', 'giu');
    if ((text.match(whole) || []).length < 2) continue;   // must recur: understanding signal

    for (const sentence of sentences) {
      if (IMPERATIVE_START.test(sentence)) continue;      // instructions are not definitions
      const first = new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '($|[^\\p{L}\\p{N}])', 'iu');
      const occur = sentence.match(new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '($|[^\\p{L}\\p{N}])', 'giu')) || [];
      if (occur.length !== 1) continue;                  // exactly once: the blank stays unguessable
      const m = sentence.match(first);
      if (!m || m.index === undefined) continue;
      const blanked =
        sentence.slice(0, m.index) + m[1] + '_____' +
        sentence.slice(m.index + m[0].length - m[2].length);
      if (!blanked.includes('_____')) continue;
      seen.add(key);
      out.push({ type: 'cloze', term, kind: 'bold', text: blanked });
      break;
    }
  }
  return out;
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
  extractFacts,
  understandFacts,
  buildCoursePool,
  isEligibleLesson,
  MIN_QUESTIONS,
  extractConcepts,
  tokenize,
  pickBySeed,
  shaLikeHash,
  dollarQuote,
  optionsToJson,
  STOPWORDS
};
exports.generateLessonQuiz = generateLessonQuiz;
exports.extractFacts = extractFacts;
exports.understandFacts = understandFacts;
exports.buildCoursePool = buildCoursePool;
exports.isEligibleLesson = isEligibleLesson;
exports.MIN_QUESTIONS = MIN_QUESTIONS;
exports.extractConcepts = extractConcepts;
exports.tokenize = tokenize;
exports.pickBySeed = pickBySeed;
exports.shaLikeHash = shaLikeHash;
exports.dollarQuote = dollarQuote;
exports.optionsToJson = optionsToJson;
