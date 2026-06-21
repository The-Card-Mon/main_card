
-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text        NOT NULL UNIQUE,
  description    text,
  type           text        NOT NULL CHECK (type IN ('percentage', 'flat')),
  value          numeric(10,2) NOT NULL CHECK (value > 0),
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0,
  max_uses       int,          -- NULL = unlimited
  uses_count     int         NOT NULL DEFAULT 0,
  expires_at     timestamptz,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can look up a single code (needed for client-side validation UX)
CREATE POLICY "select_discount_codes" ON discount_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- Admin full CRUD
CREATE POLICY "admin_insert_discount_codes" ON discount_codes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_update_discount_codes" ON discount_codes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_discount_codes" ON discount_codes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add discount columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_code   text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
