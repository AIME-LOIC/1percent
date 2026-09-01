-- ============================================================
-- FIX: Add missing columns to certificates and profiles
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add completed_at to certificates (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'completed_at') THEN
    ALTER TABLE public.certificates ADD COLUMN completed_at timestamptz;
    UPDATE public.certificates SET completed_at = issued_at WHERE completed_at IS NULL;
    RAISE NOTICE 'Added completed_at to certificates';
  END IF;
END $$;

-- Add streak columns to profiles (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak_count') THEN
    ALTER TABLE public.profiles ADD COLUMN streak_count int not null default 0;
    RAISE NOTICE 'Added streak_count to profiles';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active_date') THEN
    ALTER TABLE public.profiles ADD COLUMN last_active_date date;
    RAISE NOTICE 'Added last_active_date to profiles';
  END IF;
END $$;

-- Add coins to profiles (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'coins') THEN
    ALTER TABLE public.profiles ADD COLUMN coins int not null default 0;
    RAISE NOTICE 'Added coins to profiles';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'has_used_free_cert_view') THEN
    ALTER TABLE public.profiles ADD COLUMN has_used_free_cert_view boolean not null default false;
    RAISE NOTICE 'Added has_used_free_cert_view to profiles';
  END IF;
END $$;

-- Add lab_files table if missing (for file storage)
CREATE TABLE IF NOT EXISTS public.lab_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size int not null default 0,
  mime_type text not null default 'text/plain',
  language text not null default 'javascript',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add lesson_locks table if missing
CREATE TABLE IF NOT EXISTS public.lesson_locks (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  coins_required int not null default 50,
  is_free boolean not null default false,
  unique (lesson_id)
);

-- Add user_subscriptions table if missing
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_slug text not null default 'free',
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('certificates', 'profiles') 
AND column_name IN ('completed_at', 'streak_count', 'last_active_date', 'coins', 'has_used_free_cert_view')
ORDER BY table_name, column_name;
