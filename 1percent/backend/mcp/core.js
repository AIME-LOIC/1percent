/* ============================================================
   1percent Learn — MCP Core (transport-independent)
   ============================================================
   Tool definitions + JSON-RPC method dispatch, shared by:
   - backend/mcp/server.js        (stdio transport — Claude Desktop/Code)
   - backend/routes/mcpRoutes.js  (Streamable HTTP — claude.ai web)

   Storage: Supabase via the service-role key from the project .env
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), override: false });

const { createClient } = require('@supabase/supabase-js');

/* ── Supabase admin client (service role — server-side only) ── */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* ============================================================
   Tool definitions
   ============================================================ */

const TOOLS = [
  {
    name: 'list_courses',
    description: 'List all courses with their lesson/challenge counts. Set published_only=true to hide drafts.',
    inputSchema: {
      type: 'object',
      properties: {
        published_only: { type: 'boolean', description: 'Only return is_published courses (default false)' }
      }
    }
  },
  {
    name: 'get_course',
    description: 'Get one course with all of its lessons and challenges (full content, starter code, test cases, expected outputs).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Course slug, e.g. "python-foundations"' }
      },
      required: ['slug']
    }
  },
  {
    name: 'create_course',
    description: 'Create a course. Returns the new course id.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Unique URL slug, e.g. "web-basics" (lowercase, hyphens)' },
        title: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string', description: 'Icon key from js/icons.js (default "book-open")' },
        level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        duration_weeks: { type: 'integer' },
        sort_order: { type: 'integer', description: 'Position in listings (default 100)' },
        is_published: { type: 'boolean', description: 'Publish immediately (default false)' }
      },
      required: ['slug', 'title', 'description']
    }
  },
  {
    name: 'update_course',
    description: 'Update course fields by slug. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string' },
        level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        duration_weeks: { type: 'integer' },
        sort_order: { type: 'integer' },
        is_published: { type: 'boolean' }
      },
      required: ['slug']
    }
  },
  {
    name: 'delete_course',
    description: 'Delete a course by slug. Its lessons are removed (cascade). Its challenges are kept but orphaned (course_id set to null) unless delete_challenges=true.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        delete_challenges: { type: 'boolean', description: 'Also delete the course challenges (default false)' }
      },
      required: ['slug']
    }
  },
  {
    name: 'create_lesson',
    description: 'Add a lesson to a course. content_md is GitHub-flavored markdown (supports code blocks). Returns the lesson id.',
    inputSchema: {
      type: 'object',
      properties: {
        course_slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        content_md: { type: 'string', description: 'Markdown content. Use \\n for newlines in JSON strings.' },
        lesson_type: { type: 'string', enum: ['video', 'lab', 'project', 'quiz', 'reading'] },
        duration_min: { type: 'integer' },
        sort_order: { type: 'integer', description: 'Position within the course (default: after the last lesson)' },
        is_published: { type: 'boolean', description: 'Default true' }
      },
      required: ['course_slug', 'title', 'content_md']
    }
  },
  {
    name: 'update_lesson',
    description: 'Update a lesson by id. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        lesson_id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        content_md: { type: 'string' },
        lesson_type: { type: 'string', enum: ['video', 'lab', 'project', 'quiz', 'reading'] },
        duration_min: { type: 'integer' },
        sort_order: { type: 'integer' },
        is_published: { type: 'boolean' }
      },
      required: ['lesson_id']
    }
  },
  {
    name: 'delete_lesson',
    description: 'Delete a lesson by id.',
    inputSchema: {
      type: 'object',
      properties: { lesson_id: { type: 'string', format: 'uuid' } },
      required: ['lesson_id']
    }
  },
  {
    name: 'create_challenge',
    description: 'Add a challenge to a course. For real-output grading set expected_output (code is executed and stdout compared); for DOM grading set test_cases. Returns the challenge id.',
    inputSchema: {
      type: 'object',
      properties: {
        course_slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
        challenge_type: { type: 'string', enum: ['javascript', 'python', 'html', 'css', 'git', 'linux', 'sql', 'yaml', 'docker', 'markdown', 'nginx'] },
        coins_reward: { type: 'integer', description: 'Default 10' },
        sort_order: { type: 'integer', description: 'Default: after the last challenge in the course' },
        starter_code: { type: 'string', description: 'Code pre-filled in the editor. Use \\n for newlines.' },
        starter_html: { type: 'string', description: 'HTML placed in the DOM sandbox before the code runs (javascript DOM challenges)' },
        expected_output: { type: 'string', description: 'Exact stdout the code must print (enables execution grading for js/python). Use \\n for newlines.' },
        test_cases: { type: 'string', description: 'JSON array of {selector, property, expected, description} for DOM grading' },
        vm_timeout_ms: { type: 'integer', description: 'Execution timeout (default 2000)' },
        is_active: { type: 'boolean', description: 'Default true' }
      },
      required: ['course_slug', 'title', 'description']
    }
  },
  {
    name: 'update_challenge',
    description: 'Update a challenge by id. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
        challenge_type: { type: 'string', enum: ['javascript', 'python', 'html', 'css', 'git', 'linux', 'sql', 'yaml', 'docker', 'markdown', 'nginx'] },
        coins_reward: { type: 'integer' },
        sort_order: { type: 'integer' },
        starter_code: { type: 'string' },
        starter_html: { type: 'string' },
        expected_output: { type: 'string' },
        test_cases: { type: 'string' },
        vm_timeout_ms: { type: 'integer' },
        is_active: { type: 'boolean' }
      },
      required: ['challenge_id']
    }
  },
  {
    name: 'delete_challenge',
    description: 'Delete a challenge by id.',
    inputSchema: {
      type: 'object',
      properties: { challenge_id: { type: 'string', format: 'uuid' } },
      required: ['challenge_id']
    }
  },
  {
    name: 'test_grader',
    description: "Run code through the REAL challenge grader against an existing challenge. Reports passed/failed and the exact reject reason a student would see. Does NOT award coins or save a submission.",
    inputSchema: {
      type: 'object',
      properties: {
        challenge_slug_or_id: { type: 'string', description: 'Challenge id or exact title (with course_slug to disambiguate)' },
        course_slug: { type: 'string', description: 'Optional: narrows challenge lookup by title' },
        code: { type: 'string', description: "The code to grade. Omit to grade the challenge's own starter_code (useful to check it does NOT pass)." }
      },
      required: ['challenge_slug_or_id']
    }
  },
  {
    name: 'platform_stats',
    description: 'Platform overview: course/lesson/challenge counts, published vs draft, submissions and pass counts, recent coin transactions.',
    inputSchema: { type: 'object', properties: {} }
  }
];

/* ============================================================
   Helpers
   ============================================================ */

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });

function errText(error) {
  return error?.message || String(error);
}

async function getCourseId(slug) {
  const { data, error } = await supabase
    .from('courses').select('id').eq('slug', slug).single();
  if (error) throw new Error(`Course "${slug}" not found (${errText(error)})`);
  return data.id;
}

async function nextSortOrder(table, courseId) {
  const { data } = await supabase
    .from(table).select('sort_order').eq('course_id', courseId)
    .order('sort_order', { ascending: false }).limit(1);
  return ((data?.[0]?.sort_order) || 0) + 1;
}

/** Parse test_cases: accepts array or JSON string; validates shape. */
function parseTestCases(input) {
  if (input === undefined || input === null || input === '') return null;
  let arr = input;
  if (typeof input === 'string') {
    try { arr = JSON.parse(input); } catch (e) {
      throw new Error(`test_cases is not valid JSON: ${e.message}`);
    }
  }
  if (!Array.isArray(arr)) throw new Error('test_cases must be a JSON array of {selector, property, expected}');
  for (const tc of arr) {
    if (!tc || typeof tc.selector !== 'string' || !('expected' in tc)) {
      throw new Error('Each test case needs {selector, property, expected, description?}');
    }
  }
  return arr;
}

/* ============================================================
   Tool implementations
   ============================================================ */

async function toolListCourses(args) {
  let q = supabase.from('courses')
    .select('id, slug, title, description, icon, level, duration_weeks, is_published, sort_order, updated_at')
    .order('sort_order');
  if (args.published_only) q = q.eq('is_published', true);
  const { data, error } = await q;
  if (error) return fail(errText(error));

  const enriched = await Promise.all((data || []).map(async (c) => {
    const [lessons, challenges] = await Promise.all([
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', c.id),
      supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('course_id', c.id)
    ]);
    return { ...c, lesson_count: lessons.count ?? 0, challenge_count: challenges.count ?? 0 };
  }));
  return ok({ courses: enriched, total: enriched.length });
}

async function toolGetCourse(args) {
  const { data: course, error } = await supabase
    .from('courses').select('*').eq('slug', args.slug).single();
  if (error) return fail(`Course "${args.slug}" not found: ${errText(error)}`);

  const [lessons, challenges] = await Promise.all([
    supabase.from('lessons').select('*').eq('course_id', course.id).order('sort_order'),
    supabase.from('challenges').select('*').eq('course_id', course.id).order('sort_order')
  ]);
  return ok({ course, lessons: lessons.data || [], challenges: challenges.data || [] });
}

async function toolCreateCourse(args) {
  const { data, error } = await supabase.from('courses').insert({
    slug: args.slug,
    title: args.title,
    description: args.description,
    icon: args.icon || 'book-open',
    level: args.level || 'beginner',
    duration_weeks: args.duration_weeks || 8,
    sort_order: args.sort_order ?? 100,
    is_published: args.is_published ?? false
  }).select().single();
  if (error) return fail(errText(error));
  return ok({ created: true, course: data });
}

async function toolUpdateCourse(args) {
  const patch = {};
  for (const k of ['title', 'description', 'icon', 'level', 'duration_weeks', 'sort_order', 'is_published']) {
    if (args[k] !== undefined) patch[k] = args[k];
  }
  if (Object.keys(patch).length === 0) return fail('Nothing to update');
  const { data, error } = await supabase.from('courses')
    .update(patch).eq('slug', args.slug).select().single();
  if (error) return fail(errText(error));
  return ok({ updated: true, course: data });
}

async function toolDeleteCourse(args) {
  const id = await getCourseId(args.slug);
  if (args.delete_challenges) {
    const { error } = await supabase.from('challenges').delete().eq('course_id', id);
    if (error) return fail(errText(error));
  }
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) return fail(errText(error));
  return ok({ deleted: true, slug: args.slug, challenges_deleted: !!args.delete_challenges });
}

async function toolCreateLesson(args) {
  const courseId = await getCourseId(args.course_slug);
  const { data, error } = await supabase.from('lessons').insert({
    course_id: courseId,
    title: args.title,
    description: args.description || '',
    content_md: args.content_md,
    lesson_type: args.lesson_type || 'reading',
    duration_min: args.duration_min || 20,
    sort_order: args.sort_order ?? await nextSortOrder('lessons', courseId),
    is_published: args.is_published ?? true
  }).select().single();
  if (error) return fail(errText(error));
  return ok({ created: true, lesson: data });
}

async function toolUpdateLesson(args) {
  const patch = {};
  for (const k of ['title', 'description', 'content_md', 'lesson_type', 'duration_min', 'sort_order', 'is_published']) {
    if (args[k] !== undefined) patch[k] = args[k];
  }
  if (Object.keys(patch).length === 0) return fail('Nothing to update');
  const { data, error } = await supabase.from('lessons')
    .update(patch).eq('id', args.lesson_id).select().single();
  if (error) return fail(errText(error));
  return ok({ updated: true, lesson: data });
}

async function toolDeleteLesson(args) {
  const { error } = await supabase.from('lessons').delete().eq('id', args.lesson_id);
  if (error) return fail(errText(error));
  return ok({ deleted: true, lesson_id: args.lesson_id });
}

async function toolCreateChallenge(args) {
  const courseId = await getCourseId(args.course_slug);
  let testCases = null;
  try { testCases = parseTestCases(args.test_cases); } catch (e) { return fail(e.message); }

  const row = {
    course_id: courseId,
    title: args.title,
    description: args.description || '',
    difficulty: args.difficulty || 'easy',
    challenge_type: args.challenge_type || 'javascript',
    coins_reward: args.coins_reward ?? 10,
    sort_order: args.sort_order ?? await nextSortOrder('challenges', courseId),
    starter_code: args.starter_code || '',
    expected_output: args.expected_output || '',
    is_active: args.is_active ?? true
  };
  // Extra columns may not exist on older schemas — add them only when provided.
  if (args.starter_html !== undefined) row.starter_html = args.starter_html;
  if (testCases !== null) row.test_cases = testCases;
  if (args.vm_timeout_ms !== undefined) row.vm_timeout_ms = args.vm_timeout_ms;

  const { data, error } = await supabase.from('challenges').insert(row).select().single();
  if (error) {
    if (error.message && /column .* does not exist/i.test(error.message)) {
      // Retry without the extended columns
      for (const k of ['starter_html', 'test_cases', 'vm_timeout_ms']) delete row[k];
      const retry = await supabase.from('challenges').insert(row).select().single();
      if (retry.error) return fail(retry.error.message);
      return ok({ created: true, challenge: retry.data, note: 'Extended columns (starter_html/test_cases/vm_timeout_ms) missing in schema — challenge created without them.' });
    }
    return fail(errText(error));
  }
  return ok({ created: true, challenge: data });
}

async function toolUpdateChallenge(args) {
  const patch = {};
  for (const k of ['title', 'description', 'difficulty', 'challenge_type', 'coins_reward', 'sort_order', 'starter_code', 'expected_output', 'is_active']) {
    if (args[k] !== undefined) patch[k] = args[k];
  }
  if (args.starter_html !== undefined) patch.starter_html = args.starter_html;
  if (args.vm_timeout_ms !== undefined) patch.vm_timeout_ms = args.vm_timeout_ms;
  if (args.test_cases !== undefined) {
    try { patch.test_cases = parseTestCases(args.test_cases); } catch (e) { return fail(e.message); }
  }
  if (Object.keys(patch).length === 0) return fail('Nothing to update');
  const { data, error } = await supabase.from('challenges')
    .update(patch).eq('id', args.challenge_id).select().single();
  if (error) return fail(errText(error));
  return ok({ updated: true, challenge: data });
}

async function toolDeleteChallenge(args) {
  const { error } = await supabase.from('challenges').delete().eq('id', args.challenge_id);
  if (error) return fail(errText(error));
  return ok({ deleted: true, challenge_id: args.challenge_id });
}

async function toolTestGrader(args) {
  // Load the grader from the live backend code
  const coinsService = require('../services/coinsService');

  // Resolve the challenge by id or title
  let query = supabase.from('challenges').select('*');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.challenge_slug_or_id);
  if (isUuid) {
    query = query.eq('id', args.challenge_slug_or_id);
  } else {
    query = query.ilike('title', args.challenge_slug_or_id);
    if (args.course_slug) {
      const courseId = await getCourseId(args.course_slug);
      query = query.eq('course_id', courseId);
    }
  }
  const { data: challenge, error } = await query.limit(1).maybeSingle();
  if (error || !challenge) {
    return fail(`Challenge "${args.challenge_slug_or_id}" not found${error ? `: ${errText(error)}` : ''}`);
  }

  const code = args.code !== undefined ? args.code : (challenge.starter_code || '');
  const started = Date.now();
  let passed, reason = null;
  try {
    passed = await coinsService._evaluateCode(code, challenge);
    if (!passed) reason = coinsService._lastRejectReason || 'No reason recorded';
    coinsService._lastRejectReason = null;
  } catch (e) {
    return fail(`Grader crashed: ${errText(e)}`);
  }
  return ok({
    challenge: { id: challenge.id, title: challenge.title, type: challenge.challenge_type },
    has_expected_output: !!String(challenge.expected_output || '').trim(),
    test_case_count: Array.isArray(challenge.test_cases) ? challenge.test_cases.length
      : (typeof challenge.test_cases === 'string' && challenge.test_cases ? 'jsonb-string' : 0),
    passed,
    reason,
    graded_in_ms: Date.now() - started,
    graded_code: code,
    note: 'Real grader — coins and submissions were NOT touched.'
  });
}

async function toolPlatformStats() {
  const [courses, lessons, challenges, subs, coins] = await Promise.all([
    supabase.from('courses').select('id, is_published', { count: 'exact' }),
    supabase.from('lessons').select('id', { count: 'exact' }),
    supabase.from('challenges').select('id, is_active', { count: 'exact' }),
    supabase.from('challenge_submissions').select('challenge_id, passed', { count: 'exact' }),
    supabase.from('coin_transactions').select('amount, reason, created_at').order('created_at', { ascending: false }).limit(5)
  ]);
  const { count: passedCount } = await supabase.from('challenge_submissions').select('challenge_id', { count: 'exact', head: true }).eq('passed', true);
  return ok({
    courses: { total: courses.count, published: (courses.data || []).filter(c => c.is_published).length },
    lessons: lessons.count,
    challenges: { total: challenges.count, active: (challenges.data || []).filter(c => c.is_active).length },
    submissions: { total: subs.count, passed: passedCount },
    recent_coin_transactions: coins.data || []
  });
}

const HANDLERS = {
  list_courses: toolListCourses,
  get_course: toolGetCourse,
  create_course: toolCreateCourse,
  update_course: toolUpdateCourse,
  delete_course: toolDeleteCourse,
  create_lesson: toolCreateLesson,
  update_lesson: toolUpdateLesson,
  delete_lesson: toolDeleteLesson,
  create_challenge: toolCreateChallenge,
  update_challenge: toolUpdateChallenge,
  delete_challenge: toolDeleteChallenge,
  test_grader: toolTestGrader,
  platform_stats: toolPlatformStats
};

/* ============================================================
   JSON-RPC method dispatch (shared by both transports)
   ============================================================ */

const SERVER_INFO = { name: 'onepercent-learn', version: '1.0.0' };

/**
 * Handle one JSON-RPC message.
 * Returns:
 *   { response }  — a JSON-RPC response object to send back
 *   { notification: true } — for notifications (no id): nothing to send
 * Callers own serialization (stdio newline framing / HTTP JSON body).
 */
async function handleRpcMessage(msg) {
  const { id, method, params } = msg;

  // Notifications have no id — nothing to send back.
  if (id === undefined || id === null) {
    return { notification: true };
  }

  try {
    switch (method) {
      case 'initialize':
        return {
          response: {
            jsonrpc: '2.0', id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: SERVER_INFO
            }
          }
        };

      case 'ping':
        return { response: { jsonrpc: '2.0', id, result: {} } };

      case 'tools/list':
        return { response: { jsonrpc: '2.0', id, result: { tools: TOOLS } } };

      case 'tools/call': {
        const name = params?.name;
        const handler = HANDLERS[name];
        if (!handler) {
          return { response: { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } } };
        }
        try {
          return { response: { jsonrpc: '2.0', id, result: await handler(params?.arguments || {}) } };
        } catch (e) {
          return { response: { jsonrpc: '2.0', id, result: fail(errText(e)) } };
        }
      }

      default:
        return { response: { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } } };
    }
  } catch (e) {
    return { response: { jsonrpc: '2.0', id, error: { code: -32603, message: errText(e) } } };
  }
}

module.exports = { TOOLS, handleRpcMessage, SERVER_INFO };
