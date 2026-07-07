ALTER TABLE public.modal_config
  ADD COLUMN IF NOT EXISTS maintenance_enabled       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_title         text    NOT NULL DEFAULT 'We''ll Be Right Back',
  ADD COLUMN IF NOT EXISTS maintenance_message       text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maintenance_bg_image_url  text    NOT NULL DEFAULT '';