ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS email_message_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_support_tickets_email_message_id
  ON support_tickets(email_message_id)
  WHERE email_message_id IS NOT NULL;
