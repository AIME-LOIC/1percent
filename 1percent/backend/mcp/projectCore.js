/**
 * mcp/projectCore.js
 *
 * PURPOSE:
 *   MCP PROJECT TOOLSET (Phase 19): read-only project context for authorized
 *   AI clients, following the exact auth/scoping model of studentCore.js —
 *   every handler receives the authenticated userId and MUST filter by it.
 *   AI never gets unrestricted access: tools only see projects of teams the
 *   token owner belongs to.
 *
 *   Answers "What am I supposed to build next?" → my_project_context.
 *
 * EXPORTS: TOOLS, handleProjectRpcMessage, SERVER_INFO
 * DEPENDENCIES: dotenv, path, @supabase/supabase-js
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), override: false });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* ============================================================
   Tool definitions — read-only, owner-scoped
   ============================================================ */

const TOOLS = [
  {
    name: 'my_project_context',
    description: "The developer's current project snapshot: project, status, progress, current milestone, highest-priority assigned task, its requirement, and the GitHub repository. Start here for 'what should I build next?'",
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'my_project_tasks',
    description: 'Tasks assigned to the developer in their current project, with status/priority/requirement. Does NOT include teammates\' tasks.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'my_project_requirements',
    description: 'Requirements of the current project with weights and completion — explains HOW progress is measured (requirement-driven, not commit-driven).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'my_project_activity',
    description: "The developer's own recent development activity (commits, PRs, reviews) in their projects.",
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'Default 15, max 50' } }
    }
  }
];

/* ============================================================
   Helpers
   ============================================================ */

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });
const errText = (e) => e?.message || String(e);

function requireUser(userId) {
  if (!userId) throw new Error('Internal error: missing developer identity for MCP tool call');
  return userId;
}

async function getCurrentProject(userId) {
  // teams the user belongs to → projects
  const { data: memberships, error: mErr } = await supabase
    .from('team_members').select('team_id').eq('user_id', userId);
  if (mErr) throw mErr;
  const teamIds = (memberships || []).map(m => m.team_id);
  if (teamIds.length === 0) return null;

  const { data: teams } = await supabase.from('teams').select('project_id').in('id', teamIds);
  const projectIds = [...new Set((teams || []).map(t => t.project_id))];
  if (projectIds.length === 0) return null;

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, status, priority, target_date')
    .in('id', projectIds);
  const active = (projects || []).filter(p => ['PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'DEPLOYMENT'].includes(p.status));
  const list = active.length > 0 ? active : (projects || []);
  // most recently updated active project wins
  const { data: ordered } = await supabase
    .from('projects')
    .select('id, name, description, status, priority, target_date, updated_at')
    .in('id', list.map(p => p.id))
    .order('updated_at', { ascending: false })
    .limit(1);
  return ordered?.[0] || null;
}

async function getRepoForProject(projectId) {
  const { data } = await supabase
    .from('project_repositories')
    .select('repositories(full_name, url, default_branch)')
    .eq('project_id', projectId);
  return (data || []).map(r => r.repositories).filter(Boolean);
}

async function getProgress(projectId) {
  const [{ data: reqs }, { data: tasks }] = await Promise.all([
    supabase.from('project_requirements').select('id, name, weight, status, manually_completed').eq('project_id', projectId),
    supabase.from('project_tasks').select('requirement_id, status').eq('project_id', projectId)
  ]);
  const { computeProjectProgress } = require('../services/projectService/progress');
  return computeProjectProgress(reqs || [], tasks || []);
}

/* ============================================================
   Tool implementations (all scoped by userId)
   ============================================================ */

async function toolMyProjectContext(userId) {
  requireUser(userId);
  const project = await getCurrentProject(userId);
  if (!project) return ok({ has_project: false, note: 'No project yet — the developer is not on a project team.' });

  const [milestones, tasks, repos, progress] = await Promise.all([
    supabase.from('project_milestones').select('id, name, due_date, status').eq('project_id', project.id).in('status', ['OPEN', 'IN_PROGRESS']).order('due_date').limit(1),
    supabase.from('project_tasks').select('id, title, description, status, priority, requirement_id, due_date').eq('project_id', project.id).eq('assignee_id', userId).order('priority').limit(20),
    getRepoForProject(project.id),
    getProgress(project.id)
  ]);

  const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const open = (tasks.data || []).filter(t => t.status !== 'DONE');
  open.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  const nextTask = open[0] || null;

  let requirement = null;
  if (nextTask?.requirement_id) {
    const { data: r } = await supabase
      .from('project_requirements').select('name, description, acceptance_criteria, weight').eq('id', nextTask.requirement_id).maybeSingle();
    requirement = r;
  }

  return ok({
    has_project: true,
    project: { id: project.id, name: project.name, status: project.status, description: project.description },
    progress: { overall_percent: progress.overall_percent, dimensions: progress.dimensions },
    current_milestone: milestones.data?.[0] || null,
    next_task: nextTask ? {
      title: nextTask.title,
      description: nextTask.description,
      priority: nextTask.priority,
      status: nextTask.status,
      due_date: nextTask.due_date
    } : null,
    requirement,
    repositories: repos.map(r => ({ full_name: r.full_name, url: r.url, default_branch: r.default_branch })),
    note: 'Progress is requirement-driven. Completing tasks moves requirement completion; GitHub commits are evidence only.'
  });
}

async function toolMyProjectTasks(userId) {
  requireUser(userId);
  const project = await getCurrentProject(userId);
  if (!project) return ok({ tasks: [], note: 'No project yet.' });

  const { data, error } = await supabase
    .from('project_tasks')
    .select('id, title, description, status, priority, due_date, requirement_id, github_issue_url, github_pr_url')
    .eq('project_id', project.id)
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return fail(errText(error));
  return ok({ project: { id: project.id, name: project.name }, tasks: data || [] });
}

async function toolMyProjectRequirements(userId) {
  requireUser(userId);
  const project = await getCurrentProject(userId);
  if (!project) return ok({ requirements: [], note: 'No project yet.' });

  const [{ data: reqs }, progress] = await Promise.all([
    supabase.from('project_requirements')
      .select('id, name, description, weight, status, priority, acceptance_criteria')
      .eq('project_id', project.id).order('created_at'),
    getProgress(project.id)
  ]);
  return ok({
    project: { id: project.id, name: project.name },
    requirements: reqs || [],
    progress,
    note: 'Requirement weights sum to 100. Each requirement contributes weight × completion to the project total.'
  });
}

async function toolMyProjectActivity(userId, args) {
  requireUser(userId);
  const limit = Math.min(Math.max(Number(args?.limit) || 15, 1), 50);
  const { data, error } = await supabase
    .from('project_activities')
    .select('type, actor, title, occurred_at, project_id')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) return fail(errText(error));
  return ok({ recent_activity: data || [] });
}

/* ============================================================
   Handler registry — same JSON-RPC shape as studentCore.js
   ============================================================ */

const HANDLERS = {
  my_project_context: toolMyProjectContext,
  my_project_tasks: toolMyProjectTasks,
  my_project_requirements: toolMyProjectRequirements,
  my_project_activity: toolMyProjectActivity
};

const SERVER_INFO = { name: 'onepercent-projects', version: '1.0.0' };

async function handleProjectRpcMessage(msg, userId) {
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
              instructions: 'Read-only project companion for 1percent developers. Scope: the authenticated user\'s own project, tasks and activity ONLY. Never invent project data; if there is no project, say so.'
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

module.exports = { TOOLS, handleProjectRpcMessage, SERVER_INFO };
