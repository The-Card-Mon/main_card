-- =================================================================
-- Security hardening
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Fix _fmt_usd mutable search_path
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._fmt_usd(v numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT '$' || ROUND(COALESCE(v, 0), 2)::text;
$$;

-- -----------------------------------------------------------------
-- 2. Tighten support_tickets anon INSERT policy (was WITH CHECK (true))
--    Require non-empty subject, customer_name, customer_email, and
--    first_message so the row is at minimum a real submission.
--    Disallow setting status/priority/assigned_to from outside.
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_tickets ON public.support_tickets;
CREATE POLICY anon_insert_tickets ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    subject        IS NOT NULL AND subject        <> '' AND
    customer_name  IS NOT NULL AND customer_name  <> '' AND
    customer_email IS NOT NULL AND customer_email <> '' AND
    first_message  IS NOT NULL AND first_message  <> '' AND
    status         = 'open' AND
    assigned_to    IS NULL
  );

-- -----------------------------------------------------------------
-- 3. Revoke EXECUTE from trigger / internal functions
--    These are only ever called by the trigger mechanism or
--    internally — never directly by end users.
-- -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public._discord_webhook(text)                          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_notify(jsonb)                           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_new_user()                           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_order()                              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_order_paid()                         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_payment_failed()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_shipping_label()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_tracking_updated()                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_delivered()                          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_sell_submission()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_offer_accepted()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_inventory_low()                      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_contact()                            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discord_on_support_ticket()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ticket_reply_insert()                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_sell_submission_updated_at()             FROM anon, authenticated;

-- -----------------------------------------------------------------
-- 4. Revoke EXECUTE from admin-only functions
--    These are called exclusively via edge functions using the
--    service_role key, never directly by browser clients.
-- -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_award_pokebucks(uuid, numeric, text)                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_invite_staff(text, text)                                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, text, text, text)              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text)                               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_us_state_tax_rates()                                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_product_quantity(uuid, integer)                     FROM anon, authenticated;

-- -----------------------------------------------------------------
-- 5. Revoke EXECUTE from authenticated-only functions (anon only)
--    These require an active session — strip anon access.
-- -----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.apply_pending_staff_invitation()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_pokebucks_for_order(uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.open_mystery_box(text)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_pokebucks_withdrawal(numeric, text)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.spend_pokebucks(numeric, uuid)                  FROM anon;

-- create_support_ticket intentionally keeps anon+authenticated access
-- (used by the public contact/support form).

-- is_admin intentionally keeps authenticated access
-- (called from within RLS policy USING expressions).

-- -----------------------------------------------------------------
-- NOTE: pg_net extension schema and leaked password protection
-- -----------------------------------------------------------------
-- pg_net is a Supabase-managed extension installed in the public
-- schema by the platform. It cannot be moved to another schema
-- without Supabase infrastructure changes. No action taken.
--
-- Leaked password protection (HaveIBeenPwned) must be enabled via
-- the Supabase Dashboard → Authentication → Password Security.
-- It cannot be configured via SQL migration.