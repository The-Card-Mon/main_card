-- Add per-event Discord webhook URLs
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS discord_webhook_orders  TEXT DEFAULT '';
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS discord_webhook_sell    TEXT DEFAULT '';
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS discord_webhook_contact TEXT DEFAULT '';
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS discord_webhook_support TEXT DEFAULT '';

-- Updated trigger: new order (uses discord_webhook_orders, falls back to discord_webhook_url)
CREATE OR REPLACE FUNCTION discord_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT COALESCE(NULLIF(discord_webhook_orders, ''), NULLIF(discord_webhook_url, ''))
    INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',  ':shopping_cart: New Order Placed',
        'color',  3066993,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'Order ID',       'value', NEW.id::text,                                           'inline', true),
          jsonb_build_object('name', 'Total',          'value', '$' || ROUND(COALESCE(NEW.total, 0)::numeric, 2)::text, 'inline', true),
          jsonb_build_object('name', 'Payment Status', 'value', NEW.payment_status,                                     'inline', true)
        ),
        'footer',    jsonb_build_object('text', 'The Card Mon'),
        'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ))
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Updated trigger: new sell submission (uses discord_webhook_sell)
CREATE OR REPLACE FUNCTION discord_on_sell_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT COALESCE(NULLIF(discord_webhook_sell, ''), NULLIF(discord_webhook_url, ''))
    INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',  ':inbox_tray: New Sell Submission',
        'color',  15844367,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'From',         'value', COALESCE(NEW.contact_name,  'Unknown'), 'inline', true),
          jsonb_build_object('name', 'Email',        'value', COALESCE(NEW.contact_email, 'Unknown'), 'inline', true),
          jsonb_build_object('name', 'Cards',        'value', COALESCE(NEW.card_count, 0)::text,      'inline', true),
          jsonb_build_object('name', 'Asking Price', 'value', '$' || COALESCE(NEW.asking_price, 0)::text, 'inline', true),
          jsonb_build_object('name', 'Condition',    'value', COALESCE(NEW.overall_condition, 'N/A'), 'inline', true)
        ),
        'footer',    jsonb_build_object('text', 'The Card Mon'),
        'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ))
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Updated trigger: new contact submission (uses discord_webhook_contact)
CREATE OR REPLACE FUNCTION discord_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT COALESCE(NULLIF(discord_webhook_contact, ''), NULLIF(discord_webhook_url, ''))
    INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',  ':envelope: New Contact Message',
        'color',  3447003,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'From',    'value', COALESCE(NEW.name,    'Unknown'),     'inline', true),
          jsonb_build_object('name', 'Email',   'value', COALESCE(NEW.email,   'Unknown'),     'inline', true),
          jsonb_build_object('name', 'Subject', 'value', COALESCE(NEW.subject, 'No subject'),  'inline', false),
          jsonb_build_object('name', 'Message', 'value', LEFT(COALESCE(NEW.message, ''), 200), 'inline', false)
        ),
        'footer',    jsonb_build_object('text', 'The Card Mon'),
        'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ))
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Updated trigger: new support ticket (uses discord_webhook_support)
CREATE OR REPLACE FUNCTION discord_on_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT COALESCE(NULLIF(discord_webhook_support, ''), NULLIF(discord_webhook_url, ''))
    INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',  ':ticket: New Support Ticket #' || NEW.ticket_number::text,
        'color',  10181046,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'Subject',  'value', COALESCE(NEW.subject,        'No subject'), 'inline', false),
          jsonb_build_object('name', 'From',     'value', COALESCE(NEW.customer_name,  'Unknown'),    'inline', true),
          jsonb_build_object('name', 'Email',    'value', COALESCE(NEW.customer_email, 'Unknown'),    'inline', true),
          jsonb_build_object('name', 'Priority', 'value', COALESCE(NEW.priority,       'normal'),     'inline', true)
        ),
        'footer',    jsonb_build_object('text', 'The Card Mon'),
        'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ))
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;