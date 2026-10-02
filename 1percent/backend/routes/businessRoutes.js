/**
 * routes/businessRoutes.js
 *
 * PURPOSE:
 *   Business portal API (Phases 11–13): company signup (reusing the EXISTING
 *   Supabase auth — no second auth system), company profile, project
 *   requests, and the delivery-safe project view (no private student data,
 *   no internal notes, no other companies' data — Phase 12).
 *
 * ENDPOINTS:
 *   POST /auth/signup                 create auth user (role=business) + company
 *   GET  /profile                     own company
 *   PUT  /profile                     update own company
 *   GET  /projects                    own projects (delivery-safe)
 *   GET  /projects/:id                one project (delivery-safe)
 *   POST /projects/request            submit project request (status REQUESTED)
 *   GET  /projects/requests           own requests
 *
 * EXPORTS: businessRouter
 * DEPENDENCIES: express, ../middlewares/auth, ../config/database, ../services/authService
 *
 * Data model: migrations/add_project_system.sql · Architecture: docs/PROJECT_SYSTEM_ARCHITECTURE.md
 */

const { Router } = require('express');
const { adminClient, anonClient } = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const logService = require('../services/logService');

const router = Router();

/* ── validation helpers (no new deps) ────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(body) {
  const errors = [];
  const req = (field, label, min = 1) => {
    const v = String(body?.[field] ?? '').trim();
    if (v.length < min) errors.push(`${label} is required${min > 1 ? ` (min ${min} chars)` : ''}`);
    return v;
  };
  const name = req('name', 'Company name', 2);
  const email = req('email', 'Company email');
  if (email && !EMAIL_RE.test(email)) errors.push('Company email is not valid');
  const password = String(body?.password ?? '');
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password !== String(body?.confirm_password ?? '')) errors.push('Passwords do not match');
  const phone = String(body?.phone ?? '').trim();
  if (phone && !/^[+0-9()\-\s]{7,20}$/.test(phone)) errors.push('Phone number is not valid');
  const website = String(body?.website ?? '').trim();
  if (website && !/^https?:\/\/.+\..+/.test(website)) errors.push('Website must be a valid URL');
  const size = String(body?.company_size ?? '');
  if (size && !['1-2', '3-10', '10-50', '50-200', '200+'].includes(size)) errors.push('Company size is not valid');
  return { errors, values: { name, email, phone, website, size } };
}

/* ============================================================
   SIGNUP — uses existing Supabase auth (admin createUser) so the
   business account is a normal auth user with role=business.
   ============================================================ */
router.post('/auth/signup', async (req, res) => {
  try {
    const { errors, values } = validateSignup(req.body);
    if (errors.length > 0) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: errors.join('; ') } });
    }

    // email uniqueness check via existing profiles mirror
    const { data: existing } = await adminClient
      .from('profiles').select('id').eq('email', values.email).maybeSingle();
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });
    }

    // create auth user (service role) — email_confirm true: businesses are invited companies
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: values.email,
      password: req.body.password,
      email_confirm: true,
      user_metadata: { full_name: req.body.contact_person || values.name }
    });
    if (createErr) throw createErr;

    // profile role → business (trigger created the profile row with default role)
    await adminClient.from('profiles').update({ role: 'business', full_name: req.body.contact_person || values.name })
      .eq('id', created.user.id);

    const { data: company, error: companyErr } = await adminClient
      .from('companies')
      .insert({
        owner_id: created.user.id,
        name: values.name,
        email: values.email,
        phone: req.body.phone || '',
        website: req.body.website || '',
        industry: req.body.industry || '',
        country: req.body.country || 'Rwanda',
        city: req.body.city || '',
        company_size: req.body.company_size || '',
        contact_person: req.body.contact_person || '',
        contact_role: req.body.contact_role || ''
      })
      .select()
      .single();
    if (companyErr) throw companyErr;

    // sign the new user in via anon client to return a session (no second auth system)
    const { data: session } = await anonClient.auth.signInWithPassword({
      email: values.email,
      password: req.body.password
    });

    logService.logEvent({
      level: 'info', event: 'business_signup',
      message: 'New business registered', userId: created.user.id,
      metadata: { company_id: company.id }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      company,
      session: session?.session ? { access_token: session.session.access_token, user: session.user } : null
    });
  } catch (err) {
    console.error('[BUSINESS] signup error:', err.message);
    res.status(500).json({ success: false, error: { code: 'SIGNUP_FAILED', message: 'Signup failed. Please try again.' } });
  }
});

/* ── everything below requires an authenticated business ─────── */
const businessAuth = [authenticate, async (req, res, next) => {
  const { data: profile } = await adminClient
    .from('profiles').select('role').eq('id', req.user.id).maybeSingle();
  if (!profile || profile.role !== 'business') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Business account required.' } });
  }
  req.profile = profile;
  next();
}];

router.get('/profile', ...businessAuth, async (req, res) => {
  const { data, error } = await adminClient
    .from('companies').select('*').eq('owner_id', req.user.id).maybeSingle();
  if (error || !data) {
    return res.status(404).json({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company profile not found.' } });
  }
  res.json({ success: true, company: data });
});

router.put('/profile', ...businessAuth, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'website', 'industry', 'country', 'city', 'company_size', 'contact_person', 'contact_role'];
    const patch = {};
    for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = String(req.body[k]).slice(0, 300);
    if (Object.keys(patch).length === 0) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: 'Nothing to update.' } });
    }
    const { data, error } = await adminClient
      .from('companies').update(patch).eq('owner_id', req.user.id).select().single();
    if (error) throw error;
    res.json({ success: true, company: data });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update profile.' } });
  }
});

/* ── delivery-safe project list/detail (Phase 12) ────────────── */

async function getOwnCompany(userId) {
  const { data } = await adminClient
    .from('companies').select('id').eq('owner_id', userId).maybeSingle();
  return data || null;
}

function toDeliverySafeProject(p, progress) {
  // NEVER include: student emails/avatars, internal notes, evaluations.
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    priority: p.priority,
    start_date: p.start_date,
    target_date: p.target_date,
    progress: progress ? {
      overall_percent: progress.overall_percent,
      requirement_progress: progress.requirement_progress,
      dimensions: progress.dimensions
    } : null
  };
}

router.get('/projects', ...businessAuth, async (req, res) => {
  try {
    const company = await getOwnCompany(req.user.id);
    if (!company) return res.json({ success: true, projects: [] });
    const { data, error } = await adminClient
      .from('projects').select('*').eq('business_id', company.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const projects = [];
    for (const p of data || []) {
      const progress = await require('../services/projectService/progress')
        .recalculateProjectProgress(p.id).catch(() => null);
      projects.push(toDeliverySafeProject(p, progress));
    }
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'LOAD_FAILED', message: 'Failed to load projects.' } });
  }
});

router.get('/projects/:id', ...businessAuth, async (req, res) => {
  try {
    const company = await getOwnCompany(req.user.id);
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });

    const { data: project } = await adminClient
      .from('projects').select('*').eq('id', req.params.id).eq('business_id', company.id).maybeSingle();
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });

    const { adminClient: db } = require('../config/database');
    const [progress, milestones, docs, deployments, feedback] = await Promise.all([
      require('../services/projectService/progress').recalculateProjectProgress(project.id).catch(() => null),
      db.from('project_milestones').select('id, name, description, due_date, status, completed_at').eq('project_id', project.id),
      db.from('project_documents').select('id, title, kind, updated_at').eq('project_id', project.id),
      db.from('deployments').select('environment, status, url, deployed_at').eq('project_id', project.id).order('deployed_at', { ascending: false }).limit(5),
      db.from('project_feedback').select('rating, body, created_at').eq('project_id', project.id).eq('from_role', 'business')
    ]);

    res.json({
      success: true,
      project: {
        ...toDeliverySafeProject(project, progress),
        milestones: milestones.data || [],
        documents: docs.data || [],
        deployments: deployments.data || [],
        feedback: feedback.data || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'LOAD_FAILED', message: 'Failed to load project.' } });
  }
});

/* ── project request (Phase 12) ──────────────────────────────── */

router.post('/projects/request', ...businessAuth, async (req, res) => {
  try {
    const company = await getOwnCompany(req.user.id);
    if (!company) return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Create your company profile first.' } });

    const b = req.body || {};
    const errors = [];
    if (!b.name || String(b.name).trim().length < 3) errors.push('Project name is required (min 3 chars)');
    if (!b.problem || String(b.problem).trim().length < 20) errors.push('Problem description is required (min 20 chars)');
    const priority = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(b.priority) ? b.priority : 'MEDIUM';
    if (errors.length) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION', message: errors.join('; ') } });
    }

    const { data, error } = await adminClient
      .from('project_requests')
      .insert({
        business_id: company.id,
        name: String(b.name).slice(0, 200),
        problem: String(b.problem).slice(0, 5000),
        desired_solution: String(b.desired_solution || '').slice(0, 5000),
        requirements: String(b.requirements || '').slice(0, 5000),
        target_users: String(b.target_users || '').slice(0, 1000),
        priority,
        timeline: String(b.timeline || '').slice(0, 200),
        budget_range: String(b.budget_range || '').slice(0, 100),
        attachments: Array.isArray(b.attachments) ? b.attachments.slice(0, 10).map(a => ({
          label: String(a?.label || 'attachment').slice(0, 200),
          url: String(a?.url || '').slice(0, 500)
        })) : [],
        notes: String(b.notes || '').slice(0, 2000),
        status: 'REQUESTED'
      })
      .select()
      .single();
    if (error) throw error;

    logService.logEvent({
      level: 'info', event: 'business_project_request',
      message: 'New project request submitted', userId: req.user.id,
      metadata: { request_id: data.id, business_id: company.id }
    }).catch(() => {});

    res.status(201).json({ success: true, request: data });
  } catch (err) {
    console.error('[BUSINESS] request error:', err.message);
    res.status(500).json({ success: false, error: { code: 'REQUEST_FAILED', message: 'Failed to submit request.' } });
  }
});

router.get('/projects/requests', ...businessAuth, async (req, res) => {
  const company = await getOwnCompany(req.user.id);
  if (!company) return res.json({ success: true, requests: [] });
  const { data, error } = await adminClient
    .from('project_requests').select('*').eq('business_id', company.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: { code: 'LOAD_FAILED', message: 'Failed to load requests.' } });
  res.json({ success: true, requests: data || [] });
});

module.exports = { businessRouter: router };
