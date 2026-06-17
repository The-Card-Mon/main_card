-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily price auto-update at 3:00 AM UTC
SELECT cron.schedule(
  'daily-price-auto-update',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://eizmeetiswclgeftwefb.supabase.co/functions/v1/price-auto-update',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
