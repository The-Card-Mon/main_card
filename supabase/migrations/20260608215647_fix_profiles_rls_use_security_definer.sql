-- Replace the JWT approach with a SECURITY DEFINER helper function
-- that bypasses RLS when checking admin role, breaking the recursion.
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;

-- Helper that runs as the function owner (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );
