/* ============================================================
   Migration: allow 'superseded' status on ai_reviews
   ============================================================
   When a student submits the same challenge again, older PENDING
   reviews are marked 'superseded' so admins only ever see the
   latest attempt. This relaxes the status CHECK constraint.

   Run in Supabase SQL Editor.
   ============================================================ */

-- Drop the old constraint (name as created in add_ai_reviews.sql)
alter table public.ai_reviews
  drop constraint if exists ai_reviews_status_check;

-- Recreate with 'superseded' allowed
alter table public.ai_reviews
  add constraint ai_reviews_status_check
  check (status in ('pending', 'approved', 'rejected', 'applied', 'superseded'));

-- Optional convenience: hide superseded rows from students' own view
-- (they only ever saw the latest review anyway; nothing to change in RLS).
