/* ============================================================
   Sitemap Route
   ============================================================
   GET /sitemap.xml — dynamic sitemap served from the domain root.

   Combines:
   - the static public pages, and
   - every PUBLISHED course  →  /course/:slug

   Course URLs are queried from Supabase and cached in-memory for
   5 minutes, so Google always sees new courses without a deploy.

   GET /courses — SEO landing page listing every published course.
   Rendered SERVER-SIDE from the same cached course query so course
   names/descriptions are real static HTML (indexable without JS).
   ============================================================ */

const { Router } = require('express');
const { adminClient } = require('../config/database');

const router = Router();

const SITE_URL = 'https://learn.1percent.rw';

/* Static pages — keep in sync with frontend/robots.txt allowances.
   Authenticated app pages (dashboard, lab, playground, settings, admin)
   are deliberately excluded. */
const STATIC_PAGES = [
  { loc: '/',               changefreq: 'weekly',  priority: '1.0' },
  { loc: '/courses',        changefreq: 'weekly',  priority: '0.9' },
  { loc: '/pricing',        changefreq: 'monthly', priority: '0.9' },
  { loc: '/payments',       changefreq: 'monthly', priority: '0.8' },
  { loc: '/getting-started',changefreq: 'monthly', priority: '0.8' },
  { loc: '/how-to-use',     changefreq: 'monthly', priority: '0.8' },
  { loc: '/install',        changefreq: 'monthly', priority: '0.8' },
  { loc: '/docs',           changefreq: 'weekly',  priority: '0.8' },
  { loc: '/faq',            changefreq: 'monthly', priority: '0.7' },
  { loc: '/payment',        changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact',        changefreq: 'yearly',  priority: '0.5' },
  { loc: '/terms',          changefreq: 'yearly',  priority: '0.3' },
  { loc: '/privacy',        changefreq: 'yearly',  priority: '0.3' },
];

/* ── In-memory cache so we don't hammer Supabase on every crawl ── */
let courseCache = { urls: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getPublishedCourses() {
  if (courseCache.urls && Date.now() - courseCache.fetchedAt < CACHE_TTL_MS) {
    return courseCache.full || courseCache.urls.map(u => ({ slug: u.slug, title: u.title || u.slug, description: '', level: '', duration_weeks: 0 }));
  }
  try {
    const { data, error } = await adminClient
      .from('courses')
      .select('slug, title, description, level, duration_weeks, updated_at')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    courseCache = {
      full: (data || []).map(c => ({
        slug: c.slug,
        title: c.title,
        description: c.description || '',
        level: c.level || '',
        duration_weeks: c.duration_weeks || 0,
        lastmod: (c.updated_at || '').split('T')[0] || undefined
      })),
      urls: (data || []).map(c => ({ slug: c.slug, title: c.title, lastmod: (c.updated_at || '').split('T')[0] || undefined })),
      fetchedAt: Date.now()
    };
  } catch (err) {
    console.error('[SITEMAP] Course query failed:', err.message);
    // On failure: keep serving stale cache (if any), else no course URLs.
    if (!courseCache.urls) courseCache = { full: [], urls: [], fetchedAt: Date.now() };
  }
  return courseCache.full || courseCache.urls;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render the /courses landing page with real course data baked into the HTML. */
async function renderCoursesPage(req, res) {
  const fs = require('fs');
  const path = require('path');
  res.set('Cache-Control', 'public, max-age=300');

  try {
    const courses = await getPublishedCourses();
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'courses-page.html'), 'utf8');

    const cards = courses.map(c => {
      const level = escapeHtml(c.level);
      const weeks = c.duration_weeks ? `${c.duration_weeks} week${c.duration_weeks === 1 ? '' : 's'}` : '';
      return [
        `      <a class="course-card" href="/course/${escapeHtml(c.slug)}" aria-label="${escapeHtml(c.title)} course">`,
        `        <div class="course-top">`,
        `          ${level ? `<span class="course-level ${level.toLowerCase()}">${level}</span>` : '<span></span>'}`,
        `          ${weeks ? `<span class="course-weeks">${weeks}</span>` : ''}`,
        `        </div>`,
        `        <h3>${escapeHtml(c.title)}</h3>`,
        `        <p>${escapeHtml(c.description)}</p>`,
        `        <span class="course-open">View course →</span>`,
        `      </a>`
      ].join('\n');
    }).join('\n');

    res.send(template
      .replace('{{COURSE_COUNT}}', String(courses.length))
      .replace('{{COURSE_CARDS}}', cards));
  } catch (err) {
    console.error('[COURSES] Render failed:', err.message);
    res.status(500).send('Failed to load courses.');
  }
}

router.get('/courses', renderCoursesPage);

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.get('/sitemap.xml', async (req, res) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');

  const courseUrls = await getPublishedCourses().then(full => full.map(c => ({ slug: c.slug, lastmod: c.lastmod })));
  const today = new Date().toISOString().split('T')[0];

  const entries = [];

  for (const p of STATIC_PAGES) {
    entries.push(
      `  <url>\n    <loc>${xmlEscape(SITE_URL + p.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );
  }

  for (const c of courseUrls) {
    const lastmod = c.lastmod ? `\n    <lastmod>${xmlEscape(c.lastmod)}</lastmod>` : '';
    entries.push(
      `  <url>\n    <loc>${xmlEscape(`${SITE_URL}/course/${c.slug}`)}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.send(xml);
});

module.exports = router;
