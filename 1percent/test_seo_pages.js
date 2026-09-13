/* SEO verification suite — routes, metadata, JSON-LD, sitemap, robots, links */
const BASE = 'http://localhost:3000';

const SEO_PAGES = [
  { path: '/',                title: '1Percent Rwanda — Technology Learning: Coding, AI, Robotics & More', h1: 'Turn curiosity about tech' },
  { path: '/courses',         title: '1Percent Courses — Technology Training in Rwanda: Coding, AI, Robotics', h1: 'Technology courses' },
  { path: '/pricing',         title: '1Percent Pricing — How Much Does It Cost to Learn?', h1: 'How much does it cost to learn' },
  { path: '/payments',        title: '1Percent Payment — How to Pay (MoMo, Airtel & Bank)', h1: 'How to pay for' },
  { path: '/getting-started', title: 'Getting Started with 1Percent — Join and Start Learning Free', h1: 'How to join' },
  { path: '/how-to-use',      title: 'How to Use 1Percent — Complete Beginner Guide', h1: 'How to use' },
  { path: '/install',         title: 'How to Install the 1% Learn Tools — CLI & VS Code Setup', h1: 'Get Started with 1% Expert' },
  { path: '/docs',            title: '1Percent Documentation — Learning & Platform Guide', h1: '1Percent' },
  { path: '/faq',             title: '1Percent FAQ — Frequently Asked Questions', h1: '1Percent' },
  { path: '/course/programming-fundamentals', title: null, h1: null }
];

function check(name, cond, extra) {
  console.log((cond ? '✓' : '✗ FAIL'), name, extra || '');
  return cond ? 0 : 1;
}

function extract(html, re) {
  const m = html.match(re);
  if (!m) return null;
  // Decode entities so comparisons work against plain-text expectations
  return m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

(async () => {
  let failures = 0;

  // 1. Every SEO page responds 200 with correct title/canonical/OG/description
  for (const p of SEO_PAGES) {
    const res = await fetch(BASE + p.path);
    if (res.status !== 200) { failures += check(`GET ${p.path}`, false, 'status=' + res.status); continue; }
    const html = await res.text();
    failures += check(`GET ${p.path} → 200`, true);

    const title = extract(html, /<title>([^<]+)<\/title>/);
    const desc = extract(html, /<meta name="description" content="([^"]*)"/);
    const canonical = extract(html, /<link rel="canonical" href="([^"]*)"/);
    const ogTitle = extract(html, /<meta property="og:title" content="([^"]*)"/);
    const ogDesc = extract(html, /<meta property="og:description" content="([^"]*)"/);
    const ogImage = extract(html, /<meta property="og:image" content="([^"]*)"/);

    if (p.title) {
      failures += check(`  ${p.path} unique title`, title === p.title, title);
      failures += check(`  ${p.path} canonical`, !!canonical, canonical);
      failures += check(`  ${p.path} meta description`, !!desc && desc.length > 50, desc ? desc.slice(0, 60) + '…' : 'MISSING');
      failures += check(`  ${p.path} OG title`, !!ogTitle);
      failures += check(`  ${p.path} OG description`, !!ogDesc);
      failures += check(`  ${p.path} OG image`, ogImage === 'https://learn.1percent.rw/og-image.png');
    } else {
      failures += check(`  ${p.path} has title`, !!title, title);
    }

    // JSON-LD validity
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const [i, block] of ldBlocks.entries()) {
      try {
        JSON.parse(block[1]);
        failures += check(`  ${p.path} JSON-LD #${i + 1} valid`, true);
      } catch (e) {
        failures += check(`  ${p.path} JSON-LD #${i + 1} valid`, false, e.message);
      }
    }
    if (p.path !== '/course/programming-fundamentals') {
      failures += check(`  ${p.path} has JSON-LD`, ldBlocks.length > 0);
      failures += check(`  ${p.path} exactly one h1`, (html.match(/<h1[\s>]/g) || []).length === 1);
    }
  }

  // 2. Dynamic /courses contains real course data
  const coursesRes = await fetch(BASE + '/courses');
  const coursesHtml = await coursesRes.text();
  failures += check('/courses contains "Programming Fundamentals"', coursesHtml.includes('Programming Fundamentals'));
  failures += check('/courses contains "Python Foundations"', coursesHtml.includes('Python Foundations'));
  failures += check('/courses contains "Robotics"', coursesHtml.includes('Robotics'));
  // Course count is dynamic — just require a healthy number of cards (≥10)
  failures += check('/courses renders many course cards', (coursesHtml.match(/class="course-card"/g) || []).length >= 10, String((coursesHtml.match(/class="course-card"/g) || []).length));
  failures += check('/courses placeholder replaced', !coursesHtml.includes('{{COURSE_CARDS}}') && !coursesHtml.includes('{{COURSE_COUNT}}'));

  // 3. Sitemap
  const smRes = await fetch(BASE + '/sitemap.xml');
  const sm = await smRes.text();
  failures += check('sitemap.xml → 200 xml', smRes.status === 200 && sm.startsWith('<?xml'));
  for (const loc of ['/', '/courses', '/pricing', '/payments', '/getting-started', '/how-to-use', '/install', '/docs', '/faq', '/contact', '/terms', '/privacy']) {
    failures += check(`  sitemap has ${loc}`, sm.includes(`<loc>https://learn.1percent.rw${loc}</loc>`));
  }
  failures += check('sitemap has course URLs', sm.includes('/course/programming-fundamentals'));
  failures += check('sitemap excludes /dashboard', !sm.includes('/dashboard'));
  failures += check('sitemap excludes /admin', !sm.includes('/admin'));
  failures += check('sitemap excludes /api', !sm.includes('/api'));

  // 4. Robots
  const robotsRes = await fetch(BASE + '/robots.txt');
  const robots = await robotsRes.text();
  failures += check('robots.txt → 200', robotsRes.status === 200);
  failures += check('robots.txt disallows /api/', robots.includes('Disallow: /api/'));
  failures += check('robots.txt disallows /mcp/', robots.includes('Disallow: /mcp/'));
  failures += check('robots.txt disallows /dashboard', robots.includes('Disallow: /dashboard'));
  failures += check('robots.txt sitemap ref', robots.includes('Sitemap: https://learn.1percent.rw/sitemap.xml'));

  // 5. Internal links resolve (crawl all <a href> on new pages)
  const pagesToCrawl = ['/pricing', '/payments', '/courses', '/getting-started', '/how-to-use', '/faq', '/docs'];
  const seen = new Set();
  for (const page of pagesToCrawl) {
    const html = await (await fetch(BASE + page)).text();
    const links = [...html.matchAll(/href="(\/[^"#]*)"/g)].map(m => m[1].split('?')[0]);
    for (const href of [...new Set(links)]) {
      if (seen.has(href)) continue;
      seen.add(href);
      if (href.startsWith('/api/') || href.startsWith('/mcp/') || href === '/payment-details') continue; // auth/endpoint pages — skip live check
      const r = await fetch(BASE + href, { method: 'GET' });
      failures += check(`link ${page} → ${href}`, r.status === 200 || r.status === 301 || r.status === 302, 'status=' + r.status);
    }
  }

  // 6. Existing functionality untouched
  const health = await fetch(BASE + '/api/health');
  failures += check('/api/health still works', health.status === 200);
  const paymentPage = await fetch(BASE + '/payment');
  failures += check('/payment (original) still works', paymentPage.status === 200);
  const studentMcp = await fetch(BASE + '/mcp/student/sk-mcp-invalid');
  failures += check('/mcp/student auth still rejects', studentMcp.status === 401);

  console.log(failures === 0 ? '\nALL SEO VERIFICATION TESTS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('VERIFY FAIL', e); process.exit(1); });
