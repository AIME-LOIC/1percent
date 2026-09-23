/**
 * One-off data repair — literal "\n" corruption in lesson content_md.
 *
 * Symptom: lessons in `web-basics` and `office-essentials` render as one
 * dense bold-splattered blob. Root cause: the stored markdown contains the
 * two-character sequence backslash+n instead of real newlines (the text was
 * pasted through the admin form with escaped escapes), so renderMarkdown()
 * never sees a line start — headings/lists/paragraphs all collapse.
 *
 * What this does:
 *   1. Backs up every affected row to scripts/backups/lesson-content-<ts>.json
 *   2. Replaces literal \n → newline and \" → " in content_md (+ description)
 *   3. Updates only rows that actually changed, in small batches
 *
 * Run: node scripts/fix-literal-newlines.js            (dry-run by default)
 *      node scripts/fix-literal-newlines.js --write    (apply the fix)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const COURSE_SLUGS = ['web-basics', 'office-essentials'];
const WRITE = process.argv.includes('--write');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

/** Unescape literal \n, \r\n, \" and \' sequences left in stored text. */
function unescapeLiteral(s) {
  if (!s) return s;
  return s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

(async () => {
  const { data: courses, error } = await sb.from('courses').select('id, slug').in('slug', COURSE_SLUGS);
  if (error) throw error;

  const backup = [];
  let scanned = 0, changed = 0, failed = 0;

  for (const course of courses) {
    const { data: lessons, error: lErr } = await sb
      .from('lessons')
      .select('id, title, content_md, description')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true });
    if (lErr) throw lErr;

    for (const lesson of lessons) {
      scanned++;
      const fixed = unescapeLiteral(lesson.content_md || '');
      const fixedDesc = unescapeLiteral(lesson.description || '');
      const mdChanged = fixed !== (lesson.content_md || '');
      const descChanged = fixedDesc !== (lesson.description || '');
      if (!mdChanged && !descChanged) continue;

      changed++;
      backup.push({ course: course.slug, lesson_id: lesson.id, title: lesson.title, before: lesson.content_md });
      console.log(`[${course.slug}] ${lesson.title}: ${(lesson.content_md || '').length} -> ${fixed.length} chars`);

      if (!WRITE) continue;
      const { error: uErr } = await sb
        .from('lessons')
        .update({ content_md: fixed, description: fixedDesc })
        .eq('id', lesson.id);
      if (uErr) { failed++; console.error('  UPDATE FAILED:', uErr.message); }
    }
  }

  if (backup.length) {
    const dir = path.join(__dirname, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `lesson-content-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    console.log(`Backup (${backup.length} rows) -> ${file}`);
  }

  console.log(`Scanned ${scanned} lessons · ${changed} corrupted${WRITE ? '' : ' (dry-run — rerun with --write)'}` + (failed ? ` · ${failed} FAILED` : ''));
  if (WRITE && failed) process.exit(1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
