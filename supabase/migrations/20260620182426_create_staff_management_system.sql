-- Staff Management System
-- Roles: 'admin' (full), 'staff' (limited), 'customer' (default)

-- Allow admins to update any profile's role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'admins_update_any_profile'
  ) THEN
    CREATE POLICY "admins_update_any_profile" ON profiles FOR UPDATE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Staff invitations: pending email-based invites for users not yet registered
CREATE TABLE IF NOT EXISTS staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_invitations" ON staff_invitations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_insert_invitations" ON staff_invitations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_update_invitations" ON staff_invitations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);

-- Function: set any user's role (admin-only, prevents self-demotion)
CREATE OR REPLACE FUNCTION admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_user_id = auth.uid() AND p_role != 'admin' THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  IF p_role NOT IN ('admin', 'staff', 'customer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
END;
$$;

-- Function: invite staff by email (promotes if exists, creates pending invite if not)
CREATE OR REPLACE FUNCTION admin_invite_staff(p_email text, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_profile profiles%ROWTYPE;
  v_invite_id uuid;
  v_caller_email text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_role NOT IN ('admin', 'staff') THEN RAISE EXCEPTION 'Role must be admin or staff'; END IF;

  SELECT email INTO v_caller_email FROM profiles WHERE id = auth.uid();

  -- Check if user already has an account
  SELECT * INTO v_profile FROM profiles WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;

  IF FOUND THEN
    -- Promote immediately
    IF v_profile.id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot change your own role';
    END IF;
    UPDATE profiles SET role = p_role WHERE id = v_profile.id;
    RETURN json_build_object('action', 'promoted', 'user_id', v_profile.id, 'name', v_profile.full_name, 'email', v_profile.email);
  END IF;

  -- Cancel any existing pending invitation for this email
  UPDATE staff_invitations SET status = 'cancelled'
  WHERE LOWER(email) = LOWER(TRIM(p_email)) AND status = 'pending';

  -- Create pending invitation
  INSERT INTO staff_invitations (email, role, invited_by, invited_by_email)
  VALUES (LOWER(TRIM(p_email)), p_role, auth.uid(), v_caller_email)
  RETURNING id INTO v_invite_id;

  RETURN json_build_object('action', 'invited', 'invitation_id', v_invite_id, 'email', LOWER(TRIM(p_email)));
END;
$$;

-- Trigger: auto-apply pending invitation when a new user signs up
CREATE OR REPLACE FUNCTION apply_pending_staff_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation staff_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM staff_invitations
  WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.role := v_invitation.role;
    UPDATE staff_invitations SET status = 'accepted' WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_staff_invitation ON profiles;
CREATE TRIGGER check_staff_invitation
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION apply_pending_staff_invitation();
