-- ============================================================
-- Seed: To-Do App: JS Fundamentals (Testing) — Pilot Course
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- The course is is_published = false so it won't appear on the
-- public course listing, but can be accessed via direct URL.

DO $$
DECLARE
  course_id UUID := uuid_generate_v4();
  lesson_id UUID := uuid_generate_v4();
  challenge1_id UUID := uuid_generate_v4();
  challenge2_id UUID := uuid_generate_v4();
BEGIN
  -- 1. Insert course
  INSERT INTO public.courses (
    id, slug, title, description, icon, level, duration_weeks,
    is_published, sort_order
  ) VALUES (
    course_id,
    'todo-app-js-fundamentals-testing',
    'To-Do App: JS Fundamentals (Testing)',
    'Build a to-do app step by step while learning core JavaScript fundamentals: DOM manipulation, loops, event handling, and basic testing mindset.',
    'code',
    'beginner',
    1,
    false,
    16
  );

  -- 2. Insert lesson — Checkpoint 1: Render a Task List
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson_id,
    course_id,
    'Checkpoint 1: Render a Task List',
    'A page that displays a hardcoded list of tasks — no add/delete yet, just getting data onto the screen.',
    E'## What you''ll build\n\nA page that displays a hardcoded list of tasks — no add/delete yet, just getting data onto the screen.\n\n## Why this matters\n\nEvery dynamic web app does one thing constantly — take data (an array, an object) and turn it into HTML the user can see. This is that skill in its simplest form.\n\n## Concepts\n\n- `document.querySelector()`\n- `document.createElement()`\n- `.textContent`\n- `.appendChild()`\n- Looping with `.forEach()`\n\n## Starter HTML\n\n```html\n<ul id="task-list"></ul>\n```\n\n## Worked example\n\n```javascript\nconst tasks = ["Buy groceries", "Walk the dog", "Finish homework"];\nconst list = document.querySelector("#task-list");\n\ntasks.forEach(function(task) {\n  const li = document.createElement("li");\n  li.textContent = task;\n  list.appendChild(li);\n});\n```\n\n> **Ask:** what happens if you forget `appendChild`?\n>\n> Nothing renders — the element exists in memory but isn''t on the page. This is the #1 beginner bug.\n\n## Modify-this exercise\n\nAdd a 4th task, `"Read a book"`, to the array. Don''t touch the loop. Confirm it renders as a 4th `<li>`.',
    'reading',
    15,
    1,
    true
  );

  -- 3. Challenge 1 — Fix the missing appendChild
  INSERT INTO public.challenges (
    id, course_id, title, description, difficulty, challenge_type,
    coins_reward, sort_order, starter_code, expected_output, is_active,
    starter_html, test_cases
  ) VALUES (
    challenge1_id,
    course_id,
    'Fix the missing appendChild',
    'The list stays empty. The starter code creates <li> elements but never attaches them to the page. Find the missing line and fix it so the tasks appear.',
    'easy',
    'javascript',
    10,
    1,
    E'const tasks = ["Call mom", "Clean room"];\nconst list = document.querySelector("#task-list");\n\ntasks.forEach(function(task) {\n  const li = document.createElement("li");\n  li.textContent = task;\n  // missing something here\n});',
    '',
    true,
    '<ul id="task-list"></ul>',
    '[{"selector":"#task-list","property":"children.length","expected":2,"description":"Task list should have 2 items"},{"selector":"#task-list li:nth-child(1)","property":"textContent","expected":"Call mom","description":"First item should be Call mom"},{"selector":"#task-list li:nth-child(2)","property":"textContent","expected":"Clean room","description":"Second item should be Clean room"}]'::jsonb
  );

  -- 4. Challenge 2 — Render colors from scratch
  INSERT INTO public.challenges (
    id, course_id, title, description, difficulty, challenge_type,
    coins_reward, sort_order, starter_code, expected_output, is_active,
    starter_html, test_cases
  ) VALUES (
    challenge2_id,
    course_id,
    'Render colors from scratch',
    'Given `const colors = ["red", "green", "blue"];` and an empty `<ul id="color-list"></ul>`, write the JavaScript that renders each color as a list item.',
    'easy',
    'javascript',
    10,
    2,
    '',
    '',
    true,
    '<ul id="color-list"></ul>',
    '[{"selector":"#color-list","property":"children.length","expected":3,"description":"Color list should have 3 items"},{"selector":"#color-list li:nth-child(1)","property":"textContent","expected":"red","description":"First color should be red"},{"selector":"#color-list li:nth-child(2)","property":"textContent","expected":"green","description":"Second color should be green"},{"selector":"#color-list li:nth-child(3)","property":"textContent","expected":"blue","description":"Third color should be blue"}]'::jsonb
  );

END $$;
