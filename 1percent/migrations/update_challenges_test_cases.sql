-- ============================================================
-- Migration: Set test_cases and starter_html on the two seeded
-- "To-Do App: JS Fundamentals (Testing)" challenges.
-- ============================================================
-- Prerequisite: the ALTER TABLE from add_test_cases_column.sql
-- must have been run first, and the two challenges must exist.

UPDATE public.challenges
SET
  starter_html = '<ul id="task-list"></ul>',
  test_cases = '[
    {
      "selector": "#task-list",
      "property": "children.length",
      "expected": 2,
      "description": "Task list should have 2 items"
    },
    {
      "selector": "#task-list li:nth-child(1)",
      "property": "textContent",
      "expected": "Call mom",
      "description": "First item should be Call mom"
    },
    {
      "selector": "#task-list li:nth-child(2)",
      "property": "textContent",
      "expected": "Clean room",
      "description": "Second item should be Clean room"
    }
  ]'::jsonb
WHERE title = 'Fix the missing appendChild';

UPDATE public.challenges
SET
  starter_html = '<ul id="color-list"></ul>',
  test_cases = '[
    {
      "selector": "#color-list",
      "property": "children.length",
      "expected": 3,
      "description": "Color list should have 3 items"
    },
    {
      "selector": "#color-list li:nth-child(1)",
      "property": "textContent",
      "expected": "red",
      "description": "First color should be red"
    },
    {
      "selector": "#color-list li:nth-child(2)",
      "property": "textContent",
      "expected": "green",
      "description": "Second color should be green"
    },
    {
      "selector": "#color-list li:nth-child(3)",
      "property": "textContent",
      "expected": "blue",
      "description": "Third color should be blue"
    }
  ]'::jsonb
WHERE title = 'Render colors from scratch';
