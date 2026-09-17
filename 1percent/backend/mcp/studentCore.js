/* ============================================================
   1percent Learn — Student MCP Core (transport-independent)
   ============================================================
   Student-scoped MCP tools: a student generates a personal
   token in Settings → "Connect to Claude", pastes it into the
   claude.ai custom connector, and Claude can then:

     • see their courses, progress, coins, streak, certificates
     • read lesson/challenge content and explain it
     • TEST code against the real grader — without awarding
       coins or saving a submission

   DESIGN PRINCIPLE: the student does the work. Every tool is
   READ-ONLY or a no-consequence grading dry-run. There is no
   tool that can write progress, award coins, or submit a
   challenge on the student's behalf.

   Token auth lives in ../services/studentMcpService.js (hash
   lookup). All data is read with the service-role client but
   strictly filtered by the token's user_id — the student can
   only ever see their own rows (plus published course content,
   which is public anyway).
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
   Tool definitions — deliberately small and read-only
   ============================================================ */

const TOOLS = [
  {
    name: 'my_learning_overview',
    description: 'The student\'s own snapshot: enrolled courses with progress %, coins, streak, certificates. Use this first to see where the student stands.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'my_courses',
    description: 'List the courses the student is enrolled in, with lesson counts, completed lessons, and progress percent. Set status to "completed" (or "in_progress") to filter.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['in_progress', 'completed'], description: 'Filter by progress (default: all enrolled courses)' }
      }
    }
  },
  {
    name: 'get_lesson',
    description: 'Read one lesson\'s full markdown content so you can explain it, summarize it, or answer questions about it. Get lesson ids from my_courses → next_lessons, or my_learning_overview.',
    inputSchema: {
      type: 'object',
      properties: {
        lesson_id: { type: 'string', format: 'uuid', description: 'Lesson id (recommended)' },
        course_slug: { type: 'string', description: 'Course slug — combined with lesson_title to find the lesson' },
        lesson_title: { type: 'string', description: 'Exact or partial lesson title' }
      }
    }
  },
  {
    name: 'get_challenge',
    description: 'Read one challenge\'s description, difficulty, coins, and starter code so you can help the student understand what is being asked. You NEVER see hidden expected outputs or test cases — and you must not try to infer them for the student. Get challenge ids/titles from my_courses or course challenges.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_id: { type: 'string', format: 'uuid', description: 'Challenge id (recommended)' },
        course_slug: { type: 'string', description: 'Course slug — combined with challenge_title' },
        challenge_title: { type: 'string', description: 'Exact or partial challenge title' }
      }
    }
  },
  {
    name: 'check_my_code',
    description: 'Dry-run the student\'s draft code through the REAL grader for a challenge. Reports passed/failed and the same reject reason the playground would show. This is a TEST ONLY: it never awards coins, never saves a submission, and never marks the challenge complete — the student must still submit their own final solution in the playground.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_id: { type: 'string', format: 'uuid', description: 'Challenge id (recommended)' },
        course_slug: { type: 'string', description: 'Course slug — combined with challenge_title' },
        challenge_title: { type: 'string', description: 'Exact or partial challenge title' },
        code: { type: 'string', description: 'The student\'s draft code to test. Omit to test the challenge\'s starter code.' }
      },
      required: []
    }
  },
  {
    name: 'my_progress_in_course',
    description: 'Detailed progress in one course: every lesson (done or not) and every challenge (passed or not), in order. Use it to plan what the student should do next.',
    inputSchema: {
      type: 'object',
      properties: {
        course_slug: { type: 'string', description: 'Course slug, e.g. "python-foundations"' }
      },
      required: ['course_slug']
    }
  },
  {
    name: 'my_activity',
    description: 'The student\'s recent activity: latest lesson completions and challenge attempts (passed or failed). Useful for "what did I do recently?" questions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'How many items (default 15, max 50)' }
      }
    }
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

/**
 * Every handler receives `userId` — the authenticated owner of the
 * MCP token. All queries MUST be filtered by it. This is the only
 * scoping mechanism, so it is passed explicitly and asserted here.
 */
function requireUser(userId) {
  if (!userId) throw new Error('Internal error: missing student identity for MCP tool call');
  return userId;
}

async function getCourseBySlug(slug) {
  const { data, error } = await supabase
    .from('courses').select('id, slug, title, level, duration_weeks, is_published')
    .eq('slug', slug).maybeSingle();
  if (error) throw new Error(errText(error));
  return data; // may be null
}

async function resolveChallenge(args) {
  if (args.challenge_id) {
    const { data, error } = await supabase
      .from('challenges').select('*').eq('id', args.challenge_id).maybeSingle();
    if (error) throw new Error(errText(error));
    return data;
  }
  if (args.challenge_title) {
    let query = supabase.from('challenges').select('*').ilike('title', `%${args.challenge_title}%`);
    if (args.course_slug) {
      const course = await getCourseBySlug(args.course_slug);
      if (course) query = query.eq('course_id', course.id);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw new Error(errText(error));
    return data;
  }
  throw new Error('Provide challenge_id, or course_slug + challenge_title.');
}

async function resolveLesson(args) {
  if (args.lesson_id) {
    const { data, error } = await supabase
      .from('lessons').select('*').eq('id', args.lesson_id).maybeSingle();
    if (error) throw new Error(errText(error));
    return data;
  }
  if (args.lesson_title) {
    let query = supabase.from('lessons').select('*').ilike('title', `%${args.lesson_title}%`);
    if (args.course_slug) {
      const course = await getCourseBySlug(args.course_slug);
      if (course) query = query.eq('course_id', course.id);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw new Error(errText(error));
    return data;
  }
  throw new Error('Provide lesson_id, or course_slug + lesson_title.');
}

/* ============================================================
   Tool implementations
   ============================================================ */

async function toolMyLearningOverview(userId) {
  requireUser(userId);

  const [{ data: enrollments, error: enrErr }, { data: profile, error: profErr }] = await Promise.all([
    supabase.from('enrollments').select('course_id, enrolled_at, completed_at').eq('user_id', userId),
    supabase.from('profiles').select('full_name, coins, streak_count, has_used_free_cert_view').eq('id', userId).single()
  ]);
  if (enrErr) return fail(errText(enrErr));

  const courseIds = (enrollments || []).map(e => e.course_id);
  let courses = [];
  if (courseIds.length > 0) {
    const { data, error } = await supabase
      .from('courses').select('id, slug, title, icon, level')
      .in('id', courseIds).order('sort_order');
    if (error) return fail(errText(error));
    courses = data || [];
  }

  const enriched = await Promise.all(courses.map(async (c) => {
    const [{ count: lessonCount }, { count: doneCount }] = await Promise.all([
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', c.id).eq('is_published', true),
      supabase.from('lesson_progress').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('completed', true)
        .in('lesson_id', (await supabase.from('lessons').select('id').eq('course_id', c.id).eq('is_published', true)).data?.map(l => l.id) || [])
    ]);
    const pct = lessonCount ? Math.round(((doneCount || 0) / lessonCount) * 100) : 0;
    return { slug: c.slug, title: c.title, level: c.level, lessons_done: doneCount || 0, lessons_total: lessonCount || 0, progress_percent: pct };
  }));

  const { count: certCount } = await supabase
    .from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', userId);

  return ok({
    student: profile?.full_name || 'Student',
    coins: profile?.coins ?? 0,
    current_streak: profile?.streak_count ?? 0,
    enrolled_courses: enriched,
    certificates_earned: certCount || 0
  });
}

async function toolMyCourses(userId, args) {
  requireUser(userId);

  const { data: enrollments, error } = await supabase
    .from('enrollments').select('course_id, enrolled_at, completed_at').eq('user_id', userId);
  if (error) return fail(errText(error));

  const courseIds = (enrollments || []).map(e => e.course_id);
  if (courseIds.length === 0) return ok({ courses: [], note: 'Not enrolled in any courses yet.' });

  const { data: courses, error: cErr } = await supabase
    .from('courses').select('id, slug, title, description, level, duration_weeks')
    .in('id', courseIds).order('sort_order');
  if (cErr) return fail(errText(cErr));

  const enriched = await Promise.all((courses || []).map(async (c) => {
    const { data: lessons } = await supabase
      .from('lessons').select('id, title, sort_order').eq('course_id', c.id).eq('is_published', true).order('sort_order');
    const lessonIds = (lessons || []).map(l => l.id);

    const { data: progress } = lessonIds.length
      ? await supabase.from('lesson_progress').select('lesson_id').eq('user_id', userId).eq('completed', true).in('lesson_id', lessonIds)
      : { data: [] };
    const doneIds = new Set((progress || []).map(p => p.lesson_id));

    const lessonsTotal = lessonIds.length;
    const lessonsDone = doneIds.size;
    const pct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

    // Next up: first 3 uncompleted lessons
    const nextLessons = (lessons || []).filter(l => !doneIds.has(l.id)).slice(0, 3)
      .map(l => ({ lesson_id: l.id, title: l.title }));

    return {
      slug: c.slug, title: c.title, level: c.level, duration_weeks: c.duration_weeks,
      lessons_done: lessonsDone, lessons_total: lessonsTotal, progress_percent: pct,
      completed: pct >= 100,
      next_lessons: nextLessons,
      next_challenge: null // filled below
    };
  }));

  // Attach the first un-passed challenge per course
  await Promise.all(enriched.map(async (course) => {
    const full = (courses || []).find(c => c.slug === course.slug);
    const { data: chs } = await supabase
      .from('challenges').select('id, title, difficulty, coins_reward').eq('course_id', full.id).eq('is_active', true).order('sort_order');
    if (!chs || chs.length === 0) return;
    const { data: subs } = await supabase
      .from('challenge_submissions').select('challenge_id').eq('user_id', userId).eq('passed', true)
      .in('challenge_id', chs.map(ch => ch.id));
    const passed = new Set((subs || []).map(s => s.challenge_id));
    const next = chs.find(ch => !passed.has(ch.id));
    if (next) course.next_challenge = { challenge_id: next.id, title: next.title, difficulty: next.difficulty, coins_reward: next.coins_reward };
  }));

  let result = enriched;
  if (args?.status === 'completed') result = enriched.filter(c => c.completed);
  else if (args?.status === 'in_progress') result = enriched.filter(c => !c.completed);

  return ok({ courses: result, total: result.length });
}

async function toolGetLesson(userId, args) {
  requireUser(userId);
  try {
    const lesson = await resolveLesson(args);
    if (!lesson) return fail('Lesson not found. Check the id, or use course_slug + lesson_title.');
    if (!lesson.is_published) return fail('This lesson is not published.');
    const { data: progress } = await supabase
      .from('lesson_progress').select('completed, completed_at').eq('user_id', userId).eq('lesson_id', lesson.id).maybeSingle();
    return ok({
      lesson: {
        id: lesson.id, title: lesson.title, description: lesson.description,
        lesson_type: lesson.lesson_type, duration_min: lesson.duration_min,
        content_md: lesson.content_md
      },
      completed_by_student: !!progress?.completed,
      completed_at: progress?.completed_at || null
    });
  } catch (e) {
    return fail(errText(e));
  }
}

async function toolGetChallenge(userId, args) {
  requireUser(userId);
  try {
    const ch = await resolveChallenge(args);
    if (!ch) return fail('Challenge not found. Check the id, or use course_slug + challenge_title.');
    if (!ch.is_active) return fail('This challenge is not active.');
    const { data: sub } = await supabase
      .from('challenge_submissions').select('passed, submitted_at').eq('user_id', userId).eq('challenge_id', ch.id).maybeSingle();

    // Never leak expected_output or test_cases — the student must solve it.
    return ok({
      challenge: {
        id: ch.id, title: ch.title, description: ch.description,
        difficulty: ch.difficulty, challenge_type: ch.challenge_type,
        coins_reward: ch.coins_reward,
        starter_code: ch.starter_code || ''
      },
      passed_by_student: !!sub?.passed,
      note: 'Expected outputs and test cases are hidden. Help the student understand the task — do not try to reconstruct the hidden expected output.'
    });
  } catch (e) {
    return fail(errText(e));
  }
}

async function toolCheckMyCode(userId, args) {
  requireUser(userId);
  try {
    const ch = await resolveChallenge(args);
    if (!ch) return fail('Challenge not found. Check the id, or use course_slug + challenge_title.');

    const code = args.code !== undefined ? String(args.code) : (ch.starter_code || '');
    if (!code.trim()) return fail('No code to check — provide `code` or use the challenge starter code.');

    // Load the REAL grader from the live backend (same path the playground uses)
    const coinsService = require('../services/coinsService');
    const started = Date.now();
    let passed, reason = null;
    try {
      passed = await coinsService._evaluateCode(code, ch);
      if (!passed) reason = coinsService._lastRejectReason || 'No reason recorded';
      coinsService._lastRejectReason = null;
    } catch (e) {
      return fail(`Grader crashed: ${errText(e)}`);
    }

    return ok({
      challenge: { id: ch.id, title: ch.title, type: ch.challenge_type },
      passed,
      reject_reason: reason,
      graded_in_ms: Date.now() - started,
      important: passed
        ? 'Dry-run passed. This does NOT count — the student must submit this solution themselves in the playground to earn the coins.'
        : 'Dry-run failed. Explain the reject reason and guide the student to fix their own code. Do not write the solution for them.'
    });
  } catch (e) {
    return fail(errText(e));
  }
}

async function toolMyProgressInCourse(userId, args) {
  requireUser(userId);
  const course = await getCourseBySlug(args.course_slug);
  if (!course) return fail(`Course "${args.course_slug}" not found.`);

  const [{ data: lessons }, { data: chs }] = await Promise.all([
    supabase.from('lessons').select('id, title, lesson_type, duration_min, sort_order, is_published')
      .eq('course_id', course.id).eq('is_published', true).order('sort_order'),
    supabase.from('challenges').select('id, title, difficulty, coins_reward, sort_order, is_active')
      .eq('course_id', course.id).eq('is_active', true).order('sort_order')
  ]);

  const lessonIds = (lessons || []).map(l => l.id);
  const [{ data: progress }, { data: subs }] = await Promise.all([
    lessonIds.length
      ? supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId).eq('completed', true).in('lesson_id', lessonIds)
      : Promise.resolve({ data: [] }),
    (chs || []).length
      ? supabase.from('challenge_submissions').select('challenge_id, passed, submitted_at').eq('user_id', userId).in('challenge_id', chs.map(c => c.id))
      : Promise.resolve({ data: [] })
  ]);

  const doneMap = new Map((progress || []).map(p => [p.lesson_id, p.completed_at]));
  const subMap = new Map((subs || []).map(s => [s.challenge_id, s]));

  const lessonsOut = (lessons || []).map(l => ({
    lesson_id: l.id, title: l.title, type: l.lesson_type, duration_min: l.duration_min,
    completed: doneMap.has(l.id), completed_at: doneMap.get(l.id) || null
  }));
  const challengesOut = (chs || []).map(c => ({
    challenge_id: c.id, title: c.title, difficulty: c.difficulty, coins_reward: c.coins_reward,
    passed: !!subMap.get(c.id)?.passed, last_attempt: subMap.get(c.id)?.submitted_at || null
  }));

  const lessonsDone = lessonsOut.filter(l => l.completed).length;
  const pct = lessonsOut.length ? Math.round((lessonsDone / lessonsOut.length) * 100) : 0;

  return ok({
    course: { slug: course.slug, title: course.title, level: course.level },
    progress_percent: pct,
    lessons: lessonsOut,
    challenges: challengesOut,
    next_step: lessonsOut.find(l => !l.completed)?.title
      || challengesOut.find(c => !c.passed)?.title
      || 'Course complete — certificate should be available!'
  });
}

async function toolMyActivity(userId, args) {
  requireUser(userId);
  const limit = Math.min(Math.max(Number(args?.limit) || 15, 1), 50);

  const [{ data: lessonCompletions }, { data: attempts }] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_id, completed_at')
      .eq('user_id', userId).eq('completed', true)
      .order('completed_at', { ascending: false }).limit(limit),
    supabase.from('challenge_submissions').select('challenge_id, passed, submitted_at')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false }).limit(limit)
  ]);

  // Resolve names
  const lessonIds = (lessonCompletions || []).map(l => l.lesson_id);
  const challengeIds = (attempts || []).map(a => a.challenge_id);
  const [lessonsRes, challengesRes] = await Promise.all([
    lessonIds.length ? supabase.from('lessons').select('id, title, course_id').in('id', lessonIds) : Promise.resolve({ data: [] }),
    challengeIds.length ? supabase.from('challenges').select('id, title').in('id', challengeIds) : Promise.resolve({ data: [] })
  ]);
  const lessonMap = new Map((lessonsRes.data || []).map(l => [l.id, l.title]));
  const challengeMap = new Map((challengesRes.data || []).map(c => [c.id, c.title]));

  const events = [
    ...(lessonCompletions || []).map(l => ({
      type: 'lesson_completed', title: lessonMap.get(l.lesson_id) || 'Lesson', at: l.completed_at
    })),
    ...(attempts || []).map(a => ({
      type: a.passed ? 'challenge_passed' : 'challenge_attempted',
      title: challengeMap.get(a.challenge_id) || 'Challenge', at: a.submitted_at
    }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);

  return ok({ recent_activity: events, total: events.length });
}

/* ============================================================
   Handler registry
   ============================================================ */

const HANDLERS = {
  my_learning_overview: toolMyLearningOverview,
  my_courses: toolMyCourses,
  get_lesson: toolGetLesson,
  get_challenge: toolGetChallenge,
  check_my_code: toolCheckMyCode,
  my_progress_in_course: toolMyProgressInCourse,
  my_activity: toolMyActivity
};

const SERVER_INFO = { name: 'onepercent-learn-student', version: '1.0.0' };

/**
 * Handle one JSON-RPC message, already authenticated as `userId`.
 * Same response shape as backend/mcp/core.js so transports can be shared.
 */
async function handleStudentRpcMessage(msg, userId) {
  const { id, method, params } = msg;

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
              serverInfo: SERVER_INFO,
              instructions: 'Read-only learning companion for 1% Expert Programme students. Help them understand lessons and debug their own code. Never do assignments for them: check_my_code is a dry-run only, and writing full solutions to graded challenges is not allowed.'
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
          return { response: { jsonrpc: '2.0', id, result: await handler(userId, params?.arguments || {}) } };
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

module.exports = { TOOLS, STUDENT_TOOLS: TOOLS, handleStudentRpcMessage, SERVER_INFO };
