-- Update sell submission trigger to include admin link
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
    COALESCE(NULLIF(discord_webhook_sell, ''), NULLIF(discord_webhook_url, '')),
    COALESCE(NULLIF(site_url, ''), '')
  INTO webhook_url, site
  FROM modal_config WHERE id = 1 LIMIT 1;

  IF webhook_url IS NULL THEN RETURN NEW; END IF;

  IF site <> '' THEN
    sub_link := rtrim(site, '/') || '/?page=admin&section=sell-requests&submission=' || NEW.id;
  ELSE
    sub_link := NULL;
  END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object(
      'embeds', jsonb_build_array(jsonb_build_object(
        'title',  ':inbox_tray: New Sell Submission',
        'color',  15844367,
        'url',    sub_link,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'From',         'value', COALESCE(NEW.contact_name,  'Unknown'),  'inline', true),
          jsonb_build_object('name', 'Email',        'value', COALESCE(NEW.contact_email, 'Unknown'),  'inline', true),
          jsonb_build_object('name', 'Cards',        'value', COALESCE(NEW.card_count, 0)::text,       'inline', true),
          jsonb_build_object('name', 'Asking Price', 'value', '$' || COALESCE(NEW.asking_price, 0)::text, 'inline', true),
          jsonb_build_object('name', 'Condition',    'value', COALESCE(NEW.overall_condition, 'N/A'),  'inline', true),
          jsonb_build_object('name', 'View in Admin','value', COALESCE(sub_link, '_No site URL configured_'), 'inline', false)
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