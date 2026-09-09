-- ============================================================
-- Migration: Premium course support
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add is_premium to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 2. Add is_free_preview to lessons (lesson 1 of premium courses is free)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_free_preview boolean NOT NULL DEFAULT false;

-- 3. Mark Tech in Business as premium
UPDATE public.courses SET is_premium = true WHERE slug = 'tech-in-business';

-- 4. Mark first lesson of each premium course as free preview
UPDATE public.lessons SET is_free_preview = true
WHERE id IN (
  SELECT l.id FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.is_premium = true
  AND l.sort_order = (
    SELECT MIN(l2.sort_order) FROM public.lessons l2 WHERE l2.course_id = l.course_id
  )
);

-- Done.
