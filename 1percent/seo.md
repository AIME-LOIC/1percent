# SEO Guide — learn.1percent.rw

Everything done to make this site discoverable, why it was done, and
**what you should do next**. Written for the site owner.

---

## 1. Positioning (what we tell Google you are)

1Percent is **not** a "software development only" school. It teaches
**everything in tech** — coding, web development, AI tools, cybersecurity,
DevOps, robotics, tech in business — for learners **10 and older**
(parental consent under 18).

This positioning is baked into the homepage title, meta description, H1,
and every SEO page. Keep it consistent everywhere you write new content.

---

## 2. Page inventory (what exists now)

| Route | Purpose | Title |
|---|---|---|
| `/` | Overview + hub | 1Percent Rwanda — Technology Learning: Coding, AI, Robotics & More |
| `/courses` | All 18 courses (server-rendered, first 6 expanded, rest in a "Show more" expander) | 1Percent Courses — Technology Training in Rwanda |
| `/course/:slug` | Public page per course (server-rendered from Supabase) | e.g. "Python Foundations — 1Percent Course" |
| `/pricing` | Answers "How much does it cost?" | 1Percent Pricing — How Much Does It Cost to Learn? |
| `/payments` | Answers "How do I pay?" (MoMo/Airtel *182# → 1PERCENT, bank, card) | 1Percent Payment — How to Pay (MoMo, Airtel & Bank) |
| `/getting-started` | Answers "How do I join?" | Getting Started with 1Percent — Join & Start Learning |
| `/how-to-use` | Answers "How do I use it?" | How to Use 1Percent — Complete Beginner Guide |
| `/install` | Answers "How do I install it?" | How to Install 1Percent — Installation Guide |
| `/docs` | Documentation hub | 1Percent Documentation — Learning & Platform Guide |
| `/faq` | All the common questions | 1Percent FAQ — Frequently Asked Questions |
| `/terms` `/privacy` | Ages 10+ policy, parental consent | — |

**Everything above is plain server-rendered HTML** — no JavaScript needed
for Google to read it.

---

## 3. Technical SEO (already done)

### Metadata
Every public page has unique `<title>`, meta description, canonical URL,
Open Graph + Twitter tags, and `robots: index,follow`. Private pages
(dashboard, settings, admin, lab, playground) are `noindex`.

### robots.txt
- `frontend/robots.txt` — allows the public pages, blocks `/mcp/`, the
  app pages, and API paths. Sitemap declared.

### sitemap.xml
- Generated **dynamically** at `/sitemap.xml` from
  `backend/routes/sitemapRoutes.js`. Static pages + every published
  course (`/course/:slug`). New courses appear automatically within
  **5 minutes** (cache TTL) — or instantly: the admin panel's course
  create/update/delete actions call `invalidateCourseCache()`.

### Structured data (JSON-LD) — all validated
| Page | Schema |
|---|---|
| Home | EducationalOrganization + WebSite |
| Every page | BreadcrumbList + WebPage |
| Pricing, Payments, FAQ | FAQPage (visible text matches the JSON exactly) |
| How-to-use, Getting-started, Install | HowTo |
| Courses + each course page | CollectionPage + ItemList / Course |

### Internal linking
Home → Getting Started / Courses / Pricing / Docs. Docs hub links every
guide. Pricing ↔ Payments. Courses → per-course pages. Footer links on
every page. All anchor text is descriptive (never "click here").

### Templates protected
`/courses-page.html` and `/course-page.html` return 404 directly — they
are only served filled-in through their real routes, so Google can never
index `{{PLACEHOLDER}}` text.

---

## 4. What YOU should do next (highest impact first)

1. **Google Search Console** (if not done):
   - Go to https://search.google.com/search-console → add property
     `learn.1percent.rw` → verify via DNS TXT record.
   - Submit `https://learn.1percent.rw/sitemap.xml`.
   - Use **URL Inspection → Request Indexing** on `/`, `/pricing`,
     `/courses`, `/faq`, and your 3 most important course pages.
2. **Bing Webmaster Tools** — same process at
   https://www.bing.com/webmasters (it imports from Search Console).
3. **Bank transfer details** — search the repo for `TODO(business)`
   and replace the placeholders in `/payments` and payment-details
   with the real account name/number/bank.
4. **Get real testimonials** — students submit in Settings →
   "My Testimonial"; you approve in Admin → Testimonials. Approved
   quotes appear on the homepage automatically. 3–5 quotes is a
   strong trust signal.
5. **Write one lesson-page per popular question** — e.g. "How long
   does it take to learn Python in Rwanda" as a blog/lesson. Each
   question people actually Google is a page.
6. **Get backlinks** — ask Rwanda tech communities, schools, and
   directories to link to `learn.1percent.rw`. This is the single
   biggest ranking factor after content.
7. **Keep course descriptions rich** — the course pages pull
   description text straight from Supabase. 2–3 sentences with real
   keywords ("learn Python in Kigali, Rwanda") beats one-liners.
8. **Monitor** — Search Console → Performance, monthly. Look for
   queries with impressions but low clicks, then improve those
   titles/descriptions.

### Don'ts
- Never buy links or use AI-spam content — Google penalizes both.
- Don't duplicate course descriptions between courses.
- Don't rename routes that already get traffic (301-redirect if you must).

---

## 5. How to keep SEO healthy when editing

| You change… | SEO effect | Action needed |
|---|---|---|
| Add/publish a course | Appears in `/courses`, `/course/:slug`, sitemap | None (automatic) |
| Edit a course title/description | Course page + cards update on next request | None (cache busts automatically) |
| Add a new static page | — | Add to `STATIC_PAGES` in `sitemapRoutes.js`, add route in `index.js`, add unique title/desc/canonical/OG, add BreadcrumbList JSON-LD |
| Rename a route | Old URL breaks | Add `301` redirect in the legacy section of `index.js` |
| Change pricing | `/pricing` + FAQ JSON-LD | Update BOTH the visible text and the JSON-LD block so they match |

---

## 6. Quick verification checklist

```bash
node test_seo_pages.js      # full suite: routes, metadata, JSON-LD, sitemap
node test_e2e_updates.js    # cache-bust + pages sanity
```

Manual spot-checks:
- `curl -s localhost:3000/course/python-foundations | grep '<title>'`
- `curl -s localhost:3000/sitemap.xml | grep -c '<loc>'` (should grow with courses)
- https://search.google.com/test/rich-results on any public URL (FAQ/HowTo/Course schema)

---

## 7. The AI reviewer (related, but not SEO)

The submission grader is a **local, trained-on-your-courses engine** —
no external AI, no API keys, nothing leaves your server. It marks
submissions but **nothing is applied until you approve it** in
Admin → AI Reviews. See `backend/ai/` (tokenizer, features, train,
reviewer) and `docs` in that folder. Retrain after big course changes
with the **Rebuild model** button in the admin panel.
