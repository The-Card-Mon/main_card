CREATE TABLE sell_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  submission_type text NOT NULL CHECK (submission_type IN ('individual', 'collection')),
  -- Collection-level fields
  description text,
  card_count integer,
  overall_condition text,
  image_urls text[] NOT NULL DEFAULT '{}',
  asking_price numeric(10,2),
  -- Admin fields
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','offer_made','accepted','rejected','completed')),
  offer_amount numeric(10,2),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sell_submission_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES sell_submissions(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  set_name text,
  card_number text,
  condition text,
  quantity integer NOT NULL DEFAULT 1,
  notes text
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_sell_submission_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sell_submissions_updated_at
  BEFORE UPDATE ON sell_submissions
  FOR EACH ROW EXECUTE FUNCTION update_sell_submission_updated_at();

-- Indexes
CREATE INDEX sell_submissions_user_id_idx ON sell_submissions(user_id);
CREATE INDEX sell_submissions_status_idx ON sell_submissions(status);
CREATE INDEX sell_submission_cards_submission_id_idx ON sell_submission_cards(submission_id);

-- RLS
ALTER TABLE sell_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_submission_cards ENABLE ROW LEVEL SECURITY;

-- sell_submissions policies
CREATE POLICY "users_insert_own_submissions" ON sell_submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anon_insert_submissions" ON sell_submissions FOR INSERT
  TO anon WITH CHECK (user_id IS NULL);

CREATE POLICY "users_select_own_submissions" ON sell_submissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin_select_all_submissions" ON sell_submissions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_update_submissions" ON sell_submissions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- sell_submission_cards policies
CREATE POLICY "users_insert_own_cards" ON sell_submission_cards FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM sell_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "anon_insert_cards" ON sell_submission_cards FOR INSERT
  TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM sell_submissions s WHERE s.id = submission_id AND s.user_id IS NULL
    )
  );

CREATE POLICY "users_select_own_cards" ON sell_submission_cards FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sell_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_all_cards" ON sell_submission_cards FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_update_cards" ON sell_submission_cards FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_delete_cards" ON sell_submission_cards FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
