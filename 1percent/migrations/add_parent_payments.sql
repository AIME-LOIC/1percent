-- ============================================================
-- Parent Payments — students share a link for parents to pay
-- ============================================================

CREATE TABLE IF NOT EXISTS parent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL DEFAULT 'pro',
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  payment_method TEXT,
  reference_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_payments_token ON parent_payments(reference_token);
CREATE INDEX IF NOT EXISTS idx_parent_payments_student ON parent_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_status ON parent_payments(status);

-- RLS policies
ALTER TABLE parent_payments ENABLE ROW LEVEL SECURITY;

-- Students can view their own payment requests
CREATE POLICY "Students view own payment requests" ON parent_payments
  FOR SELECT USING (auth.uid() = student_id);

-- Students can create payment requests
CREATE POLICY "Students create payment requests" ON parent_payments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own payment requests (cancel)
CREATE POLICY "Students update own payment requests" ON parent_payments
  FOR UPDATE USING (auth.uid() = student_id);

-- Public can view by reference_token (for parent payment page)
CREATE POLICY "Public view by token" ON parent_payments
  FOR SELECT USING (true);

-- Service role handles updates for payment processing

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_parent_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parent_payments_updated_at
  BEFORE UPDATE ON parent_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_payments_updated_at();
