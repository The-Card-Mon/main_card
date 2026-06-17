ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tcg_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS tcg_price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS use_custom_price boolean NOT NULL DEFAULT true;
