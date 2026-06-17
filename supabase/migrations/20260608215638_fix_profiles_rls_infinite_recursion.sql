-- Drop the recursive admin policy and replace it with a non-recursive version
-- that reads the role from the JWT claims (set by the handle_new_user trigger)
-- rather than querying the profiles table itself.
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;

CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR auth.uid() = id
  );
