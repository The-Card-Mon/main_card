-- Single-row promotion modal config
CREATE TABLE IF NOT EXISTS modal_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'Welcome to The Card Mon',
  body_text text NOT NULL DEFAULT 'Discover authenticated Pokemon cards for every collector.',
  bg_image_url text NOT NULL DEFAULT '',
  button_enabled boolean NOT NULL DEFAULT false,
  button_text text NOT NULL DEFAULT 'Shop Now',
  button_page text NOT NULL DEFAULT 'catalog',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the row
INSERT INTO modal_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE modal_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed to show the popup publicly)
CREATE POLICY "read_modal_config" ON modal_config
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can update
CREATE POLICY "update_modal_config_admin" ON modal_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Storage bucket for modal background images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'modal-images',
  'modal-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "public_read_modal_images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'modal-images');

CREATE POLICY "admin_upload_modal_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'modal-images' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_update_modal_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'modal-images' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_delete_modal_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'modal-images' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
