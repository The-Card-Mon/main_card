-- Add new per-event Discord webhook columns
ALTER TABLE modal_config
  ADD COLUMN IF NOT EXISTS discord_webhook_new_users        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_payments         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_failed_payments  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_shipping_labels  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_tracking         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_delivered        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_offer_accepted   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_inventory        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_reviews          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_errors           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_api_errors       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_daily_sales      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_webhook_weekly_analytics TEXT DEFAULT '';

-- -------------------------------------------------------
-- Helper to resolve a webhook with fallback to general URL
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION _discord_webhook(col TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v TEXT; fb TEXT;
BEGIN
  EXECUTE format('SELECT %I, COALESCE(NULLIF(discord_webhook_url,''''),NULL) FROM modal_config WHERE id=1 LIMIT 1', col)
    INTO v, fb;
  RETURN COALESCE(NULLIF(v,''), fb);
END;
$$;

-- -------------------------------------------------------
-- New account created (fires on profiles INSERT)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
BEGIN
  SELECT _discord_webhook('discord_webhook_new_users'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',  ':clipboard: New Account Created',
      'color',  5793266,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Name',  'value', COALESCE(NEW.full_name, 'Unknown'), 'inline', true),
        jsonb_build_object('name','Email', 'value', COALESCE(NEW.email,     'Unknown'), 'inline', true)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_new_user_trigger ON profiles;
CREATE TRIGGER discord_new_user_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION discord_on_new_user();

-- -------------------------------------------------------
-- Order paid (payment_status flips to 'paid')
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF (OLD.payment_status IS NOT DISTINCT FROM 'paid') THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_payments'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':moneybag: Order Paid',
      'color', 3066993,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order',   'value','`'||upper(left(NEW.id::text,8))||'`', 'inline',true),
        jsonb_build_object('name','Total',   'value','**$'||ROUND(COALESCE(NEW.total,0)::numeric,2)::text||'**', 'inline',true),
        jsonb_build_object('name','View',    'value', COALESCE(link,'_No site URL_'), 'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_order_paid_trigger ON orders;
CREATE TRIGGER discord_order_paid_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_order_paid();

-- -------------------------------------------------------
-- Payment failed
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_payment_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF NEW.payment_status <> 'failed' THEN RETURN NEW; END IF;
  IF (OLD.payment_status IS NOT DISTINCT FROM 'failed') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_failed_payments'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':rotating_light: Payment Failed',
      'color', 15158332,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order', 'value','`'||upper(left(NEW.id::text,8))||'`', 'inline',true),
        jsonb_build_object('name','Total', 'value','$'||ROUND(COALESCE(NEW.total,0)::numeric,2)::text, 'inline',true),
        jsonb_build_object('name','View',  'value', COALESCE(link,'_No site URL_'), 'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_payment_failed_trigger ON orders;
CREATE TRIGGER discord_payment_failed_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_payment_failed();

-- -------------------------------------------------------
-- Shipping label created (tracking_number first set)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_shipping_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF (OLD.tracking_number IS NOT NULL) THEN RETURN NEW; END IF;
  IF (NEW.tracking_number IS NULL OR NEW.tracking_number = '') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_shipping_labels'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':package: Shipping Label Created',
      'color', 3447003,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order',    'value','`'||upper(left(NEW.id::text,8))||'`',       'inline',true),
        jsonb_build_object('name','Carrier',  'value', COALESCE(NEW.tracking_carrier,'Unknown'),   'inline',true),
        jsonb_build_object('name','Tracking', 'value', NEW.tracking_number,                        'inline',false),
        jsonb_build_object('name','View',     'value', COALESCE(link,'_No site URL_'),             'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_shipping_label_trigger ON orders;
CREATE TRIGGER discord_shipping_label_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_shipping_label();

-- -------------------------------------------------------
-- Tracking updated (tracking_number changes on existing label)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_tracking_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF (OLD.tracking_number IS NULL) THEN RETURN NEW; END IF;
  IF (NEW.tracking_number IS NULL OR NEW.tracking_number = '') THEN RETURN NEW; END IF;
  IF (NEW.tracking_number = OLD.tracking_number) THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_tracking'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':truck: Tracking Updated',
      'color', 10181046,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order',    'value','`'||upper(left(NEW.id::text,8))||'`', 'inline',true),
        jsonb_build_object('name','Carrier',  'value', COALESCE(NEW.tracking_carrier,'Unknown'), 'inline',true),
        jsonb_build_object('name','Tracking', 'value', NEW.tracking_number, 'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_tracking_updated_trigger ON orders;
CREATE TRIGGER discord_tracking_updated_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_tracking_updated();

-- -------------------------------------------------------
-- Package delivered (status changes to 'delivered')
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF (OLD.status IS NOT DISTINCT FROM 'delivered') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_delivered'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':mailbox_with_mail: Package Delivered',
      'color', 3066993,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order',    'value','`'||upper(left(NEW.id::text,8))||'`',       'inline',true),
        jsonb_build_object('name','Tracking', 'value', COALESCE(NEW.tracking_number,'N/A'),        'inline',true),
        jsonb_build_object('name','View',     'value', COALESCE(link,'_No site URL_'),             'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_delivered_trigger ON orders;
CREATE TRIGGER discord_delivered_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_delivered();

-- -------------------------------------------------------
-- Buy offer accepted (sell_submission status → 'accepted')
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_offer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;
  IF (OLD.status IS NOT DISTINCT FROM 'accepted') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_offer_accepted'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=sell-requests&submission=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':package: Buy Offer Accepted',
      'color', 3066993,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Seller',       'value', COALESCE(NEW.contact_name,'Unknown'), 'inline',true),
        jsonb_build_object('name','Offer Amount', 'value','$'||COALESCE(NEW.offer_amount,0)::text, 'inline',true),
        jsonb_build_object('name','View',         'value', COALESCE(link,'_No site URL_'), 'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_offer_accepted_trigger ON sell_submissions;
CREATE TRIGGER discord_offer_accepted_trigger
  AFTER UPDATE ON sell_submissions
  FOR EACH ROW EXECUTE FUNCTION discord_on_offer_accepted();

-- -------------------------------------------------------
-- Inventory low (products quantity drops to <= 3)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION discord_on_inventory_low()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  link        TEXT;
BEGIN
  IF NEW.quantity > 3 THEN RETURN NEW; END IF;
  IF (OLD.quantity IS NOT DISTINCT FROM NEW.quantity) THEN RETURN NEW; END IF;
  IF NEW.quantity >= OLD.quantity THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_inventory'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=products'; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', ':notepad_spiral: Low Inventory',
      'color', 15844367,
      'url',   link,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Product',  'value', COALESCE(NEW.name,'Unknown'), 'inline',true),
        jsonb_build_object('name','Quantity', 'value', NEW.quantity::text || ' left', 'inline',true),
        jsonb_build_object('name','View',     'value', COALESCE(link,'_No site URL_'), 'inline',false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_inventory_low_trigger ON products;
CREATE TRIGGER discord_inventory_low_trigger
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION discord_on_inventory_low();