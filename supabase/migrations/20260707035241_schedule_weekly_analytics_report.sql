-- Weekly analytics report — runs Monday 04:00 UTC = Sunday 11 PM CDT
CREATE OR REPLACE FUNCTION public.send_weekly_analytics_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url    TEXT;
  week_start     DATE;
  week_end       DATE;
  order_count    INT;
  total_revenue  NUMERIC;
  paid_count     INT;
  new_customers  INT;
  top_products   TEXT;
  prev_revenue   NUMERIC;
  revenue_change TEXT;
BEGIN
  SELECT discord_webhook_weekly_analytics INTO webhook_url FROM modal_config WHERE id = 1 LIMIT 1;
  IF webhook_url IS NULL OR webhook_url = '' THEN RETURN; END IF;

  -- Week that just ended (Mon–Sun) in Central time
  -- When this runs Sunday 11 PM CDT, date_trunc('week', sunday) = Monday of that week
  week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Chicago')::date)::date;
  week_end   := (week_start + 6)::date;

  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0),
    COUNT(*) FILTER (WHERE payment_status = 'paid')
  INTO order_count, total_revenue, paid_count
  FROM orders
  WHERE (created_at AT TIME ZONE 'America/Chicago')::date BETWEEN week_start AND week_end;

  SELECT COUNT(*)
  INTO new_customers
  FROM profiles
  WHERE (created_at AT TIME ZONE 'America/Chicago')::date BETWEEN week_start AND week_end;

  SELECT COALESCE(SUM(total), 0)
  INTO prev_revenue
  FROM orders
  WHERE (created_at AT TIME ZONE 'America/Chicago')::date BETWEEN (week_start - 7)::date AND (week_end - 7)::date;

  revenue_change := CASE
    WHEN prev_revenue = 0 THEN '_No prior week data_'
    WHEN total_revenue >= prev_revenue
      THEN '+' || round(((total_revenue - prev_revenue) / prev_revenue) * 100, 1)::text || '%'
    ELSE round(((total_revenue - prev_revenue) / prev_revenue) * 100, 1)::text || '%'
  END;

  SELECT string_agg(p.name || ' ×' || t.qty::text, E'\n' ORDER BY t.qty DESC)
  INTO top_products
  FROM (
    SELECT oi.product_id, SUM(oi.quantity)::int AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE (o.created_at AT TIME ZONE 'America/Chicago')::date BETWEEN week_start AND week_end
    GROUP BY oi.product_id
    ORDER BY qty DESC
    LIMIT 5
  ) t
  JOIN products p ON p.id = t.product_id;

  PERFORM net.http_post(
    url     := webhook_url,
    body    := jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title',       ':chart_with_upwards_trend: Weekly Analytics — ' || to_char(week_start, 'Mon DD') || ' – ' || to_char(week_end, 'Mon DD, YYYY'),
      'color',       3447003,
      'fields', jsonb_build_array(
        jsonb_build_object('name', 'Total Orders',  'value', order_count::text,                              'inline', true),
        jsonb_build_object('name', 'Revenue',       'value', '**' || _fmt_usd(total_revenue) || '**',        'inline', true),
        jsonb_build_object('name', 'vs Prior Week', 'value', revenue_change,                                 'inline', true),
        jsonb_build_object('name', 'Paid Orders',   'value', paid_count::text,                               'inline', true),
        jsonb_build_object('name', 'New Accounts',  'value', new_customers::text,                            'inline', true),
        jsonb_build_object('name', 'Top Products',  'value', COALESCE(NULLIF(top_products,''), '_No orders this week_'), 'inline', false)
      ),
      'footer',    jsonb_build_object('text', 'The Card Mon · Weekly Analytics'),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ))),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_weekly_analytics_report() FROM anon, authenticated;

-- Schedule: Monday 04:00 UTC = Sunday 11 PM CDT
SELECT cron.schedule(
  'weekly-analytics-report',
  '0 4 * * 1',
  'SELECT public.send_weekly_analytics_report();'
);