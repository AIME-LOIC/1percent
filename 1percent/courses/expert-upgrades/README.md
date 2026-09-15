# Expert Layer — Course Content Upgrades

Grounded expert-practitioner content appended to every lesson of all 18
published courses. This answers the "courses are weak" feedback with a
repeatable system: each course gets a layer of what professionals actually
do — not more theory.

## What gets appended to each lesson

| Section | Purpose |
|---|---|
| What Professionals Do Differently | The mental-model gap between beginner and expert |
| How Professionals Actually Work | Real workflows, not textbook steps |
| Tools of the Trade | Table of tools/practices experts rely on, with why |
| Insider Moves | 5–6 tactics not found in tutorials |
| Field Scenarios | Real situations: what a beginner does vs an expert, and why it matters |
| Expert Confessions | Mistakes even pros make (calibrates expectations) |
| A Day in the Life | Narrative of the role for motivation + realism |
| The Hiring Manager's Lens | How this skill is tested in interviews |
| Your First Job, In Reality | What month one on the job actually looks like |
| Expert-Level Exercises | Practice that builds expert habits |
| Go Deeper | Curated books/docs/references |
| The 1% difference | One-line takeaway closing the lesson |

## Files

- `lib/template.js` — shared markdown renderer (edit structure here)
- `<course-slug>.js` — per-course expert content (edit content here)
- `generate-expert-sql.js` — emits `migrations/upgrade_course_expertise.sql`

## Editing content

1. Edit the relevant `<course-slug>.js` file (plain strings + arrays).
2. Regenerate:

```bash
node courses/expert-upgrades/generate-expert-sql.js
```

3. Run `migrations/upgrade_course_expertise.sql` in the Supabase SQL Editor.

The migration is **re-runnable**: an existing expert layer is replaced, not
duplicated, and original lesson content is never modified.

## Course slugs covered

programming-fundamentals, git-github, command-line-linux, backend-development,
frontend-development, databases, auth-security, system-design,
testing-debugging, devops-basics, ai-coding-tools, capstone-project,
reading-codebases, technical-communication, problem-solving,
python-foundations, tech-in-business, robotics

## Research grounding

Content is based on current practitioner sources, per course: OWASP Top
10:2025 + NIST SP 800-63B (security), Google SRE + DORA (devops/system
design), State of JS 2025 (frontend/programming), pg_stat_statements +
EXPLAIN ANALYZE workflows (databases), Kent Beck TDD + flaky-test management
(testing), Diátaxis + BLUF (communication), Michael Feathers (legacy code),
Brooks' Law + MoSCoW (constraints), pythonic idiom + PEP 8/668 (Python),
mobile-money fraud patterns in East Africa (Tech in Business), and
professional embedded practice — millis() state machines, watchdogs,
common-ground discipline (Robotics).
