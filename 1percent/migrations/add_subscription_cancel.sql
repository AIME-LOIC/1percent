-- ============================================================
-- Cancel plan: cancellation state for user_subscriptions
-- ============================================================
-- Cancelling keeps the subscription active until the current period ends
-- (cancel_at_period_end), matching the pricing page's "Cancel anytime"
-- promise. A cancelled sub resumes by clearing the flag.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Index for the status lookup (active sub for a user)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active
  ON public.user_subscriptions (user_id, is_active);
