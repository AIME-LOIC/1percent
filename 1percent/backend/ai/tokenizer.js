/* ============================================================
   AI ENGINE · TOKENIZER
   ------------------------------------------------------------
   Part of the 1Percent local code-understanding engine.
   NO LLM, NO network calls, NO external APIs — this is a
   classical NLP-style tokenizer adapted to source code.

   It turns raw source text into a flat array of typed tokens:
     { type, value, line, col }
   where type ∈ keyword|identifier|string|number|comment|
                operator|punct|whitespace|unknown

   Every later stage (feature extraction, concept matching,
   plagiarism shape) consumes tokens, not raw text — so the
   engine "reads" code the way a human eye does: it sees the
   structure, ignores cosmetic noise, and never looks at the
   internet.
   ============================================================ */

/* Language profiles: keyword sets + comment/quote syntax. */
const LANGUAGES = {
  javascript: {
    keywords: new Set(['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','class','extends','super','this','typeof','instanceof','try','catch','finally','throw','async','await','yield','import','export','default','from','of','in','delete','void','null','undefined','true','false','static','get','set']),
    lineComment: '//',
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
  },
  python: {
    keywords: new Set(['def','class','return','if','elif','else','for','while','break','continue','import','from','as','pass','raise','try','except','finally','with','lambda','global','nonlocal','yield','del','assert','and','or','not','in','is','None','True','False','self','print','range','len','str','int','float','list','dict','set','tuple']),
    lineComment: '#',
    blockComment: null,
    strings: ['"', "'"],
  },
  sql: {
    keywords: new Set(['select','from','where','insert','into','values','update','set','delete','create','table','alter','drop','add','column','primary','key','foreign','references','join','inner','left','right','outer','on','group','by','order','having','limit','offset','as','and','or','not','null','is','in','like','between','distinct','count','sum','avg','min','max','case','when','then','else','end','union','all','index','unique','default','constraint']),
    lineComment: '--',
    blockComment: ['/*', '*/'],
    strings: ["'"],
  },
  css: {
    keywords: new Set(['important']),
    lineComment: null,
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
  },
  html: {
    keywords: new Set([]),
    lineComment: null,
    blockComment: ['<!--', '-->'],
    strings: ['"', "'"],
  },
  generic: {
    keywords: new Set([]),
    lineComment: '#',
    blockComment: null,
    strings: ['"', "'"],
  },
};

/* Map a challenge_type (as stored in the DB) to a tokenizer profile. */
function profileFor(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'javascript' || t === 'js' || t === 'typescript' || t === 'ts') return LANGUAGES.javascript;
  if (t === 'python' || t === 'py') return LANGUAGES.python;
  if (t === 'sql') return LANGUAGES.sql;
  if (t === 'css') return LANGUAGES.css;
  if (t === 'html') return LANGUAGES.html;
  return LANGUAGES.generic;
}

/* Classify a single word once a language profile is known. */
function classifyWord(word, lang) {
  if (lang.keywords.has(word)) return 'keyword';
  return 'identifier';
}

/* Operator characters — grouped longest-first so '===' beats '=='. */
const OPERATORS = ['===','!==','...','**=','<<=','>>=','=>','==','!=','<=','>=','&&','||','??','?.','++','--','+=','-=','*=','/=','%=','**','<<','>>','|','&','^','~','!','<','>','+','-','*','/','%','=','?',':'];

/**
 * Tokenize source code.
 * @param {string} source - raw code text
 * @param {string} language - profile key (javascript, python, sql, …)
 * @returns {Array<{type:string,value:string,line:number}>}
 */
function tokenize(source, language = 'generic') {
  const lang = profileFor(language);
  const tokens = [];
  const src = String(source || '');
  let i = 0;          // byte cursor
  let line = 1;       // line counter for diagnostics
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    /* ── Newlines: keep as tokens (structure signals) ── */
    if (ch === '\n') {
      tokens.push({ type: 'whitespace', value: '\n', line });
      line++;
      i++;
      continue;
    }

    /* ── Other whitespace ── */
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let j = i;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r')) j++;
      tokens.push({ type: 'whitespace', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    /* ── Line comments ── */
    if (lang.lineComment && src.startsWith(lang.lineComment, i)) {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    /* ── Block comments ── */
    if (lang.blockComment && src.startsWith(lang.blockComment[0], i)) {
      const close = lang.blockComment[1];
      let j = i + lang.blockComment[0].length;
      while (j < n && !src.startsWith(close, j)) {
        if (src[j] === '\n') line++;
        j++;
      }
      j = Math.min(j + close.length, n); // consume the closing marker
      tokens.push({ type: 'comment', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    /* ── String literals (with escape handling) ── */
    if (lang.strings.includes(ch)) {
      const quote = ch;
      let j = i + 1;
      let closed = false;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }   // skip escaped char
        if (src[j] === quote) { closed = true; j++; break; }
        if (src[j] === '\n' && quote !== '`') break;  // unterminated single-line string
        if (src[j] === '\n') line++;
        j++;
      }
      tokens.push({ type: 'string', value: src.slice(i, closed ? j : j), line, closed });
      i = j;
      continue;
    }

    /* ── Numbers (int, float, hex, scientific) ── */
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      if (ch === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F]/.test(src[j])) j++;
      } else {
        while (j < n && /[0-9._eE+-]/.test(src[j])) {
          // stop '+'/'-' unless directly after e/E (exponent sign)
          if ((src[j] === '+' || src[j] === '-') && !/[eE]/.test(src[j - 1])) break;
          j++;
        }
        // trailing dot/dash cleanup: a number must not end in . e + -
        while (j > i && /[._eE+-]$/.test(src[j - 1])) j--;
      }
      tokens.push({ type: 'number', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    /* ── Identifiers / keywords (letters, digits, _, $ after first char) ── */
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({ type: classifyWord(word, lang), value: word, line });
      i = j;
      continue;
    }

    /* ── Multi-char operators (longest match first) ── */
    let matchedOp = null;
    for (const op of OPERATORS) {
      if (op.length > 1 && src.startsWith(op, i)) { matchedOp = op; break; }
    }
    if (matchedOp) {
      tokens.push({ type: 'operator', value: matchedOp, line });
      i += matchedOp.length;
      continue;
    }

    /* ── Single-char punctuation ( ) { } [ ] ; , . etc. ── */
    if ('(){}[];,.:'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch, line });
      i++;
      continue;
    }

    /* ── Single-char operators not in the multi-char list ── */
    if ('|&^~!<>=+-*/%?'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch, line });
      i++;
      continue;
    }

    /* ── Anything else (unicode, emoji, garbage) ── */
    tokens.push({ type: 'unknown', value: ch, line });
    i++;
  }

  return tokens;
}

/* Convenience: keep only meaningful tokens (drop whitespace). */
function meaningfulTokens(source, language) {
  return tokenize(source, language).filter(t => t.type !== 'whitespace');
}

/* Convenience: extract identifiers+keywords in order (the "vocabulary"). */
function wordSequence(source, language) {
  return meaningfulTokens(source, language)
    .filter(t => t.type === 'keyword' || t.type === 'identifier')
    .map(t => t.value);
}

module.exports = { tokenize, meaningfulTokens, wordSequence, profileFor, LANGUAGES };
