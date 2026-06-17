CREATE TABLE social_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'both')),
  content         TEXT NOT NULL,
  image_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  facebook_post_id TEXT,
  instagram_post_id TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_social_posts" ON social_posts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_insert_social_posts" ON social_posts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_update_social_posts" ON social_posts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_delete_social_posts" ON social_posts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX social_posts_status_scheduled_idx ON social_posts (status, scheduled_at);

-- Schedule a check every 5 minutes for posts due to publish
SELECT cron.schedule(
  'social-post-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://eizmeetiswclgeftwefb.supabase.co/functions/v1/social-post',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body    := '{"action":"check-scheduled"}'::jsonb
  );
  $$
);
