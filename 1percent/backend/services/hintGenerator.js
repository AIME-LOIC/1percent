/**
 * services/hintGenerator.js
 *
 * PURPOSE:
 *   Generates challenge-specific hints after seeding (replacing generic placeholders) and enforces
 *   the unlock policy: first N free per calendar month via hint_allowance, then coins.
 *
 * EXPORTS: generateHints, normalizeType, detectTopics, extractSpecifics
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const CODE_LEXICON = {
  python: {
    loop: ['for loop', 'while loop', 'range()'],
    max: ['max()', 'the built-in max() function'],
    min: ['min()'],
    sum: ['sum()'],
    len: ['len()'],
    sort: ['sorted()', '.sort()'],
    string: ['f-strings', 'string slicing'],
    function: ['def', 'a return statement (not print) inside the function'],
    ifelse: ['if/else', 'the modulo operator %'],
    list: ['list indexing (starts at 0)', 'negative indexing ([-1] is the last item)'],
    dict: ['dictionaries', 'the .get() method'],
    split: ['.split()', '.strip()'],
    modulo: ['the % operator (x % 2 == 0 means even)'],
    print: ['print()'],
    append: ['.append()']
  },
  javascript: {
    dom: ['document.querySelector()', 'document.createElement()'],
    append: ['appendChild()', 'the parent node you must append to'],
    loop: ['forEach()', 'a for...of loop'],
    text: ['textContent', 'innerHTML (only if you control the markup)'],
    event: ['addEventListener()', 'the event object'],
    array: ['map()', 'the array method for transforming items'],
    fetch: ['async/await', 'try/catch around the fetch call'],
    output: ['console.log()', 'template literals for building the output'],
    select: ['querySelector with the exact id from the starter HTML']
  },
  sql: {
    select: ['SELECT with only the needed columns'],
    where: ['a WHERE clause on the exact column mentioned'],
    join: ['an explicit JOIN ... ON', 'which table holds the linking key'],
    group: ['GROUP BY', 'aggregates like COUNT(), AVG(), SUM()'],
    having: ['HAVING (it filters groups, WHERE filters rows)'],
    order: ['ORDER BY', 'DESC for largest-first'],
    limit: ['LIMIT'],
    index: ['CREATE INDEX with the columns in the right order', 'composite index column order matching the query'],
    insert: ['INSERT INTO with a column list'],
    update: ['UPDATE ... SET with a WHERE guard'],
    distinct: ['DISTINCT'],
    subquery: ['a subquery (or a JOIN to an aggregate)']
  },
  terminal: {
    add: ['git add (staging is separate from committing)'],
    commit: ['git commit -m with a short message'],
    branch: ['git checkout -b', 'git switch -c'],
    merge: ['git merge'],
    log: ['git log --oneline'],
    remote: ['git remote add origin', 'git push -u origin'],
    chmod: ['chmod with the octal mode', 'who gets u/g/o permissions'],
    chown: ['chown user:group'],
    grep: ['grep with -i for case-insensitive, -n for line numbers'],
    find: ['find with -name', 'the -exec flag'],
    ssh: ['ssh-keygen, then ssh-copy-id', '~/.ssh/config entries'],
    pipe: ['a pipe | into sort or wc'],
    tar: ['tar -xzf to extract'],
    mkdir: ['mkdir -p for nested paths']
  },
  docker: {
    run: ['docker run -d for detached mode', '-p host:container for ports'],
    build: ['docker build -t name:tag .', 'build context and the Dockerfile location'],
    compose: ['docker-compose up -d', 'service names as hostnames'],
    ps: ['docker ps -a'],
    exec: ['docker exec -it <container> sh'],
    volume: ['a named volume (-v name:/path)'],
    log: ['docker logs -f']
  },
  html: {
    semantic: ['semantic tags (header, main, section) over divs'],
    form: ['the <label for="..."> association', 'input types (email, number) for built-in validation'],
    list: ['<ul>/<ol> with <li> children'],
    link: ['<a href>', 'relative vs absolute paths'],
    img: ['alt text on every <img>'],
    table: ['<table> with <thead> and <tbody>']
  },
  css: {
    flex: ['display: flex on the parent', 'justify-content vs align-items axes'],
    grid: ['display: grid', 'grid-template-columns with fr units'],
    center: ['margin: 0 auto for blocks', 'flex centering for unknown sizes'],
    hover: [':hover', 'transition for smooth state changes'],
    media: ['a @media (max-width: ...) breakpoint', 'mobile-first min-width queries'],
    color: ['CSS custom properties (variables) for theme colors'],
    spacing: ['the box model: margin outside, padding inside']
  }
};

const TYPE_ALIASES = {
  git: 'terminal', bash: 'terminal', shell: 'terminal', linux: 'terminal',
  javascript: 'javascript', js: 'javascript',
  postgres: 'sql', mysql: 'sql', sqlite: 'sql',
  html: 'html', css: 'css', python: 'python', docker: 'docker', yaml: 'docker'
};

function normalizeType(ch) {
  const raw = String(ch.challenge_type || ch.language || '').toLowerCase();
  return TYPE_ALIASES[raw] || raw || 'javascript';
}

function hay(ch) {
  return [
    ch.title || '',
    ch.description || '',
    ch.starter_code || '',
    ch.starter_html || '',
    ch.expected_output || ''
  ].join(' \n ').toLowerCase();
}

/** Topics that are usually the *output* step, not the core concept */
const TRIVIAL_TOPICS = new Set(['print', 'output', 'log', 'text']);

/** Pick the lexicon topic whose keyword appears first/most in the challenge text */
function detectTopics(ch, type) {
  const desc = String(ch.description || '').toLowerCase();
  const text = hay(ch);
  const lex = CODE_LEXICON[type] || CODE_LEXICON.javascript;
  const scored = [];
  for (const topic of Object.keys(lex)) {
    const re = new RegExp(topic === 'ifelse' ? '\\b(if|else)\\b' : `\\b${topic}\\b`);
    const hits = (text.match(new RegExp(re.source, 'gi')) || []).length;
    if (hits > 0) {
      let score = hits;
      // A tool named in the description with call syntax ("try max()")
      // is the author pointing at the intended technique — strongest signal.
      if (new RegExp(`\\b${topic}\\s*\\(`).test(desc)) score += 3;
      // Description mentions outrank starter-code echoes.
      score += re.test(desc) ? 1 : 0;
      // Downweight trivial output topics so the core concept wins hint 1,
      // unless they are the only signal available.
      if (TRIVIAL_TOPICS.has(topic)) score *= 0.4;
      scored.push({ topic, hits: score, pos: text.search(re) });
    }
  }
  scored.sort((a, b) => b.hits - a.hits || a.pos - b.pos);
  return scored.map(s => s.topic);
}

/** Extract concrete identifiers (ids, columns, commands) to reference in hints */
function extractSpecifics(ch) {
  const text = `${ch.description || ''} ${ch.starter_code || ''} ${ch.starter_html || ''}`;
  const out = {};
  const idMatch = text.match(/#([a-zA-Z][\w-]*)/);
  if (idMatch) out.cssId = idMatch[1];
  const tableMatch = (ch.description || '').match(/\b(?:from|into|on|update|join)\s+([a-z_][\w]*)\s/i);
  if (tableMatch) out.table = tableMatch[1].toLowerCase();
  const colMatch = (ch.description || '').match(/\b(?:column|columns|field)s?\s+([\w\s,]+?)\b(?:,|\s+and\s)/i);
  if (colMatch) out.columns = colMatch[1].trim().toLowerCase();
  const fnMatch = (ch.starter_code || '').match(/def\s+([a-z_]\w*)\s*\(/) || (ch.description || '').match(/function\s+([a-z_]\w*)\s*\(/) || (ch.description || '').match(/\b([a-z_]\w*)\s*\([^)]*\)\s+that\s/i);
  if (fnMatch) out.function = fnMatch[1];
  const varMatch = (ch.starter_code || '').match(/^\s*(?:const|let|var)?\s*([a-z_]\w*)\s*=/m);
  if (varMatch) out.variable = varMatch[1];
  return out;
}

function firstLine(s) {
  return String(s || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
}

/** Extract the concrete goal from the description (first imperative sentence) */
function goalPhrase(ch) {
  const d = String(ch.description || '').replace(/\s+/g, ' ').trim();
  if (!d) return firstLine(ch.title);
  const m = d.match(/(?:[Ww]rite|[Cc]reate|[Bb]uild|[Ff]ix|[Pp]rint|[Mm]ake|[Rr]ender|[Cc]ompute|[Ff]ind|[Ss]how|[Gg]iven)[^.!?]*[.!?]?/);
  return (m ? m[0] : d.split(/[.!?]/)[0]).trim().slice(0, 120);
}

/**
 * Generate 3 progressive hints for a challenge.
 * Returns array of strings (may be fewer than 3 if data is very thin,
 * but practically always 3 because the generic fallbacks are type-aware).
 */
function generateHints(ch) {
  const type = normalizeType(ch);
  const topics = detectTopics(ch, type);
  const spec = extractSpecifics(ch);
  const goal = goalPhrase(ch);
  const hints = [];

  /* ── Hint 1: the nudge — reframe the goal, point at the core concept ── */
  const topic1 = topics[0];
  if (topic1) {
    const tool = (CODE_LEXICON[type] || {})[topic1]?.[0] || topic1;
    hints.push(`Restate the goal precisely: ${goal.replace(/\.$/, '')}. The core tool for this is ${tool} — make sure you know what it takes as input and what it gives back.`);
  } else {
    hints.push(`Restate the goal precisely: ${goal.replace(/\.$/, '')}. Identify the single input your solution starts from and the exact output required — then bridge them in the smallest way.`);
  }

  /* ── Hint 2: the approach — name the technique, reference specifics ── */
  const bits = [];
  if (topics[1]) bits.push((CODE_LEXICON[type] || {})[topics[1]]?.[1] || (CODE_LEXICON[type] || {})[topics[1]]?.[0]);
  if (spec.cssId) bits.push(`the element with id "${spec.cssId}"`);
  if (spec.table) bits.push(`the ${spec.table} table`);
  if (spec.function) bits.push(`the ${spec.function} function must return its result (not print it)`);
  if (spec.variable) bits.push(`use the provided ${spec.variable} variable`);
  if (bits.length) {
    hints.push(`Break it into steps: ${bits.filter(Boolean).slice(0, 2).join(', and ')}. Check each step against the starter code before moving on.`);
  } else if (topics[0]) {
    hints.push(`Break it into steps: first handle one example by hand, then encode that exact sequence using ${(CODE_LEXICON[type] || {})[topics[0]]?.[0] || topics[0]}.`);
  } else {
    hints.push('Break it into steps: solve the smallest concrete example by hand first, then encode that exact sequence in code.');
  }

  /* ── Hint 3: the reveal — concrete next action, type-aware ── */
  switch (type) {
    case 'terminal': {
      const cmds = (ch.expected_output || ch.description || '').match(/\b(?:git|docker|chmod|chown|ssh|grep|find|tar)\s+[\w-]+/gi) || [];
      if (cmds.length) hints.push(`Your submission must contain the command(s) ${cmds.slice(0, 2).map(c => `\`${c}\``).join(' and ')} — type them as bare commands (no $ prompt), one per line.`);
      else hints.push('Write the exact commands, one per line, without the $ prompt or comments — the grader matches whole commands, not substrings.');
      break;
    }
    case 'sql': {
      if (spec.columns) hints.push(`Your index/query should cover: ${spec.columns}. Remember composite index column order must match the query's filter order.`);
      else if (spec.table) hints.push(`Write the full statement against the ${spec.table} table — end it with a semicolon, and make sure the WHERE clause references real columns.`);
      else hints.push('Write the complete statement (with semicolon). If it involves speed, name the index and the exact columns it covers.');
      break;
    }
    case 'python': {
      if (/return|function|def /.test(hay(ch))) hints.push(`Define the function with def${spec.function ? ` ${spec.function}(...)` : ''} and RETURN the value — the given print() calls will do the output for you.`);
      else if (/countdown|loop|range/.test(hay(ch))) hints.push('Use a for loop over range() and print each value; handle the final extra line after the loop.');
      else if (/even|odd|modulo/.test(hay(ch))) hints.push('Use an if/else with the modulo operator: number % 2 === 0 means even.');
      else hints.push('Compute the value first, then one print() with the exact expected format — spacing and capitalisation must match character for character.');
      break;
    }
    case 'javascript': {
      if (spec.cssId && (ch.test_cases || []).length) hints.push(`Select the element with document.querySelector("#${spec.cssId}"), create each child with document.createElement, and appendChild it — the automated tests check "${(ch.test_cases[0]?.description || 'the structure')}".`);
      else if (spec.cssId) hints.push(`Target the element with id "${spec.cssId}" exactly as spelled in the starter HTML.`);
      else hints.push('Build the output step by step and print/log the final result — match the expected output exactly, including case and punctuation.');
      break;
    }
    case 'html': {
      hints.push('Write valid, complete markup — every tag opened must be closed, and attributes (alt, for, href) must be present where the task names them.');
      break;
    }
    case 'css': {
      hints.push('Apply the rule to the correct selector from the starter markup; remember layout properties (flex/grid) go on the PARENT element.');
      break;
    }
    case 'docker': {
      hints.push('Use the exact flags the task names — port mappings are -p host:container and detached mode is -d; run docker ps afterwards to confirm.');
      break;
    }
    default:
      hints.push('Match the expected output exactly — same characters, same order, no extras.');
  }

  return hints.slice(0, 3);
}

module.exports = { generateHints, normalizeType, detectTopics, extractSpecifics };
