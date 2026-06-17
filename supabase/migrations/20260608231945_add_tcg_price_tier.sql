ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tcg_price_tier text NOT NULL DEFAULT 'tcgNmAvg';
