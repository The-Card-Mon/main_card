-- Allow customers to respond to an offer (accept or decline)
-- USING: can only update their own submission when status is 'offer_made'
-- WITH CHECK: can only set status to 'accepted' or 'rejected'
CREATE POLICY "customer_respond_to_offer" ON sell_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'offer_made')
  WITH CHECK (auth.uid() = user_id AND status IN ('accepted', 'rejected'));
