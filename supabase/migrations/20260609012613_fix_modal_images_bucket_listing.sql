-- Drop overly broad SELECT policy on modal-images storage bucket.
-- Public buckets serve files via their public URL without needing an RLS
-- SELECT grant; the policy only enabled full bucket listing.
DROP POLICY IF EXISTS "public_read_modal_images" ON storage.objects;
