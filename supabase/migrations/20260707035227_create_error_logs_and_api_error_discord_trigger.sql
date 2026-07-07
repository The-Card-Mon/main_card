-- Error log table for edge function API failures
CREATE TABLE public.error_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  source     text        NOT NULL,
  message    text        NOT NULL,
  context    jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can insert; no client-side access
CREATE POLICY "service_insert_error_logs" ON public.error_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- Discord trigger for API errors
CREATE OR REPLACE FUNCTION public.discord_on_api_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  SELECT discord_webhook_api_errors INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL OR webhook_url = '' THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':rotating_light: API Error — ' || NEW.source,
      'color',       15158332,
      'fields', jsonb_build_array(
        jsonb_build_object('name', 'Source',  'value', '`' || NEW.source || '`',                                                     'inline', true),
        jsonb_build_object('name', 'Time',    'value', to_char(NEW.created_at AT TIME ZONE 'America/Chicago', 'Mon DD HH12:MI AM CT'), 'inline', true),
        jsonb_build_object('name', 'Error',   'value', left(NEW.message, 1000),                                                       'inline', false),
        jsonb_build_object('name', 'Context', 'value', CASE WHEN NEW.context = '{}'::jsonb THEN '_none_' ELSE left(NEW.context::text, 500) END, 'inline', false)
      ),
      'footer',    jsonb_build_object('text', 'The Card Mon · API Monitor'),
      'timestamp', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER discord_api_error_trigger
  AFTER INSERT ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION discord_on_api_error();

REVOKE EXECUTE ON FUNCTION public.discord_on_api_error() FROM anon, authenticated;