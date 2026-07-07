-- Add Discord webhook URL to modal_config
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT DEFAULT '';

-- Helper: read webhook URL and POST a Discord embed
CREATE OR REPLACE FUNCTION discord_notify(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT discord_webhook_url INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;

-- Trigger: new order
CREATE OR REPLACE FUNCTION discord_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM discord_notify(
    jsonb_build_object(
      'embeds', jsonb_build_array(
        jsonb_build_object(
          'title',  ':shopping_cart: New Order Placed',
          'color',  3066993,
          'fields', jsonb_build_array(
            jsonb_build_object('name', 'Order ID',       'value', NEW.id::text,                                            'inline', true),
            jsonb_build_object('name', 'Total',          'value', '$' || ROUND(COALESCE(NEW.total, 0)::numeric, 2)::text,  'inline', true),
            jsonb_build_object('name', 'Payment Status', 'value', NEW.payment_status,                                      'inline', true)
          ),
          'footer',    jsonb_build_object('text', 'The Card Mon'),
          'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_order_trigger ON orders;
CREATE TRIGGER discord_order_trigger
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION discord_on_order();

-- Trigger: new sell submission
CREATE OR REPLACE FUNCTION discord_on_sell_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM discord_notify(
    jsonb_build_object(
      'embeds', jsonb_build_array(
        jsonb_build_object(
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
        )
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_sell_trigger ON sell_submissions;
CREATE TRIGGER discord_sell_trigger
  AFTER INSERT ON sell_submissions
  FOR EACH ROW EXECUTE FUNCTION discord_on_sell_submission();

-- Trigger: new contact submission
CREATE OR REPLACE FUNCTION discord_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM discord_notify(
    jsonb_build_object(
      'embeds', jsonb_build_array(
        jsonb_build_object(
          'title',  ':envelope: New Contact Message',
          'color',  3447003,
          'fields', jsonb_build_array(
            jsonb_build_object('name', 'From',    'value', COALESCE(NEW.name,    'Unknown'),      'inline', true),
            jsonb_build_object('name', 'Email',   'value', COALESCE(NEW.email,   'Unknown'),      'inline', true),
            jsonb_build_object('name', 'Subject', 'value', COALESCE(NEW.subject, 'No subject'),   'inline', false),
            jsonb_build_object('name', 'Message', 'value', LEFT(COALESCE(NEW.message, ''), 200),  'inline', false)
          ),
          'footer',    jsonb_build_object('text', 'The Card Mon'),
          'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_contact_trigger ON contact_submissions;
CREATE TRIGGER discord_contact_trigger
  AFTER INSERT ON contact_submissions
  FOR EACH ROW EXECUTE FUNCTION discord_on_contact();

-- Trigger: new support ticket
CREATE OR REPLACE FUNCTION discord_on_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM discord_notify(
    jsonb_build_object(
      'embeds', jsonb_build_array(
        jsonb_build_object(
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
        )
      )
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discord_support_trigger ON support_tickets;
CREATE TRIGGER discord_support_trigger
  AFTER INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION discord_on_support_ticket();