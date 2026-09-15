#!/usr/bin/env node
/* ============================================================
   generate-expert-sql.js
   ============================================================
   Reads every course data file in courses/expert-upgrades/*.js
   and emits a re-runnable SQL migration that appends the
   "Expert Layer" section to every published lesson of the
   matching course in Supabase.

   Re-runnable: an existing expert layer is stripped and the
   fresh one appended in its place (no duplication).

   Usage:
     node courses/expert-upgrades/generate-expert-sql.js

   Output:
     migrations/upgrade_course_expertise.sql
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { expertLayer } = require('./lib/template');

const COURSE_SLUGS = {
  'programming-fundamentals.js': 'programming-fundamentals',
  'git-github.js': 'git-github',
  'command-line-linux.js': 'command-line-linux',
  'backend-development.js': 'backend-development',
  'frontend-development.js': 'frontend-development',
  'databases.js': 'databases',
  'auth-security.js': 'auth-security',
  'system-design.js': 'system-design',
  'testing-debugging.js': 'testing-debugging',
  'devops-basics.js': 'devops-basics',
  'ai-coding-tools.js': 'ai-coding-tools',
  'capstone-project.js': 'capstone-project',
  'reading-codebases.js': 'reading-codebases',
  'technical-communication.js': 'technical-communication',
  'problem-solving.js': 'problem-solving',
  'python-foundations.js': 'python-foundations',
  'tech-in-business.js': 'tech-in-business',
  'robotics.js': 'robotics'
};

const MARKER = '## 🎓 The Expert Layer';

function dollarTag(slug) {
  return 'exp_' + slug.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}

/** Dollar-quote the layer body; guarantees the tag cannot appear in content */
function dollarQuote(body, tag) {
  if (body.includes(`$${tag}`)) {
    throw new Error(`Dollar-tag collision: $${tag}$ appears in content`);
  }
  return `$${tag}$\n${body}\n$${tag}$`;
}

function main() {
  const dir = __dirname;
  const files = fs.readdirSync(dir)
    .filter(f => COURSE_SLUGS[f])
    .sort();

  if (files.length === 0) {
    console.error('No course data files found in', dir);
    process.exit(1);
  }

  const slugs = files.map(f => COURSE_SLUGS[f]);

  const header = `-- ============================================================
-- EXPERT LAYER UPGRADE — auto-generated; do not edit by hand.
-- Source: courses/expert-upgrades/*.js
-- Generate: node courses/expert-upgrades/generate-expert-sql.js
-- Generated at: ${new Date().toISOString()}
--
-- Appends "The Expert Layer" to every published lesson of the
-- courses below: what professionals do differently, how they
-- actually work, insider moves, field scenarios, expert mistakes,
-- a day in the life, the hiring-manager's lens, first-job reality,
-- expert exercises, and go-deeper resources.
--
-- RE-RUNNABLE: an existing expert layer is replaced, not duplicated.
-- Existing lesson content is never modified, only appended to.
-- Run in the Supabase SQL Editor.
-- ============================================================

`;

  const blocks = [];

  for (const file of files) {
    const slug = COURSE_SLUGS[file];
    const data = require(path.join(dir, file));
    const layer = expertLayer(data);
    const quoted = dollarQuote(layer, dollarTag(slug));

    blocks.push(`-- ------------------------------------------------------------
-- Course: ${slug}  (source: ${file})
-- ------------------------------------------------------------
UPDATE public.lessons l
SET content_md = (
  CASE
    WHEN position('${MARKER}' in l.content_md) = 0 THEN l.content_md
    ELSE regexp_replace(
           left(l.content_md, position('${MARKER}' in l.content_md) - 1),
           '\\s*-{3,}\\s*$', '')
  END
) || ${quoted}
FROM public.courses c
WHERE c.id = l.course_id
  AND c.slug = '${slug}'
  AND l.is_published = true;
`);
  }

  const verification = `
-- ============================================================
-- VERIFICATION (run after the updates above)
-- ============================================================
DO $verify$
DECLARE
  v_updated int;
  v_missing int;
BEGIN
  SELECT count(*) INTO v_updated
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.slug = ANY(ARRAY[${slugs.map(s => `'${s}'`).join(', ')}])
    AND l.is_published = true
    AND position('${MARKER}' in l.content_md) > 0;

  SELECT count(*) INTO v_missing
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.slug = ANY(ARRAY[${slugs.map(s => `'${s}'`).join(', ')}])
    AND l.is_published = true
    AND position('${MARKER}' in l.content_md) = 0;

  RAISE NOTICE 'Expert layer present on % lessons; missing on % lessons.', v_updated, v_missing;
END
$verify$;
`;

  const sql = header + blocks.join('\n') + verification;

  const outPath = path.join(__dirname, '..', '..', 'migrations', 'upgrade_course_expertise.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath}`);
  console.log(`  courses: ${files.length}`);
  console.log(`  size: ${(sql.length / 1024).toFixed(0)} KB`);
}

main();
