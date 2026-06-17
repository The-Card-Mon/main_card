ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ebay_listing_id      TEXT,
  ADD COLUMN IF NOT EXISTS ebay_offer_id        TEXT,
  ADD COLUMN IF NOT EXISTS ebay_listing_status  TEXT CHECK (ebay_listing_status IN ('active', 'ended', 'error')),
  ADD COLUMN IF NOT EXISTS ebay_listing_url     TEXT,
  ADD COLUMN IF NOT EXISTS ebay_listed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ebay_listing_error   TEXT;
