-- Daily sales report function
-- Runs at 04:00 UTC = 11 PM CDT (UTC-5, summer) / 10 PM CST (UTC-6, winter)
CREATE OR REPLACE FUNCTION public.send_daily_sales_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url   TEXT;
  report_date   DATE;
  order_count   INT;
  total_revenue NUMERIC;
  avg_order     NUMERIC;
  paid_count    INT;
  pending_count INT;
  new_customers INT;
  top_products  TEXT;
BEGIN
  SELECT discord_webhook_daily_sales
  INTO webhook_url
  FROM modal_config WHERE id = 1 LIMIT 1;

  IF webhook_url IS NULL OR webhook_url = '' THEN RETURN; END IF;

  report_date := (NOW() AT TIME ZONE 'America/Chicago')::date;

  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0),
    COUNT(*) FILTER (WHERE payment_status = 'paid'),
    COUNT(*) FILTER (WHERE payment_status NOT IN ('paid', 'failed'))
  INTO order_count, total_revenue, avg_order, paid_count, pending_count
  FROM orders
  WHERE (created_at AT TIME ZONE 'America/Chicago')::date = report_date;

  SELECT COUNT(*)
  INTO new_customers
  FROM profiles
  WHERE (created_at AT TIME ZONE 'America/Chicago')::date = report_date;

  SELECT string_agg(p.name || ' ×' || t.qty::text, E'\n' ORDER BY t.qty DESC)
  INTO top_products
  FROM (
    SELECT oi.product_id, SUM(oi.quantity)::int AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE (o.created_at AT TIME ZONE 'America/Chicago')::date = report_date
    GROUP BY oi.product_id
    ORDER BY qty DESC
    LIMIT 5
  ) t
  JOIN products p ON p.id = t.product_id;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':bar_chart: Daily Sales Report — ' || to_char(report_date, 'Mon DD, YYYY'),
      'color',       5793266,
      'fields', jsonb_build_array(
        jsonb_build_object('name', 'Total Orders',    'value', order_count::text,                              'inline', true),
        jsonb_build_object('name', 'Revenue',         'value', '**' || _fmt_usd(total_revenue) || '**',        'inline', true),
        jsonb_build_object('name', 'Avg Order',       'value', _fmt_usd(avg_order),                            'inline', true),
        jsonb_build_object('name', 'Paid',            'value', paid_count::text,                               'inline', true),
        jsonb_build_object('name', 'Pending',         'value', pending_count::text,                            'inline', true),
        jsonb_build_object('name', 'New Accounts',    'value', new_customers::text,                            'inline', true),
        jsonb_build_object('name', 'Top Products',    'value', COALESCE(NULLIF(top_products,''), '_No orders today_'), 'inline', false)
      ),
      'footer',    jsonb_build_object('text', 'The Card Mon · Daily Digest'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
END;
$$;

-- Revoke direct RPC access — called only by pg_cron (postgres role)
REVOKE EXECUTE ON FUNCTION public.send_daily_sales_report() FROM anon, authenticated;

-- Schedule: 04:00 UTC daily = 11 PM CDT (UTC-5)
SELECT cron.schedule(
  'daily-sales-report',
  '0 4 * * *',
  'SELECT public.send_daily_sales_report();'
);