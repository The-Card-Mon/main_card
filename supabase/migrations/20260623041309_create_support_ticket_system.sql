-- Support Tickets
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number bigint GENERATED ALWAYS AS IDENTITY,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'contact_form'
    CHECK (source IN ('contact_form', 'email', 'manual')),
  contact_submission_id uuid REFERENCES contact_submissions(id) ON DELETE SET NULL,
  first_message text NOT NULL,
  reply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Staff/admin can read all tickets
CREATE POLICY "staff_read_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Anyone can create a ticket (contact form, anon)
CREATE POLICY "anon_insert_tickets" ON support_tickets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Staff/admin can update tickets
CREATE POLICY "staff_update_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Ticket Replies
CREATE TABLE ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'customer'
    CHECK (author_role IN ('customer', 'staff', 'admin')),
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

-- Staff/admin can read all replies
CREATE POLICY "staff_read_replies" ON ticket_replies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Anyone can insert non-internal replies (customer follow-ups)
CREATE POLICY "anon_insert_replies" ON ticket_replies FOR INSERT
  TO anon, authenticated WITH CHECK (is_internal = false);

-- Staff/admin can insert internal notes and public replies
CREATE POLICY "staff_insert_replies" ON ticket_replies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Indexes
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment reply_count and bump updated_at on new reply
CREATE OR REPLACE FUNCTION on_ticket_reply_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets
  SET reply_count = reply_count + 1,
      updated_at  = now(),
      status      = CASE
                      WHEN status = 'waiting' AND NEW.author_role = 'customer' THEN 'open'
                      ELSE status
                    END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_reply_bump ON ticket_replies;
CREATE TRIGGER ticket_reply_bump
  AFTER INSERT ON ticket_replies
  FOR EACH ROW EXECUTE FUNCTION on_ticket_reply_insert();

-- Security definer function: create ticket + first reply atomically
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_subject       text,
  p_customer_name text,
  p_customer_email text,
  p_message       text,
  p_source        text DEFAULT 'contact_form',
  p_contact_submission_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
BEGIN
  INSERT INTO support_tickets (subject, customer_name, customer_email, first_message, source, contact_submission_id)
  VALUES (p_subject, p_customer_name, p_customer_email, p_message, p_source, p_contact_submission_id)
  RETURNING id INTO v_ticket_id;

  INSERT INTO ticket_replies (ticket_id, author_name, author_role, body, is_internal)
  VALUES (v_ticket_id, p_customer_name, 'customer', p_message, false);

  RETURN v_ticket_id;
END;
$$;
