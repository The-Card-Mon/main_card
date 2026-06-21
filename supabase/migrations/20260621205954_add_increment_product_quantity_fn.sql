CREATE OR REPLACE FUNCTION increment_product_quantity(p_product_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET quantity = quantity + p_qty,
      in_stock = true
  WHERE id = p_product_id;
END;
$$;

-- Also add 'refunded' to orders status if not already there
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled'));
