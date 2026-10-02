/**
 * services/projectService/index.js
 *
 * PURPOSE:
 *   Project engine core (Phase 3). Owns project/task/team/milestone/
 *   requirement CRUD plus the ROLE ACCESS SCOPING used by every route:
 *
 *     student  → projects of teams they belong to; tasks assigned to them
 *     mentor   → projects where they mentor assigned students (mentor_assignments)
 *     business → projects of their own company only (delivery-safe fields)
 *     admin    → everything
 *
 * EXPORTS: listProjectsForUser, getProjectForUser, getProjectProgress, createProject,
 *          updateProjectStatus, listTasksForUser, getTaskForUser, createTask, updateTask,
 *          transitionTask, addActivity, listRequirements, createRequirement, updateRequirement,
 *          listMilestones, createMilestone, completeMilestone, listTeams, createTeam,
 *          addTeamMember, listTeamMembers, connectRepository, getProjectRepository,
 *          listProjectRepositories, isMentorOfProject, listMentorProjects
 * DEPENDENCIES: ../../config/database, ./progress, ./activity
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { adminClient } = require('../../config/database');
const progressEngine = require('./progress');

/* ============================================================
   Access scoping (Phase 18) — pure helper, unit tested
   ============================================================ */

/**
 * Compute the set of project ids a user may access, by role.
 * Returns { mode: 'all' } for admin, { mode: 'ids', ids: [...] } otherwise
 * (empty array = no projects).
 */
async function accessibleProjectIds(user, profile) {
  const role = profile?.role || 'student';
  if (role === 'admin') return { mode: 'all' };

  if (role === 'business') {
    const { data: company } = await adminClient
      .from('companies').select('id').eq('owner_id', user.id).maybeSingle();
    if (!company) return { mode: 'ids', ids: [] };
    const { data } = await adminClient
      .from('projects').select('id').eq('business_id', company.id);
    return { mode: 'ids', ids: (data || []).map(p => p.id) };
  }

  if (role === 'mentor') {
    // Projects where the mentor mentors at least one team member.
    const { data: assigned } = await adminClient
      .from('mentor_assignments').select('learner_id').eq('mentor_id', user.id);
    const learnerIds = (assigned || []).map(a => a.learner_id);
    if (learnerIds.length === 0) return { mode: 'ids', ids: [] };
    const { data: memberships } = await adminClient
      .from('team_members').select('team_id').in('user_id', learnerIds);
    const teamIds = (memberships || []).map(m => m.team_id);
    if (teamIds.length === 0) return { mode: 'ids', ids: [] };
    const { data: teams } = await adminClient
      .from('teams').select('project_id').in('id', teamIds);
    return { mode: 'ids', ids: [...new Set((teams || []).map(t => t.project_id))] };
  }

  // student (default): teams they are a member of
  const { data: memberships } = await adminClient
    .from('team_members').select('team_id').eq('user_id', user.id);
  const teamIds = (memberships || []).map(m => m.team_id);
  if (teamIds.length === 0) return { mode: 'ids', ids: [] };
  const { data: teams } = await adminClient
    .from('teams').select('project_id').in('id', teamIds);
  return { mode: 'ids', ids: [...new Set((teams || []).map(t => t.project_id))] };
}

/** Can this user act on this specific task? */
async function canAccessTask(user, profile, task) {
  const role = profile?.role || 'student';
  if (role === 'admin') return true;
  if (role === 'mentor') {
    return isMentorOfProject(user.id, task.project_id);
  }
  if (role === 'business') {
    // businesses may VIEW tasks of their projects but not act on them
    const { data: company } = await adminClient
      .from('companies').select('id').eq('owner_id', user.id).maybeSingle();
    if (!company) return false;
    const { data: project } = await adminClient
      .from('projects').select('business_id').eq('id', task.project_id).maybeSingle();
    return project?.business_id === company.id;
  }
  // student: own tasks (read) — writes handled by transitionTask rules
  return task.assignee_id === user.id;
}

async function isMentorOfProject(mentorId, projectId) {
  const { data: assigned } = await adminClient
    .from('mentor_assignments').select('learner_id').eq('mentor_id', mentorId);
  const learnerIds = (assigned || []).map(a => a.learner_id);
  if (learnerIds.length === 0) return false;
  const { data: memberships } = await adminClient
    .from('team_members').select('team_id').in('user_id', learnerIds);
  const teamIds = (memberships || []).map(m => m.team_id);
  if (teamIds.length === 0) return false;
  const { data: teams } = await adminClient
    .from('teams').select('project_id').in('id', teamIds);
  return (teams || []).some(t => t.project_id === projectId);
}

/* ============================================================
   Projects
   ============================================================ */

const PROJECT_SELECT = `
  id, name, description, business_id, owner_id, status, priority,
  start_date, target_date, created_at, updated_at
`;

async function listProjectsForUser(user, profile, { status, limit = 50, offset = 0 } = {}) {
  const scope = await accessibleProjectIds(user, profile);
  let query = adminClient
    .from('projects')
    .select(PROJECT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (scope.mode === 'ids') {
    if (scope.ids.length === 0) return { projects: [], total: 0 };
    query = query.in('id', scope.ids);
  }
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query;
  if (error) throw error;
  return { projects: data || [], total: count || 0 };
}

async function getProjectForUser(user, profile, projectId) {
  const scope = await accessibleProjectIds(user, profile);
  if (scope.mode === 'ids' && !scope.ids.includes(projectId)) return null;
  const { data, error } = await adminClient
    .from('projects').select(PROJECT_SELECT).eq('id', projectId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getProjectProgress(projectId) {
  return progressEngine.recalculateProjectProgress(projectId);
}

async function createProject({ name, description, business_id, owner_id, status, priority, start_date, target_date, created_by }) {
  const { data, error } = await adminClient
    .from('projects')
    .insert({ name, description: description || '', business_id: business_id || null, owner_id: owner_id || null,
      status: status || 'APPROVED', priority: priority || 'MEDIUM', start_date: start_date || null,
      target_date: target_date || null, created_by: created_by || null })
    .select()
    .single();
  if (error) throw error;
  await addActivity({
    project_id: data.id, user_id: created_by || null, type: 'PROJECT_STATUS_CHANGED',
    actor: 'system', title: `project created (${data.status})`, metadata: { status: data.status }
  });
  return data;
}

async function updateProjectStatus(projectId, status, byUserId) {
  const { data, error } = await adminClient
    .from('projects').update({ status }).eq('id', projectId).select().single();
  if (error) throw error;
  await addActivity({
    project_id: projectId, user_id: byUserId || null, type: 'PROJECT_STATUS_CHANGED',
    actor: 'system', title: `status → ${status}`, metadata: { status }
  });
  return data;
}

/* ============================================================
   Tasks
   ============================================================ */

const TASK_SELECT = `
  id, project_id, requirement_id, milestone_id, title, description, status,
  priority, assignee_id, estimate_hours, due_date, github_issue_url,
  github_pr_url, completed_at, blocked_reason, created_at, updated_at
`;

async function listTasksForUser(user, profile, { project_id, status, assignee_id, limit = 50, offset = 0 } = {}) {
  const scope = await accessibleProjectIds(user, profile);
  let query = adminClient
    .from('project_tasks')
    .select(TASK_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (scope.mode === 'ids') {
    if (scope.ids.length === 0) return { tasks: [], total: 0 };
    query = query.in('project_id', scope.ids);
  }
  if (project_id) query = query.eq('project_id', project_id);
  if (status) query = query.eq('status', status);
  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  const { data, error, count } = await query;
  if (error) throw error;
  return { tasks: data || [], total: count || 0 };
}

async function getTaskForUser(user, profile, taskId) {
  const { data: task, error } = await adminClient
    .from('project_tasks').select(TASK_SELECT).eq('id', taskId).maybeSingle();
  if (error) throw error;
  if (!task) return null;
  const allowed = await canAccessTask(user, profile, task);
  return allowed ? task : null;
}

async function createTask(actor, { project_id, requirement_id, milestone_id, title, description, priority, assignee_id, estimate_hours, due_date }) {
  const { data, error } = await adminClient
    .from('project_tasks')
    .insert({
      project_id, requirement_id: requirement_id || null, milestone_id: milestone_id || null,
      title, description: description || '', priority: priority || 'MEDIUM',
      assignee_id: assignee_id || null, estimate_hours: estimate_hours || null,
      due_date: due_date || null, created_by: actor.id, status: 'TODO'
    })
    .select()
    .single();
  if (error) throw error;

  await addActivity({
    project_id, user_id: assignee_id || null, type: 'TASK_ASSIGNED',
    actor: actor.full_name || actor.email || 'system',
    title, metadata: { task_id: data.id }
  });

  // Notify assignee (Phase 24 — reuses existing notification system)
  if (assignee_id && assignee_id !== actor.id) {
    await notifyUser(assignee_id, 'Task assigned', `You were assigned: ${title}`, 'info').catch(() => {});
  }
  return data;
}

async function updateTask(actor, taskId, patch) {
  const allowed = ['title', 'description', 'priority', 'assignee_id', 'estimate_hours', 'due_date', 'requirement_id', 'milestone_id', 'status', 'blocked_reason'];
  const clean = {};
  for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
  if (Object.keys(clean).length === 0) throw new Error('Nothing to update');

  const { data, error } = await adminClient
    .from('project_tasks').update(clean).eq('id', taskId).select().single();
  if (error) throw error;

  if (clean.status === 'DONE' && !patch.silent) {
    await addActivity({
      project_id: data.project_id, user_id: data.assignee_id, type: 'TASK_COMPLETED',
      actor: actor.full_name || 'system', title: data.title, metadata: { task_id: data.id }
    });
    if (data.assignee_id && data.assignee_id !== actor.id) {
      await notifyUser(data.assignee_id, 'Task completed', data.title, 'success').catch(() => {});
    }
  }
  if (clean.status === 'BLOCKED') {
    await addActivity({
      project_id: data.project_id, type: 'TASK_BLOCKED',
      actor: actor.full_name || 'system', title: `${data.title}: ${clean.blocked_reason || 'blocked'}`,
      metadata: { task_id: data.id }
    });
  }
  return data;
}

/**
 * Student-facing transitions with permission + evidence rules (Phase 7).
 * Students may: start, pause, submit (→ IN_REVIEW), request testing.
 * Students may NOT mark DONE — mentors/admins approve (Phase 35).
 */
const STUDENT_TRANSITIONS = {
  start:  { from: ['TODO', 'BLOCKED'], to: 'IN_PROGRESS' },
  pause:  { from: ['IN_PROGRESS'], to: 'TODO' },
  submit: { from: ['IN_PROGRESS'], to: 'IN_REVIEW' },
  test:   { from: ['IN_REVIEW'], to: 'TESTING' }
};

async function transitionTask(actor, profile, taskId, action, { blocked_reason: blockReason } = {}) {
  const { data: task } = await adminClient
    .from('project_tasks').select(TASK_SELECT).eq('id', taskId).maybeSingle();
  if (!task) throw new Error('Task not found');

  const role = profile?.role || 'student';

  // assignee-only for students
  if (role === 'student') {
    if (task.assignee_id !== actor.id) throw new Error('You can only act on your own tasks');
    const t = STUDENT_TRANSITIONS[action];
    if (!t) throw new Error(`Students cannot perform action: ${action}`);
    if (!t.from.includes(task.status)) throw new Error(`Cannot ${action} a task in status ${task.status}`);
    return updateTask(actor, taskId, { status: t.to, silent: action !== 'submit' });
  }

  // mentors/admins: any transition incl. DONE (approval step)
  if (role === 'mentor' || role === 'admin') {
    const mentorOk = role === 'admin' || await isMentorOfProject(actor.id, task.project_id);
    if (!mentorOk) throw new Error('You do not mentor this project');
    if (action === 'approve') {
      if (task.status !== 'IN_REVIEW' && task.status !== 'TESTING') {
        throw new Error('Only IN_REVIEW/TESTING tasks can be approved');
      }
      return updateTask(actor, taskId, { status: 'DONE' });
    }
    if (action === 'block') {
      return updateTask(actor, taskId, { status: 'BLOCKED', blocked_reason: blockReason || 'Blocked by mentor' });
    }
    const t = STUDENT_TRANSITIONS[action];
    if (!t) throw new Error(`Unknown action: ${action}`);
    return updateTask(actor, taskId, { status: t.to });
  }

  throw new Error('Insufficient permissions');
}

/* ============================================================
   Requirements + milestones
   ============================================================ */

async function listRequirements(projectId) {
  const { data, error } = await adminClient
    .from('project_requirements').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data || [];
}

async function createRequirement({ project_id, milestone_id, name, description, weight, priority, acceptance_criteria }) {
  const { data, error } = await adminClient
    .from('project_requirements')
    .insert({ project_id, milestone_id: milestone_id || null, name, description: description || '',
      weight: weight ?? 10, priority: priority || 'MEDIUM', acceptance_criteria: acceptance_criteria || '' })
    .select().single();
  if (error) throw error;
  return data;
}

async function updateRequirement(actor, profile, requirementId, patch) {
  const { data: req } = await adminClient
    .from('project_requirements').select('*').eq('id', requirementId).maybeSingle();
  if (!req) throw new Error('Requirement not found');

  const role = profile?.role || 'student';
  // Students can NEVER mark requirements complete (Phase 7/35).
  if (role === 'student') throw new Error('Students cannot modify requirements');

  const allowed = ['name', 'description', 'weight', 'priority', 'status', 'acceptance_criteria', 'milestone_id'];
  if (role === 'mentor') {
    // mentors may set status but not change weights/scope
    const mentorOk = await isMentorOfProject(actor.id, req.project_id);
    if (!mentorOk) throw new Error('You do not mentor this project');
    const mentorAllowed = ['status'];
    const clean = {};
    for (const k of mentorAllowed) if (patch[k] !== undefined) clean[k] = patch[k];
    if (Object.keys(clean).length === 0) throw new Error('Nothing to update');
    const { data, error } = await adminClient
      .from('project_requirements').update(clean).eq('id', requirementId).select().single();
    if (error) throw error;
    return data;
  }

  // admin
  const clean = {};
  for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
  if (patch.manually_completed !== undefined) clean.manually_completed = patch.manually_completed;
  if (Object.keys(clean).length === 0) throw new Error('Nothing to update');
  const { data, error } = await adminClient
    .from('project_requirements').update(clean).eq('id', requirementId).select().single();
  if (error) throw error;
  return data;
}

async function listMilestones(projectId) {
  const { data, error } = await adminClient
    .from('project_milestones').select('*').eq('project_id', projectId).order('sort_order');
  if (error) throw error;
  return data || [];
}

async function createMilestone({ project_id, name, description, due_date, sort_order }) {
  const { data, error } = await adminClient
    .from('project_milestones')
    .insert({ project_id, name, description: description || '', due_date: due_date || null, sort_order: sort_order ?? 0 })
    .select().single();
  if (error) throw error;
  return data;
}

async function completeMilestone(actor, profile, milestoneId) {
  const role = profile?.role || 'student';
  if (role === 'student') throw new Error('Students cannot complete milestones');
  const { data: m } = await adminClient
    .from('project_milestones').select('project_id').eq('id', milestoneId).maybeSingle();
  if (!m) throw new Error('Milestone not found');
  if (role === 'mentor') {
    const ok = await isMentorOfProject(actor.id, m.project_id);
    if (!ok) throw new Error('You do not mentor this project');
  }
  const { data, error } = await adminClient
    .from('project_milestones')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', milestoneId).select().single();
  if (error) throw error;
  await addActivity({
    project_id: m.project_id, type: 'MILESTONE_COMPLETED',
    actor: actor.full_name || 'system', title: data.name, metadata: { milestone_id: milestoneId }
  });
  return data;
}

/* ============================================================
   Teams
   ============================================================ */

async function listTeams(projectId) {
  const { data, error } = await adminClient
    .from('teams').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data || [];
}

async function createTeam({ project_id, name, description }) {
  const { data, error } = await adminClient
    .from('teams').insert({ project_id, name, description: description || '' }).select().single();
  if (error) throw error;
  return data;
}

async function addTeamMember({ team_id, user_id, role }) {
  const { data, error } = await adminClient
    .from('team_members')
    .upsert({ team_id, user_id, role: role || 'developer' }, { onConflict: 'team_id,user_id' })
    .select().single();
  if (error) throw error;
  // keep project_assignments in sync (historical record)
  const { data: team } = await adminClient.from('teams').select('project_id').eq('id', team_id).maybeSingle();
  if (team) {
    await adminClient.from('project_assignments')
      .upsert({ project_id: team.project_id, user_id, role: role || 'developer' },
        { onConflict: 'project_id,user_id' });
  }
  return data;
}

async function listTeamMembers(projectId) {
  const { data: teams } = await adminClient.from('teams').select('id').eq('project_id', projectId);
  const teamIds = (teams || []).map(t => t.id);
  if (teamIds.length === 0) return [];
  const { data, error } = await adminClient
    .from('team_members')
    .select('id, team_id, user_id, role, joined_at, profiles!team_members_user_id_fkey(id, full_name, email, avatar_url)')
    .in('team_id', teamIds);
  if (error) throw error;
  return data || [];
}

/* ============================================================
   Repositories ↔ projects (Phase 22)
   ============================================================ */

async function connectRepository({ project_id, repository_row_id, connected_by }) {
  const { data, error } = await adminClient
    .from('project_repositories')
    .upsert({ project_id, repository_id: repository_row_id, connected_by },
      { onConflict: 'project_id,repository_id' })
    .select().single();
  if (error) throw error;
  const { data: repoRow } = await adminClient
    .from('repositories').select('full_name').eq('id', repository_row_id).maybeSingle();
  await addActivity({
    project_id, type: 'REPO_CONNECTED', actor: 'system',
    title: repoRow?.full_name || 'repository', metadata: { repository_id: repository_row_id }
  });
  return data;
}

async function listProjectRepositories(projectId) {
  const { data, error } = await adminClient
    .from('project_repositories')
    .select('id, project_id, connected_at, repositories(*)')
    .eq('project_id', projectId);
  if (error) throw error;
  return data || [];
}

async function getProjectRepositoryByGithubId(projectId, githubRepoId) {
  const { data, error } = await adminClient
    .from('project_repositories')
    .select('id, repositories(github_repo_id)')
    .eq('project_id', projectId)
    .eq('repositories.github_repo_id', githubRepoId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/* ============================================================
   Activity helper (internal events: tasks, status, milestones)
   ============================================================ */

async function addActivity({ project_id, user_id, type, actor, title, metadata }) {
  const { error } = await adminClient.from('project_activities').insert({
    project_id, user_id: user_id || null, type, actor: actor || '', title: (title || '').slice(0, 300),
    metadata: metadata || {}
  });
  if (error) throw error;
}

async function notifyUser(userId, title, message, type) {
  const { adminClient: db } = require('../../config/database');
  await db.from('notifications').insert({ user_id: userId, title, message, type: type || 'info' });
}

/* ============================================================
   Mentor helpers (Phase 9)
   ============================================================ */

async function listMentorProjects(mentorUser) {
  const scope = await accessibleProjectIds(mentorUser, { role: 'mentor' });
  if (scope.mode === 'ids' && scope.ids.length === 0) return [];
  let query = adminClient.from('projects').select(PROJECT_SELECT).order('updated_at', { ascending: false });
  if (scope.mode === 'ids') query = query.in('id', scope.ids);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

module.exports = {
  accessibleProjectIds,
  canAccessTask,
  isMentorOfProject,
  listProjectsForUser,
  getProjectForUser,
  getProjectProgress,
  createProject,
  updateProjectStatus,
  listTasksForUser,
  getTaskForUser,
  createTask,
  updateTask,
  transitionTask,
  listRequirements,
  createRequirement,
  updateRequirement,
  listMilestones,
  createMilestone,
  completeMilestone,
  listTeams,
  createTeam,
  addTeamMember,
  listTeamMembers,
  connectRepository,
  listProjectRepositories,
  getProjectRepositoryByGithubId,
  addActivity,
  listMentorProjects
};
