-- Add tax and refund fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_refund_id text;

-- Expand payment_status to include refunded/failed
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));

-- Tax configuration table
CREATE TABLE IF NOT EXISTS tax_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 1),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'state', 'country')),
  region_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tax_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_tax_config" ON tax_config FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "authenticated_read_active_tax" ON tax_config FOR SELECT
  TO authenticated USING (is_active = true);

DROP TRIGGER IF EXISTS tax_config_updated_at ON tax_config;
CREATE TRIGGER tax_config_updated_at
  BEFORE UPDATE ON tax_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
