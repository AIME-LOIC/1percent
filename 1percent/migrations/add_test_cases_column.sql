-- ============================================================
-- Migration: Add test_cases jsonb column to public.challenges
-- ============================================================
-- test_cases is an array of objects like:
--   { "selector": "#task-list", "property": "children.length", "expected": 2 }
-- When test_cases is non-empty, the JS grading engine executes
-- the submitted code in a sandboxed vm and checks each test case.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS test_cases jsonb NOT NULL DEFAULT '[]'::jsonb;

-- starter_html: HTML injected into the DOM before running submitted code.
-- The user's code will see these elements when it calls querySelector.
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS starter_html text NOT NULL DEFAULT '';
