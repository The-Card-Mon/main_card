-- Add site URL for use in Discord notification links
ALTER TABLE modal_config ADD COLUMN IF NOT EXISTS site_url TEXT DEFAULT '';

-- Updated order trigger: includes a clickable admin link
CREATE OR REPLACE FUNCTION discord_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  site        TEXT;
  order_link  TEXT;
BEGIN
  SELECT
    COALESCE(NULLIF(discord_webhook_orders, ''), NULLIF(discord_webhook_url, '')),
    COALESCE(NULLIF(site_url, ''), '')
  INTO webhook_url, site
  FROM modal_config WHERE id = 1 LIMIT 1;

  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN
    order_link := rtrim(site, '/') || '/?page=admin&section=orders&order=' || NEW.id;
  ELSE
    order_link := NULL;
  END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',       ':shopping_cart: New Order Placed',
        'color',       3066993,
        'url',         order_link,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'Order ID',       'value', '`' || upper(left(NEW.id::text, 8)) || '`',               'inline', true),
          jsonb_build_object('name', 'Total',          'value', '**$' || ROUND(COALESCE(NEW.total, 0)::numeric, 2)::text || '**', 'inline', true),
          jsonb_build_object('name', 'Payment Status', 'value', NEW.payment_status,                                        'inline', true),
          jsonb_build_object('name', 'View in Admin',  'value', COALESCE(order_link, '_No site URL configured_'),          'inline', false)
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