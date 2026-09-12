-- ============================================================
-- Seed: Python Foundations — Think Like a Programmer
-- ============================================================
-- Run this in the Supabase SQL Editor.
--
-- The course is published (is_published = true) so it appears in the
-- public course listing and in /sitemap.xml automatically.
--
-- All 6 challenges use `expected_output` — the grader EXECUTES the
-- submitted Python with python3 and compares stdout, so students must
-- write real working code (no keyword guessing).
--
-- Re-runnable: it deletes the course by slug first (including its
-- challenges/lessons), then re-inserts everything fresh.
--
-- NOTE: variables are prefixed v_ on purpose — a variable named
-- `course_id` collides with the challenges.course_id column inside
-- PL/pgSQL ("column reference is ambiguous").

DO $$
DECLARE
  v_course_id UUID := uuid_generate_v4();
  v_l1 UUID := uuid_generate_v4();
  v_l2 UUID := uuid_generate_v4();
  v_l3 UUID := uuid_generate_v4();
  v_l4 UUID := uuid_generate_v4();
  v_l5 UUID := uuid_generate_v4();
  v_l6 UUID := uuid_generate_v4();
BEGIN
  -- Make re-runs safe: drop any previous version of this course.
  -- Challenges must be deleted explicitly: their FK is ON DELETE SET NULL,
  -- so deleting only the course would leave them orphaned.
  DELETE FROM public.challenges
   WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations');
  DELETE FROM public.lessons
   WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations');
  DELETE FROM public.courses WHERE slug = 'python-foundations';

  -- 1. Insert course
  INSERT INTO public.courses (
    id, slug, title, description, icon, level, duration_weeks,
    is_published, sort_order
  ) VALUES (
    v_course_id,
    'python-foundations',
    'Python Foundations: Think Like a Programmer',
    'Learn real Python from zero: printing, variables, lists, loops, and functions — by writing and running actual code in every lesson.',
    'terminal',
    'beginner',
    3,
    true,
    20
  );

  -- 2. Lessons
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES
  -- ── Lesson 1 ──────────────────────────────────────────────
  (
    v_l1, v_course_id,
    'Your First Python Program',
    'Make the computer talk: print(), strings, and comments.',
    E'## What you''ll learn\n\nEvery program starts with output. In Python, one function does it all: `print()`.\n\n## Concepts\n\n- `print()` — write text to the screen\n- Strings — text wrapped in quotes (`"like this"`)\n- Comments — lines starting with `#`, ignored by Python\n\n## Worked example\n\n```python\nprint("Hello, world!")\nprint("Python is fun")\n# this line is a comment — Python ignores it\n```\n\nOutput:\n\n```\nHello, world!\nPython is fun\n```\n\n> **Ask:** what happens if you forget the quotes?\n>\n> `print(Hello)` is a **NameError** — Python looks for a *variable* named Hello. Quotes turn it into text.\n\n## Modify-this exercise\n\nAdd a third `print()` that outputs your name. Run it — you just wrote a real program.',
    'reading', 20, 1, true
  ),
  -- ── Lesson 2 ──────────────────────────────────────────────
  (
    v_l2, v_course_id,
    'Variables & Data Types',
    'Store and label data: numbers, text, booleans, and f-strings.',
    E'## What you''ll learn\n\nVariables give data a name, so programs can remember and reuse values.\n\n## Concepts\n\n- **int** — whole numbers: `19`\n- **float** — decimals: `3.14`\n- **str** — text: `"Amina"`\n- **bool** — `True` / `False`\n- f-strings — inject variables into text: `f"Hi {name}"`\n- `type()` — inspect what kind of value you have\n\n## Worked example\n\n```python\nname = "Amina"\nage = 19\nheight = 1.68\nis_student = True\n\nprint(f"{name} is {age} years old")\nprint(type(age))\n```\n\nOutput:\n\n```\nAmina is 19 years old\n<class ''int''>\n```\n\n> **Ask:** what''s the difference between `print(age)` and `print("age")`?\n>\n> The first prints the **value** (19). The second prints the literal word age — quotes make it text.\n\n## Modify-this exercise\n\nCreate variables for a friend''s name and age, then print one sentence about them using an f-string.',
    'reading', 20, 2, true
  ),
  -- ── Lesson 3 ──────────────────────────────────────────────
  (
    v_l3, v_course_id,
    'Lists & Dictionaries',
    'Collect many values: ordered lists and labelled dictionaries.',
    E'## What you''ll learn\n\nReal programs handle many values at once. Python''s two workhorses: **lists** (ordered) and **dictionaries** (labelled).\n\n## Concepts\n\n- Lists — `scores = [45, 82, 91]`, index from **0**: `scores[0]`\n- Slicing — `scores[0:2]` gives the first two\n- `len()`, `max()`, `min()`, `sum()` — instant answers\n- Dictionaries — `student = {"name": "Amina", "age": 19}`, read with `student["name"]`\n\n## Worked example\n\n```python\nscores = [45, 82, 67, 91, 73]\nprint(len(scores))   # 5 items\nprint(max(scores))   # the biggest\nprint(scores[0])     # first item\n\nstudent = {"name": "Amina", "track": "Python"}\nprint(student["name"])\n```\n\n> **Ask:** why does `scores[5]` crash when the list has 5 items?\n>\n> Indexing starts at **0**, so valid positions are 0–4. `scores[5]` is an **IndexError**.\n\n## Modify-this exercise\n\nAdd your own score to the list, then print the new length and the new maximum.',
    'reading', 25, 3, true
  ),
  -- ── Lesson 4 ──────────────────────────────────────────────
  (
    v_l4, v_course_id,
    'Making Decisions: if / elif / else',
    'Branch your code based on conditions.',
    E'## What you''ll learn\n\nPrograms choose paths. `if` runs code only when a condition is true.\n\n## Concepts\n\n- Comparisons — `==`, `!=`, `>`, `<`, `>=`, `<=`\n- `if` / `elif` / `else` — pick one branch\n- **Indentation is the syntax** — 4 spaces define what''s inside the branch\n- Combining conditions — `and`, `or`, `not`\n\n## Worked example\n\n```python\nscore = 78\n\nif score >= 90:\n    print("Grade: A")\nelif score >= 70:\n    print("Grade: B")\nelse:\n    print("Keep practising!")\n```\n\nOutput:\n\n```\nGrade: B\n```\n\n> **Ask:** what happens if you write `if score = 78:`?\n>\n> A **SyntaxError**. One `=` assigns a value; two `==` compares. The #1 beginner bug in every language.\n\n## Modify-this exercise\n\nChange `score` to 95, then to 30, and predict the output **before** running. Add a new branch: scores below 50 print "Grade: F".',
    'reading', 25, 4, true
  ),
  -- ── Lesson 5 ──────────────────────────────────────────────
  (
    v_l5, v_course_id,
    'Loops: for and while',
    'Repeat work without repeating yourself.',
    E'## What you''ll learn\n\nLoops are how programs do repetitive work: process every item, count, retry.\n\n## Concepts\n\n- `for` + `range(n)` — repeat n times (counts 0 … n−1)\n- Looping a list directly — `for s in scores:`\n- `while` — repeat **while** a condition holds\n- `break` — exit early; `continue` — skip to next round\n\n## Worked example\n\n```python\nfor i in range(3):\n    print(i)\n\nscores = [45, 82, 91]\nfor s in scores:\n    print(s * 2)\n\ncount = 3\nwhile count > 0:\n    print(count)\n    count = count - 1\n```\n\n> **Ask:** what happens if you never decrease `count` in the while loop?\n>\n> An **infinite loop** — the condition stays true forever. Always make sure something moves the loop toward its end.\n\n## Modify-this exercise\n\nPrint the 3× table from 1 to 5 (`3 6 9 12 15`), one number per line, with a `for` loop.',
    'reading', 25, 5, true
  ),
  -- ── Lesson 6 ──────────────────────────────────────────────
  (
    v_l6, v_course_id,
    'Functions: Build Your Own Tools',
    'Package logic into reusable, testable blocks with def and return.',
    E'## What you''ll learn\n\nFunctions let you name a piece of logic once and use it everywhere.\n\n## Concepts\n\n- `def name(parameters):` — define a function\n- `return` — send a value back to the caller (printing is not returning!)\n- Arguments — the values you pass in\n- Functions run only when **called**: `name(4, 5)`\n\n## Worked example\n\n```python\ndef area(width, height):\n    return width * height\n\nresult = area(4, 5)\nprint(result)          # 20\nprint(area(7, 2))      # 14\n```\n\n> **Ask:** what''s the difference between `return` and `print` inside a function?\n>\n> `print` shows a value on screen and gives nothing back. `return` hands the value to whoever called the function — so it can be stored, reused, or tested. Tools should `return`.\n\n## Modify-this exercise\n\nWrite `perimeter(width, height)` and print the perimeter of a 4×5 rectangle. Then print both area and perimeter in one f-string.',
    'reading', 30, 6, true
  );

  -- 3. Challenges — all graded by REAL EXECUTION (python3 runs the code,
  --    stdout is compared to expected_output). Strings with \n are E'' literals.
  INSERT INTO public.challenges (
    id, course_id, title, description, difficulty, challenge_type,
    coins_reward, sort_order, starter_code, expected_output, is_active
  ) VALUES
  (
    uuid_generate_v4(), v_course_id,
    'Say hello to Python',
    'Write your first real program: make Python print exactly Hello, Python! (one line).',
    'easy', 'python', 10, 1,
    E'# Print exactly: Hello, Python!\n',
    'Hello, Python!', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Your profile card',
    E'The variables name and age are given. Use them to print exactly two lines:\nName: Amina\nAge: 19\nTip: an f-string makes this easy.',
    'easy', 'python', 10, 2,
    E'name = "Amina"\nage = 19\n\n# Print "Name: Amina" then "Age: 19"\n',
    E'Name: Amina\nAge: 19', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Top of the leaderboard',
    'Given the scores list, print the highest score (just the number). Try max() — or find it with a loop for extra practice.',
    'easy', 'python', 10, 3,
    E'scores = [45, 82, 67, 91, 73]\n\n# Print the highest score\n',
    '91', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Even or odd checker',
    E'The variable number is given. Use an if/else to print exactly: 7 is odd\nIf the number were even your code should print "<number> is even".',
    'easy', 'python', 10, 4,
    E'number = 7\n\n# Print "7 is odd" (or "<number> is even" for even numbers)\n',
    '7 is odd', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Countdown',
    'Print a countdown from 3 to 1 (one number per line), then Lift off! on the last line. Use a loop — not four print statements.',
    'medium', 'python', 10, 5,
    E'# Print:\n# 3\n# 2\n# 1\n# Lift off!\n',
    E'3\n2\n1\nLift off!', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Area calculator function',
    'Write a function area(width, height) that RETURNS the rectangle area (don''t print inside it). Then the two given print lines will output 20 and 14.',
    'medium', 'python', 10, 6,
    E'def area(width, height):\n    # return the area, don''t print it\n    pass\n\nprint(area(4, 5))\nprint(area(7, 2))\n',
    E'20\n14', true
  );

  -- Sanity check: report what was created
  RAISE NOTICE 'Python course seeded: % lessons, % challenges',
    (SELECT count(*) FROM public.lessons WHERE course_id = v_course_id),
    (SELECT count(*) FROM public.challenges WHERE course_id = v_course_id);
END $$;
