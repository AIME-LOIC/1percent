/**
 * ai/features.js
 *
 * PURPOSE:
 *   Feature extraction for the trained reviewer: turns tokenized code into the numeric feature
 *   vector the model consumes (structure counts, keyword hits, shape metrics).
 *
 * EXPORTS: extractFeatures, shapeFingerprint, shapeSignature
 * DEPENDENCIES: x
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { meaningfulTokens, wordSequence } = require('./tokenizer');

/**
 * Build the understanding profile of a piece of code.
 * @param {string} source - raw code
 * @param {string} language - tokenizer profile key
 * @returns {object} profile
 */
function extractFeatures(source, language = 'generic') {
  const tokens = meaningfulTokens(source, language);
  const words = wordSequence(source, language);

  const profile = {
    language,
    tokenCount: tokens.length,
    lineCount: String(source || '').split('\n').length,

    /* ── Definitions: what the code DECLARES ── */
    defines: {
      functions: [],   // function foo( / const foo = (…) =>
      classes: [],     // class Foo
      variables: [],   // const/let/var declarations
      imports: [],     // import/require/from X
    },

    /* ── Calls: what the code USES/invokes ── */
    calls: [],           // foo( → 'foo'
    methodCalls: [],     // obj.method( → 'obj.method'
    keywordCounts: {},   // loop/branch keyword usage

    /* ── Flow signals ── */
    hasLoop: false,
    hasConditional: false,
    hasRecursion: false,
    hasReturn: false,
    hasAsync: false,
    hasErrorHandling: false,
    maxNesting: 0,       // deepest { nesting — structural complexity

    /* ── Style signals ── */
    commentLines: 0,
    stringLiterals: 0,
    numbersUsed: [],
    identifiers: [],     // all named things (for vocabulary match)
    vocab: new Set(),    // unique word set (course-concept overlap)
  };

  /* ── Keyword counting & flow signals ── */
  const flowKeywords = { loop: ['for', 'while', 'do'], condition: ['if', 'else', 'switch', 'case'], error: ['try', 'catch', 'except', 'finally'], async: ['async', 'await', 'yield'] };
  for (const t of tokens) {
    if (t.type === 'keyword') {
      profile.keywordCounts[t.value] = (profile.keywordCounts[t.value] || 0) + 1;
      if (flowKeywords.loop.includes(t.value)) profile.hasLoop = true;
      if (flowKeywords.condition.includes(t.value)) profile.hasConditional = true;
      if (flowKeywords.error.includes(t.value)) profile.hasErrorHandling = true;
      if (flowKeywords.async.includes(t.value)) profile.hasAsync = true;
      if (t.value === 'return') profile.hasReturn = true;
    } else if (t.type === 'comment') {
      profile.commentLines++;
    } else if (t.type === 'string') {
      profile.stringLiterals++;
    } else if (t.type === 'number') {
      const num = parseFloat(t.value);
      if (!isNaN(num)) profile.numbersUsed.push(num);
    }
  }

  /* ── Calls & definitions: scan tokens with 1-token lookahead ── */
  const definedFunctions = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (!next) break;

    // function declaration: function NAME (  /  def NAME (
    //   token layout: [i]='function'|'def', [i+1]=NAME, [i+2]='('
    if (t.type === 'keyword' && (t.value === 'function' || t.value === 'def')) {
      const nameTok = next;            // token right after the keyword
      const openParen = tokens[i + 2]; // must be the parameter list opener
      if (nameTok && nameTok.type === 'identifier' && openParen && openParen.value === '(') {
        profile.defines.functions.push(nameTok.value);
        definedFunctions.add(nameTok.value);
      }
    }

    // class declaration: class NAME
    if (t.type === 'keyword' && t.value === 'class' && next.type === 'identifier') {
      profile.defines.classes.push(next.value);
    }

    // variable declaration: const/let/var NAME  (also captures arrow fns)
    if (t.type === 'keyword' && ['const', 'let', 'var'].includes(t.value) && next.type === 'identifier') {
      profile.defines.variables.push(next.value);
    }

    // import/require: import … from 'x' / require('x') / from x import
    if (t.type === 'keyword' && (t.value === 'import' || t.value === 'require' || t.value === 'from')) {
      // find the next string token within 4 tokens
      for (let k = i + 1; k <= i + 4 && k < tokens.length; k++) {
        if (tokens[k].type === 'string') { profile.defines.imports.push(tokens[k].value); break; }
        if (tokens[k].type === 'identifier' && !['import', 'from'].includes(tokens[k].value) && tokens[k].value !== '(') {
          profile.defines.imports.push(tokens[k].value); break;
        }
      }
    }

    // call: identifier|member (
    if ((t.type === 'identifier') && next.value === '(') {
      // member call: obj.method(  → prev token is '.' and before that an identifier
      if (prev && prev.value === '.' && tokens[i - 2] && tokens[i - 2].type === 'identifier') {
        profile.methodCalls.push(`${tokens[i - 2].value}.${t.value}`);
      } else {
        profile.calls.push(t.value);
      }
    }
  }

  /* ── Recursion: a function that calls itself ── */
  for (const fn of definedFunctions) {
    if (profile.calls.includes(fn)) { profile.hasRecursion = true; break; }
  }

  /* ── Nesting depth (brace/indent-aware) ── */
  let depth = 0;
  for (const t of tokens) {
    if (t.value === '{') { depth++; profile.maxNesting = Math.max(profile.maxNesting, depth); }
    if (t.value === '}') depth = Math.max(0, depth - 1);
  }
  if (language === 'python' && profile.maxNesting === 0) {
    // Python uses indentation, not braces — approximate with leading spaces
    let maxIndent = 0;
    for (const line of String(source || '').split('\n')) {
      const indent = line.match(/^ */)[0].length;
      if (indent > maxIndent) maxIndent = indent;
    }
    profile.maxNesting = Math.ceil(maxIndent / 4);
  }

  /* ── Vocabulary (unique words, lowercased) ── */
  for (const w of words) profile.vocab.add(w.toLowerCase());

  /* ── Identifiers list ── */
  profile.identifiers = [...new Set([
    ...profile.defines.functions, ...profile.defines.variables,
    ...profile.calls, ...profile.methodCalls,
  ])];

  return profile;
}

/* ============================================================
   Shape fingerprint — for duplicate/AI-cheat detection.
   A coarse structural signature of the code that survives
   identifier renaming: f(a,b){return a+b} and
   f(x,y){return x+y} produce the SAME shape.
   ============================================================ */
function shapeFingerprint(source, language = 'generic') {
  const { tokenize } = require('./tokenizer');
  return tokenize(source, language)
    .filter(t => t.type !== 'whitespace' && t.type !== 'comment')
    .map(t => {
      switch (t.type) {
        case 'keyword': return 'K';
        case 'identifier': return 'I';
        case 'string': return 'S';
        case 'number': return 'N';
        case 'operator': return 'O';
        case 'punct': return t.value; // keep structural punctuation
        default: return '?';
      }
    })
    .join('');
}

/* Optional refinement: normalize the shape by collapsing runs so
   minor formatting differences don't change the fingerprint. */
function shapeSignature(source, language = 'generic') {
  return shapeFingerprint(source, language)
    .replace(/I{2,}/g, 'I')
    .replace(/N{2,}/g, 'N')
    .replace(/S{2,}/g, 'S')
    .replace(/O{2,}/g, 'O');
}

module.exports = { extractFeatures, shapeFingerprint, shapeSignature };
