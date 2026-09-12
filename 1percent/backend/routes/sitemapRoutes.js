/* ============================================================
   Sitemap Route
   ============================================================
   GET /sitemap.xml — dynamic sitemap served from the domain root.

   Combines:
   - the static public pages, and
   - every PUBLISHED course  →  /course/:slug

   Course URLs are queried from Supabase and cached in-memory for
   5 minutes, so Google always sees new courses without a deploy.
   ============================================================ */

const { Router } = require('express');
const { adminClient } = require('../config/database');

const router = Router();

const SITE_URL = 'https://learn.1percent.rw';

/* Static pages — keep in sync with frontend/robots.txt allowances */
const STATIC_PAGES = [
  { loc: '/',          changefreq: 'weekly',  priority: '1.0' },
  { loc: '/payment',   changefreq: 'monthly', priority: '0.9' },
  { loc: '/install',   changefreq: 'monthly', priority: '0.8' },
  { loc: '/docs',      changefreq: 'weekly',  priority: '0.8' },
  { loc: '/contact',   changefreq: 'yearly',  priority: '0.5' },
  { loc: '/terms',     changefreq: 'yearly',  priority: '0.3' },
  { loc: '/privacy',   changefreq: 'yearly',  priority: '0.3' },
];

/* ── In-memory cache so we don't hammer Supabase on every crawl ── */
let courseCache = { urls: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getPublishedCourseUrls() {
  if (courseCache.urls && Date.now() - courseCache.fetchedAt < CACHE_TTL_MS) {
    return courseCache.urls;
  }
  try {
    const { data, error } = await adminClient
      .from('courses')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    courseCache = {
      urls: (data || []).map(c => ({ slug: c.slug, lastmod: (c.updated_at || '').split('T')[0] || undefined })),
      fetchedAt: Date.now()
    };
  } catch (err) {
    console.error('[SITEMAP] Course query failed:', err.message);
    // On failure: keep serving stale cache (if any), else no course URLs.
    if (!courseCache.urls) courseCache = { urls: [], fetchedAt: Date.now() };
  }
  return courseCache.urls;
}

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

  const courseUrls = await getPublishedCourseUrls();
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
