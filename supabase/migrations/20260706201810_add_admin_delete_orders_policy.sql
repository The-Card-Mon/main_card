CREATE POLICY "admins_delete_orders" ON orders FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));