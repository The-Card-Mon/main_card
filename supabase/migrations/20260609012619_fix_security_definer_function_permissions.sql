-- Revoke anon RPC access to is_admin().
-- authenticated retains EXECUTE because the RLS policy on profiles calls
-- this function; revoking from authenticated would break that policy.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;

-- Trigger functions are invoked by PostgreSQL's trigger mechanism (runs as
-- table owner), so user-level EXECUTE permission is not needed for either role.
REVOKE EXECUTE ON FUNCTION public.update_sell_submission_updated_at() FROM anon, authenticated;
