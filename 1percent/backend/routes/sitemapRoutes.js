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

/** Render the /courses landing page with real course data baked into the HTML.
    Only the first FEATURED_COURSE_COUNT courses are expanded; the rest load
    inside a collapsed <details> element so the page stays scannable while
    every course remains in the static HTML for search engines. */
const FEATURED_COURSE_COUNT = 6;

async function renderCoursesPage(req, res) {
  const fs = require('fs');
  const path = require('path');
  res.set('Cache-Control', 'public, max-age=300');

  try {
    const courses = await getPublishedCourses();
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'courses-page.html'), 'utf8');

    const renderCard = c => {
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
    };

    const featured = courses.slice(0, FEATURED_COURSE_COUNT);
    const rest = courses.slice(FEATURED_COURSE_COUNT);

    const featuredCards = featured.map(renderCard).join('\n');
    const restCards = rest.map(renderCard).join('\n');

    let restBlock = '';
    if (rest.length) {
      restBlock = [
        '',
        '    <details class="course-more">',
        `      <summary>Show all ${rest.length} more courses</summary>`,
        `      <div class="course-grid course-grid-more">`,
        restCards,
        '      </div>',
        '    </details>'
      ].join('\n');
    }

    res.send(template
      .replace('{{COURSE_COUNT}}', String(courses.length))
      .replace('{{COURSE_CARDS}}', featuredCards + restBlock));
  } catch (err) {
    console.error('[COURSES] Render failed:', err.message);
    res.status(500).send('Failed to load courses.');
  }
}

router.get('/courses', renderCoursesPage);

/* ── Public course detail pages: /course/:slug ────────────────────
   Server-rendered static HTML (indexable without JS) from the same
   cached course query. Fills the course-page.html template. */
async function getCourseBySlug(slug) {
  const courses = await getPublishedCourses();
  const found = courses.find(c => c.slug === slug);
  if (!found) return null;

  // Lesson count + full description for this course (single query)
  try {
    const { data, error } = await adminClient
      .from('courses')
      .select('description, lessons(count)')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();
    if (!error && data) {
      return {
        ...found,
        description: data.description || found.description,
        lesson_count: (data.lessons && data.lessons[0] && data.lessons[0].count) || 0
      };
    }
  } catch (err) {
    console.error('[COURSES] Detail query failed:', err.message);
  }
  return { ...found, lesson_count: 0 };
}

async function renderCoursePage(req, res, next) {
  // On the learn subdomain, /course/:slug is the in-app course viewer —
  // only the main host serves the public SEO page.
  if (req.isLearnSubdomain) return next();
  const fs = require('fs');
  const path = require('path');
  res.set('Cache-Control', 'public, max-age=300');

  try {
    const course = await getCourseBySlug(String(req.params.slug || '').toLowerCase());
    if (!course || !course.slug) return res.status(404).sendFile(path.join(__dirname, '..', '..', 'frontend', '404.html'));

    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'course-page.html'), 'utf8');

    const title = course.title || course.slug;
    const desc = course.description || `Learn ${title} with hands-on lessons and graded challenges at 1Percent Rwanda.`;
    const descShort = desc.length > 160 ? desc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : desc;
    const SITE_URL = 'https://learn.1percent.rw';
    const courseUrl = `${SITE_URL}/course/${course.slug}`;

    const level = (course.level || '').toLowerCase();
    const levelPill = level
      ? `<span class="pill level ${level}">${escapeHtml(course.level)}</span>`
      : '';
    const weeks = course.duration_weeks ? `${course.duration_weeks} week${course.duration_weeks === 1 ? '' : 's'}` : 'Self-paced';
    const lessonCount = course.lesson_count ? `${course.lesson_count} lesson${course.lesson_count === 1 ? '' : 's'}` : 'Structured lessons';

    // educationalLevel only when the level is a known value
    const knownLevels = ['beginner', 'intermediate', 'advanced'];
    const levelJsonld = knownLevels.includes(level)
      ? `,
      "educationalLevel": "${level}"`
      : '';

    const jsonEscape = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
    const htmlEscape = escapeHtml;

    res.send(template
      .replace(/\{\{COURSE_TITLE_JSON\}\}/g, jsonEscape(title))
      .replace(/\{\{COURSE_DESC_JSON\}\}/g, jsonEscape(descShort))
      .replace(/\{\{LEVEL_JSONLD\}\}/g, levelJsonld)
      .replace(/\{\{LEVEL_PILL\}\}/g, levelPill)
      .replace(/\{\{DURATION_TEXT\}\}/g, escapeHtml(weeks))
      .replace(/\{\{LESSON_COUNT\}\}/g, escapeHtml(lessonCount))
      .replace(/\{\{COURSE_DESCRIPTION\}\}/g, htmlEscape(desc))
      .replace(/\{\{COURSE_DESC_SHORT\}\}/g, htmlEscape(descShort))
      .replace(/\{\{COURSE_TITLE\}\}/g, htmlEscape(title))
      .replace(/\{\{COURSE_SLUG\}\}/g, htmlEscape(course.slug))
      .replace(/\{\{SITE_URL\}\}/g, SITE_URL));
  } catch (err) {
    console.error('[COURSES] Detail render failed:', err.message);
    res.status(500).send('Failed to load course.');
  }
}

router.get('/course/:slug', renderCoursePage);

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
