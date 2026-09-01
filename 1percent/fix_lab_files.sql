-- ============================================================
-- Create lab_files table for Code Lab file storage
-- Run this in Supabase SQL Editor
-- ============================================================

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

-- Enable RLS
ALTER TABLE public.lab_files ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own files" ON public.lab_files 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.lab_files 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.lab_files 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.lab_files 
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_lab_files_user ON public.lab_files(user_id, updated_at DESC);

-- Verify
SELECT 'lab_files table created successfully' as status;
