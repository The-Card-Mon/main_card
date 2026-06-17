-- Fix contact_submissions INSERT: restrict to status='new' only
-- This prevents submitters from injecting a pre-set non-default status
DROP POLICY IF EXISTS "insert_contact_submissions" ON contact_submissions;
CREATE POLICY "insert_contact_submissions" ON contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new');
