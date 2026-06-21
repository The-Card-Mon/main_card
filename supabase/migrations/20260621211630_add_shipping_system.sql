
-- Shipping methods table
CREATE TABLE IF NOT EXISTS shipping_methods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL DEFAULT 0,
  estimated_days_min int NOT NULL DEFAULT 3,
  estimated_days_max int NOT NULL DEFAULT 7,
  carrier      text,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

-- Anyone can read active shipping methods (needed for checkout)
CREATE POLICY "select_shipping_methods" ON shipping_methods FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "select_shipping_methods_anon" ON shipping_methods FOR SELECT
  TO anon USING (is_active = true);

-- Only admins can manage them (service role bypass)
CREATE POLICY "insert_shipping_methods" ON shipping_methods FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "update_shipping_methods" ON shipping_methods FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "delete_shipping_methods" ON shipping_methods FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add shipping/tracking columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_method_id   uuid REFERENCES shipping_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_method_name text,
  ADD COLUMN IF NOT EXISTS shipping_cost        numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracking_number      text,
  ADD COLUMN IF NOT EXISTS tracking_carrier     text,
  ADD COLUMN IF NOT EXISTS shipped_at           timestamptz;

-- Seed 3 default shipping methods
INSERT INTO shipping_methods (name, description, price, estimated_days_min, estimated_days_max, carrier, sort_order)
VALUES
  ('Standard Shipping',  'Delivered in 5–7 business days',   0.00,  5, 7,  NULL,   0),
  ('Priority Shipping',  'Delivered in 2–3 business days',   7.99,  2, 3,  NULL,   1),
  ('Express Overnight',  'Next business day delivery',       19.99, 1, 1,  NULL,   2)
ON CONFLICT DO NOTHING;
