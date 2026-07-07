-- =============================================================
-- Enrich all Discord webhook trigger functions with maximum detail
-- =============================================================

-- Helper: format a dollar amount
CREATE OR REPLACE FUNCTION _fmt_usd(v numeric)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT '$' || ROUND(COALESCE(v, 0), 2)::text;
$$;

-- =============================================================
-- 1. New account created
-- =============================================================
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
      'title',       ':clipboard: New Account Created',
      'color',       5793266,
      'description', COALESCE(NEW.full_name, 'Unknown') || ' just signed up.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Full Name',       'value', COALESCE(NEW.full_name, '_Not provided_'),           'inline', true),
        jsonb_build_object('name','Email',           'value', COALESCE(NEW.email, '_Unknown_'),                    'inline', true),
        jsonb_build_object('name','Role',            'value', COALESCE(NEW.role, 'customer'),                      'inline', true),
        jsonb_build_object('name','Wallet Address',  'value', COALESCE(NULLIF(NEW.wallet_address,''), '_None_'),   'inline', false),
        jsonb_build_object('name','User ID',         'value', '`' || NEW.id::text || '`',                         'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · New Users'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 2. Order placed  (replaces previous discord_on_order)
-- =============================================================
CREATE OR REPLACE FUNCTION discord_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url  TEXT;
  site         TEXT;
  link         TEXT;
  item_count   INT;
  item_names   TEXT;
  subtotal     NUMERIC;
BEGIN
  SELECT
    COALESCE(NULLIF(discord_webhook_orders,''), NULLIF(discord_webhook_url,'')),
    COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  -- Gather item details
  SELECT COUNT(*),
         string_agg(COALESCE(p.name,'Unknown') || ' ×' || oi.quantity::text, E'\n' ORDER BY p.name)
  INTO item_count, item_names
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;

  subtotal := COALESCE(NEW.total,0)
            - COALESCE(NEW.tax_amount,0)
            - COALESCE(NEW.shipping_cost,0)
            + COALESCE(NEW.discount_amount,0);

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':shopping_cart: New Order Placed',
      'color',       3066993,
      'url',         link,
      'description', '**' || COALESCE(item_count,0)::text || ' item(s)** purchased.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',        'value', '`' || upper(left(NEW.id::text,8)) || '`',                       'inline', true),
        jsonb_build_object('name','Status',          'value', NEW.status,                                                       'inline', true),
        jsonb_build_object('name','Payment',         'value', NEW.payment_status,                                               'inline', true),
        jsonb_build_object('name','Subtotal',        'value', _fmt_usd(subtotal),                                               'inline', true),
        jsonb_build_object('name','Tax',             'value', _fmt_usd(NEW.tax_amount),                                         'inline', true),
        jsonb_build_object('name','Shipping',        'value', _fmt_usd(NEW.shipping_cost) || COALESCE(' (' || NEW.shipping_method_name || ')',''), 'inline', true),
        jsonb_build_object('name','Discount',        'value', CASE WHEN COALESCE(NEW.discount_amount,0) > 0 THEN '-' || _fmt_usd(NEW.discount_amount) || ' (' || COALESCE(NEW.discount_code,'code') || ')' ELSE '_None_' END, 'inline', true),
        jsonb_build_object('name','Order Total',     'value', '**' || _fmt_usd(NEW.total) || '**',                             'inline', true),
        jsonb_build_object('name','Items (' || COALESCE(item_count,0)::text || ')', 'value', COALESCE(left(item_names,900),'_No items_'), 'inline', false),
        jsonb_build_object('name','Ship To',         'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),       'inline', false),
        jsonb_build_object('name','View in Admin',   'value', COALESCE(link,'_No site URL configured_'),                       'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Orders'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 3. Order paid
-- =============================================================
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
  item_count  INT;
BEGIN
  IF (OLD.payment_status IS NOT DISTINCT FROM 'paid') THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_payments'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  SELECT COUNT(*) INTO item_count FROM order_items WHERE order_id = NEW.id;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':moneybag: Order Paid',
      'color',       3066993,
      'url',         link,
      'description', 'Payment confirmed for order `' || upper(left(NEW.id::text,8)) || '`.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',         'value', '`' || upper(left(NEW.id::text,8)) || '`',                     'inline', true),
        jsonb_build_object('name','Items',            'value', COALESCE(item_count,0)::text,                                   'inline', true),
        jsonb_build_object('name','Order Status',     'value', NEW.status,                                                     'inline', true),
        jsonb_build_object('name','Subtotal',         'value', _fmt_usd(COALESCE(NEW.total,0) - COALESCE(NEW.tax_amount,0) - COALESCE(NEW.shipping_cost,0) + COALESCE(NEW.discount_amount,0)), 'inline', true),
        jsonb_build_object('name','Tax',              'value', _fmt_usd(NEW.tax_amount),                                       'inline', true),
        jsonb_build_object('name','Shipping',         'value', _fmt_usd(NEW.shipping_cost),                                   'inline', true),
        jsonb_build_object('name','Total Charged',    'value', '**' || _fmt_usd(NEW.total) || '**',                           'inline', true),
        jsonb_build_object('name','Discount',         'value', CASE WHEN COALESCE(NEW.discount_amount,0)>0 THEN '-' || _fmt_usd(NEW.discount_amount) || ' (' || COALESCE(NEW.discount_code,'') || ')' ELSE '_None_' END, 'inline', true),
        jsonb_build_object('name','Payment Intent',   'value', COALESCE(NULLIF(NEW.stripe_payment_intent_id,''), '_N/A_'),    'inline', false),
        jsonb_build_object('name','Ship To',          'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),     'inline', false),
        jsonb_build_object('name','View in Admin',    'value', COALESCE(link,'_No site URL_'),                                'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Payments'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 4. Payment failed
-- =============================================================
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
  item_count  INT;
BEGIN
  IF NEW.payment_status <> 'failed' THEN RETURN NEW; END IF;
  IF (OLD.payment_status IS NOT DISTINCT FROM 'failed') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_failed_payments'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  SELECT COUNT(*) INTO item_count FROM order_items WHERE order_id = NEW.id;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':rotating_light: Payment Failed',
      'color',       15158332,
      'url',         link,
      'description', 'A payment attempt failed for order `' || upper(left(NEW.id::text,8)) || '`. Investigate immediately.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',          'value', '`' || upper(left(NEW.id::text,8)) || '`',                  'inline', true),
        jsonb_build_object('name','Items',             'value', COALESCE(item_count,0)::text,                                'inline', true),
        jsonb_build_object('name','Order Status',      'value', NEW.status,                                                  'inline', true),
        jsonb_build_object('name','Amount Attempted',  'value', '**' || _fmt_usd(NEW.total) || '**',                        'inline', true),
        jsonb_build_object('name','Previous Status',   'value', COALESCE(OLD.payment_status,'_Unknown_'),                   'inline', true),
        jsonb_build_object('name','Current Status',    'value', NEW.payment_status,                                         'inline', true),
        jsonb_build_object('name','Payment Intent',    'value', COALESCE(NULLIF(NEW.stripe_payment_intent_id,''), '_None_'), 'inline', false),
        jsonb_build_object('name','Ship To',           'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),  'inline', false),
        jsonb_build_object('name','View in Admin',     'value', COALESCE(link,'_No site URL_'),                             'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Failed Payments'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 5. Shipping label created
-- =============================================================
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
  item_count  INT;
  item_names  TEXT;
BEGIN
  IF (OLD.tracking_number IS NOT NULL) THEN RETURN NEW; END IF;
  IF (NEW.tracking_number IS NULL OR NEW.tracking_number = '') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_shipping_labels'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  SELECT COUNT(*),
         string_agg(COALESCE(p.name,'Unknown') || ' ×' || oi.quantity::text, E'\n' ORDER BY p.name)
  INTO item_count, item_names
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':package: Shipping Label Created',
      'color',       3447003,
      'url',         link,
      'description', 'Label created for order `' || upper(left(NEW.id::text,8)) || '` — ' || COALESCE(item_count,0)::text || ' item(s).',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',         'value', '`' || upper(left(NEW.id::text,8)) || '`',                   'inline', true),
        jsonb_build_object('name','Carrier',          'value', COALESCE(NEW.tracking_carrier,'_Unknown_'),                   'inline', true),
        jsonb_build_object('name','Shipping Method',  'value', COALESCE(NEW.shipping_method_name,'_Unknown_'),               'inline', true),
        jsonb_build_object('name','Tracking Number',  'value', '`' || NEW.tracking_number || '`',                           'inline', false),
        jsonb_build_object('name','Shipping Cost',    'value', _fmt_usd(NEW.shipping_cost),                                 'inline', true),
        jsonb_build_object('name','Order Total',      'value', _fmt_usd(NEW.total),                                         'inline', true),
        jsonb_build_object('name','Items (' || COALESCE(item_count,0)::text || ')', 'value', COALESCE(left(item_names,900),'_No items_'), 'inline', false),
        jsonb_build_object('name','Ship To',          'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),   'inline', false),
        jsonb_build_object('name','View in Admin',    'value', COALESCE(link,'_No site URL_'),                              'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Shipping'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 6. Tracking updated
-- =============================================================
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
  IF (NEW.tracking_number = OLD.tracking_number AND NEW.tracking_carrier IS NOT DISTINCT FROM OLD.tracking_carrier) THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_tracking'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':truck: Tracking Updated',
      'color',       10181046,
      'url',         link,
      'description', 'Tracking information changed for order `' || upper(left(NEW.id::text,8)) || '`.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',          'value', '`' || upper(left(NEW.id::text,8)) || '`',                                         'inline', true),
        jsonb_build_object('name','Order Status',      'value', NEW.status,                                                                         'inline', true),
        jsonb_build_object('name','Carrier',           'value', COALESCE(NEW.tracking_carrier,'_Unknown_'),                                         'inline', true),
        jsonb_build_object('name','New Tracking #',    'value', '`' || NEW.tracking_number || '`',                                                 'inline', false),
        jsonb_build_object('name','Previous Tracking #','value','`' || COALESCE(OLD.tracking_number,'_None_') || '`',                              'inline', false),
        jsonb_build_object('name','Shipped At',        'value', COALESCE(to_char(NEW.shipped_at AT TIME ZONE 'UTC','Mon DD, YYYY HH24:MI UTC'),'_Not yet_'), 'inline', true),
        jsonb_build_object('name','Order Total',       'value', _fmt_usd(NEW.total),                                                               'inline', true),
        jsonb_build_object('name','Ship To',           'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),                         'inline', false),
        jsonb_build_object('name','View in Admin',     'value', COALESCE(link,'_No site URL_'),                                                    'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Tracking'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 7. Package delivered
-- =============================================================
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
  item_count  INT;
  days_taken  INT;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF (OLD.status IS NOT DISTINCT FROM 'delivered') THEN RETURN NEW; END IF;

  SELECT _discord_webhook('discord_webhook_delivered'),
         COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN link := rtrim(site,'/') || '/?page=admin&section=orders&order=' || NEW.id; END IF;

  SELECT COUNT(*) INTO item_count FROM order_items WHERE order_id = NEW.id;

  days_taken := CASE
    WHEN NEW.shipped_at IS NOT NULL
    THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - NEW.shipped_at))::int)
    ELSE NULL
  END;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':mailbox_with_mail: Package Delivered',
      'color',       3066993,
      'url',         link,
      'description', 'Order `' || upper(left(NEW.id::text,8)) || '` has been delivered.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Order ID',       'value', '`' || upper(left(NEW.id::text,8)) || '`',                                              'inline', true),
        jsonb_build_object('name','Items',          'value', COALESCE(item_count,0)::text,                                                            'inline', true),
        jsonb_build_object('name','Order Total',    'value', _fmt_usd(NEW.total),                                                                     'inline', true),
        jsonb_build_object('name','Carrier',        'value', COALESCE(NEW.tracking_carrier,'_Unknown_'),                                              'inline', true),
        jsonb_build_object('name','Tracking #',     'value', COALESCE('`' || NEW.tracking_number || '`', '_None_'),                                  'inline', true),
        jsonb_build_object('name','Transit Time',   'value', COALESCE(days_taken::text || ' day(s)', '_Unknown_'),                                   'inline', true),
        jsonb_build_object('name','Shipped At',     'value', COALESCE(to_char(NEW.shipped_at AT TIME ZONE 'UTC','Mon DD, YYYY HH24:MI UTC'),'_N/A_'),'inline', true),
        jsonb_build_object('name','Shipping Method','value', COALESCE(NEW.shipping_method_name,'_N/A_'),                                              'inline', true),
        jsonb_build_object('name','Delivered To',   'value', COALESCE(left(NEW.shipping_address,200),'_Not provided_'),                              'inline', false),
        jsonb_build_object('name','View in Admin',  'value', COALESCE(link,'_No site URL_'),                                                         'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Deliveries'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 8. Seller submitted cards
-- =============================================================
CREATE OR REPLACE FUNCTION discord_on_sell_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  sub_link    TEXT;
BEGIN
  SELECT
    COALESCE(NULLIF(discord_webhook_sell,''), NULLIF(discord_webhook_url,'')),
    COALESCE(NULLIF(site_url,''),'')
  INTO webhook_url, site
  FROM modal_config WHERE id=1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN sub_link := rtrim(site,'/') || '/?page=admin&section=sell-requests&submission=' || NEW.id; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':inbox_tray: New Sell Submission',
      'color',       15844367,
      'url',         sub_link,
      'description', COALESCE(NEW.contact_name,'Someone') || ' wants to sell their cards.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Name',            'value', COALESCE(NEW.contact_name,'_Unknown_'),                                'inline', true),
        jsonb_build_object('name','Email',           'value', COALESCE(NEW.contact_email,'_Unknown_'),                               'inline', true),
        jsonb_build_object('name','Phone',           'value', COALESCE(NULLIF(NEW.contact_phone,''), '_Not provided_'),              'inline', true),
        jsonb_build_object('name','Type',            'value', COALESCE(NEW.submission_type,'_Unknown_'),                             'inline', true),
        jsonb_build_object('name','Card Count',      'value', COALESCE(NEW.card_count,0)::text || ' cards',                          'inline', true),
        jsonb_build_object('name','Condition',       'value', COALESCE(NEW.overall_condition,'_Unknown_'),                           'inline', true),
        jsonb_build_object('name','Asking Price',    'value', CASE WHEN NEW.asking_price IS NOT NULL THEN _fmt_usd(NEW.asking_price) ELSE '_Open to offers_' END, 'inline', true),
        jsonb_build_object('name','Status',          'value', COALESCE(NEW.status,'pending'),                                        'inline', true),
        jsonb_build_object('name','Images',          'value', COALESCE(array_length(NEW.image_urls,1),0)::text || ' attached',       'inline', true),
        jsonb_build_object('name','Description',     'value', COALESCE(left(NULLIF(NEW.description,''),'_Not provided_'), left(NEW.description, 500)), 'inline', false),
        jsonb_build_object('name','Submission ID',   'value', '`' || left(NEW.id::text,8) || '...`',                                 'inline', false),
        jsonb_build_object('name','View in Admin',   'value', COALESCE(sub_link,'_No site URL configured_'),                         'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Seller Submissions'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 9. Buy offer accepted
-- =============================================================
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
      'title',       ':package: Buy Offer Accepted',
      'color',       3066993,
      'url',         link,
      'description', COALESCE(NEW.contact_name,'Seller') || ' has accepted your offer of **' || _fmt_usd(NEW.offer_amount) || '**.',
      'fields', jsonb_build_array(
        jsonb_build_object('name','Seller Name',     'value', COALESCE(NEW.contact_name,'_Unknown_'),                        'inline', true),
        jsonb_build_object('name','Seller Email',    'value', COALESCE(NEW.contact_email,'_Unknown_'),                       'inline', true),
        jsonb_build_object('name','Seller Phone',    'value', COALESCE(NULLIF(NEW.contact_phone,''),'_Not provided_'),       'inline', true),
        jsonb_build_object('name','Offer Amount',    'value', '**' || _fmt_usd(NEW.offer_amount) || '**',                   'inline', true),
        jsonb_build_object('name','Asking Price',    'value', CASE WHEN NEW.asking_price IS NOT NULL THEN _fmt_usd(NEW.asking_price) ELSE '_Open_' END, 'inline', true),
        jsonb_build_object('name','Card Count',      'value', COALESCE(NEW.card_count,0)::text || ' cards',                  'inline', true),
        jsonb_build_object('name','Condition',       'value', COALESCE(NEW.overall_condition,'_Unknown_'),                   'inline', true),
        jsonb_build_object('name','Submission Type', 'value', COALESCE(NEW.submission_type,'_Unknown_'),                     'inline', true),
        jsonb_build_object('name','Admin Notes',     'value', COALESCE(left(NULLIF(NEW.admin_notes,''),'_None_'), left(NEW.admin_notes,300)), 'inline', false),
        jsonb_build_object('name','Description',     'value', COALESCE(left(NULLIF(NEW.description,''),'_Not provided_'), left(NEW.description,300)), 'inline', false),
        jsonb_build_object('name','View in Admin',   'value', COALESCE(link,'_No site URL_'),                                'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Offers'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 10. Inventory low
-- =============================================================
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
      'title',       ':notepad_spiral: Low Inventory Alert',
      'color',       15844367,
      'url',         link,
      'description', '**' || COALESCE(NEW.name,'Unknown') || '** is running low — only **' || NEW.quantity::text || '** left.',
      'thumbnail',   CASE WHEN NEW.image_url IS NOT NULL THEN jsonb_build_object('url', NEW.image_url) ELSE NULL END,
      'fields', jsonb_build_array(
        jsonb_build_object('name','Product',        'value', COALESCE(NEW.name,'_Unknown_'),                                         'inline', true),
        jsonb_build_object('name','Quantity Left',  'value', NEW.quantity::text || ' (was ' || OLD.quantity::text || ')',             'inline', true),
        jsonb_build_object('name','Price',          'value', _fmt_usd(NEW.price),                                                     'inline', true),
        jsonb_build_object('name','Card Type',      'value', COALESCE(NEW.card_type,'_N/A_'),                                        'inline', true),
        jsonb_build_object('name','Set',            'value', COALESCE(NULLIF(NEW.set_name,''),'_N/A_'),                              'inline', true),
        jsonb_build_object('name','Condition',      'value', COALESCE(NULLIF(NEW.condition,''),'_N/A_'),                             'inline', true),
        jsonb_build_object('name','Rarity',         'value', COALESCE(NULLIF(NEW.rarity,''),'_N/A_'),                                'inline', true),
        jsonb_build_object('name','Card #',         'value', COALESCE(NULLIF(NEW.card_number,''),'_N/A_'),                           'inline', true),
        jsonb_build_object('name','TCG Price',      'value', CASE WHEN NEW.tcg_price IS NOT NULL THEN _fmt_usd(NEW.tcg_price) ELSE '_N/A_' END, 'inline', true),
        jsonb_build_object('name','Product ID',     'value', '`' || NEW.id::text || '`',                                             'inline', false),
        jsonb_build_object('name','View Products',  'value', COALESCE(link,'_No site URL_'),                                         'inline', false)
      ),
      'footer',    jsonb_build_object('text','The Card Mon · Inventory'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;