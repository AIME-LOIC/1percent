-- ============================================================
-- FIX: Add ALL missing columns to certificates table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add all potentially missing columns
DO $$ 
BEGIN
  -- completed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'completed_at') THEN
    ALTER TABLE public.certificates ADD COLUMN completed_at timestamptz;
  END IF;
  
  -- learner_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'learner_name') THEN
    ALTER TABLE public.certificates ADD COLUMN learner_name text not null default '';
  END IF;
  
  -- course_title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'course_title') THEN
    ALTER TABLE public.certificates ADD COLUMN course_title text not null default '';
  END IF;
  
  -- course_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'course_level') THEN
    ALTER TABLE public.certificates ADD COLUMN course_level text not null default 'beginner';
  END IF;
  
  -- duration_weeks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'duration_weeks') THEN
    ALTER TABLE public.certificates ADD COLUMN duration_weeks int not null default 0;
  END IF;
END $$;

-- Backfill from existing data
UPDATE public.certificates 
SET completed_at = issued_at 
WHERE completed_at IS NULL;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'certificates'
ORDER BY ordinal_position;
