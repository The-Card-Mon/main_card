/*
# Seed US State Tax Rates

Adds infrastructure for auto-populating all 50 US state + DC base sales tax rates.

1. Schema Changes
   - Adds a unique index on `tax_config(applies_to, region_code)` so upserts are safe and idempotent.

2. New Function
   - `seed_us_state_tax_rates()` — admin-only stored procedure that upserts all 51 rows (50 states + DC)
     with their official 2025 base state sales tax rates.
   - States with 0% rate (AK, DE, MT, NH, OR) are inserted as inactive rules.
   - All other states are inserted as active rules.
   - Safe to call multiple times — uses ON CONFLICT DO UPDATE to reset rates to defaults.
   - Returns the count of rows upserted (always 51).

3. Notes
   - Rates are BASE state rates only. Local/county rates are not included.
   - Admin role required to call the function.
*/

-- Unique index so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS tax_config_applies_region_uidx
  ON tax_config (applies_to, region_code)
  WHERE region_code IS NOT NULL;

-- Seeding function
CREATE OR REPLACE FUNCTION seed_us_state_tax_rates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_count    integer := 0;
  v_state    record;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  FOR v_state IN (
    SELECT * FROM (VALUES
      ('AL', 'Alabama',           0.04),
      ('AK', 'Alaska',            0.00),
      ('AZ', 'Arizona',           0.056),
      ('AR', 'Arkansas',          0.065),
      ('CA', 'California',        0.0725),
      ('CO', 'Colorado',          0.029),
      ('CT', 'Connecticut',       0.0635),
      ('DE', 'Delaware',          0.00),
      ('FL', 'Florida',           0.06),
      ('GA', 'Georgia',           0.04),
      ('HI', 'Hawaii',            0.04),
      ('ID', 'Idaho',             0.06),
      ('IL', 'Illinois',          0.0625),
      ('IN', 'Indiana',           0.07),
      ('IA', 'Iowa',              0.06),
      ('KS', 'Kansas',            0.065),
      ('KY', 'Kentucky',          0.06),
      ('LA', 'Louisiana',         0.0445),
      ('ME', 'Maine',             0.055),
      ('MD', 'Maryland',          0.06),
      ('MA', 'Massachusetts',     0.0625),
      ('MI', 'Michigan',          0.06),
      ('MN', 'Minnesota',         0.06875),
      ('MS', 'Mississippi',       0.07),
      ('MO', 'Missouri',          0.04225),
      ('MT', 'Montana',           0.00),
      ('NE', 'Nebraska',          0.055),
      ('NV', 'Nevada',            0.0685),
      ('NH', 'New Hampshire',     0.00),
      ('NJ', 'New Jersey',        0.06625),
      ('NM', 'New Mexico',        0.05),
      ('NY', 'New York',          0.04),
      ('NC', 'North Carolina',    0.0475),
      ('ND', 'North Dakota',      0.05),
      ('OH', 'Ohio',              0.0575),
      ('OK', 'Oklahoma',          0.045),
      ('OR', 'Oregon',            0.00),
      ('PA', 'Pennsylvania',      0.06),
      ('RI', 'Rhode Island',      0.07),
      ('SC', 'South Carolina',    0.06),
      ('SD', 'South Dakota',      0.045),
      ('TN', 'Tennessee',         0.07),
      ('TX', 'Texas',             0.0625),
      ('UT', 'Utah',              0.0595),
      ('VT', 'Vermont',           0.06),
      ('VA', 'Virginia',          0.053),
      ('WA', 'Washington',        0.065),
      ('WV', 'West Virginia',     0.06),
      ('WI', 'Wisconsin',         0.05),
      ('WY', 'Wyoming',           0.04),
      ('DC', 'Washington D.C.',   0.06)
    ) AS t(code, state_name, rate)
  )
  LOOP
    INSERT INTO tax_config (name, rate, applies_to, region_code, is_active)
    VALUES (
      v_state.state_name || ' State Tax',
      v_state.rate,
      'state',
      v_state.code,
      v_state.rate > 0
    )
    ON CONFLICT (applies_to, region_code)
    DO UPDATE SET
      name       = EXCLUDED.name,
      rate       = EXCLUDED.rate,
      is_active  = EXCLUDED.is_active,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
