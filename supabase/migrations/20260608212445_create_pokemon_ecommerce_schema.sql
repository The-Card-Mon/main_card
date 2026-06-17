/*
# Pokémon Card E-Commerce Schema

1. New Tables
- `profiles`: User profiles with role (admin/customer). Admins can manage products; customers can browse and purchase.
  - `id` (uuid, PK, references auth.users)
  - `email` (text, not null)
  - `full_name` (text)
  - `role` (text, not null, default 'customer')
  - `created_at` (timestamptz)

- `products`: Pokémon card listings. Only admins can create/update/delete.
  - `id` (uuid, PK)
  - `name` (text, not null)
  - `description` (text)
  - `price` (numeric, not null)
  - `image_url` (text)
  - `card_type` (text) — e.g. Fire, Water, Grass, Electric, Psychic, Dragon
  - `rarity` (text) — e.g. Common, Uncommon, Rare, Ultra Rare, Legendary
  - `set_name` (text) — e.g. Base Set, Jungle, Fossil
  - `card_number` (text)
  - `hp` (integer)
  - `in_stock` (boolean, default true)
  - `quantity` (integer, default 1)
  - `is_featured` (boolean, default false)
  - `condition` (text) — e.g. Mint, Near Mint, Excellent, Good
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- `orders`: Customer orders.
  - `id` (uuid, PK)
  - `user_id` (uuid, not null, references auth.users)
  - `status` (text, default 'pending')
  - `total` (numeric, not null)
  - `shipping_address` (text)
  - `created_at` (timestamptz)

- `order_items`: Line items within an order.
  - `id` (uuid, PK)
  - `order_id` (uuid, not null, references orders)
  - `product_id` (uuid, not null, references products)
  - `quantity` (integer, not null)
  - `price` (numeric, not null) — price at time of purchase

2. Security
- RLS enabled on all tables.
- profiles: users can read own profile; admins can read all; users update own.
- products: anyone can read; only admins can insert/update/delete.
- orders: customers can read/create own orders; admins can read/update all.
- order_items: scoped through orders — customers see items in their orders; admins see all.

3. Important Notes
- Admin role is stored in profiles.role. Frontend checks role for UI gating.
- RLS policies use EXISTS checks against profiles for admin verification.
- products are publicly readable (catalog browsing) but write-restricted to admins.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
CREATE POLICY "admins_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  image_url text,
  card_type text,
  rarity text,
  set_name text,
  card_number text,
  hp integer,
  in_stock boolean NOT NULL DEFAULT true,
  quantity integer NOT NULL DEFAULT 1,
  is_featured boolean NOT NULL DEFAULT false,
  condition text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_products" ON products;
CREATE POLICY "anyone_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins_insert_products" ON products;
CREATE POLICY "admins_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admins_update_products" ON products;
CREATE POLICY "admins_update_products" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admins_delete_products" ON products;
CREATE POLICY "admins_delete_products" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total numeric NOT NULL CHECK (total >= 0),
  shipping_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_read_own_orders" ON orders;
CREATE POLICY "customers_read_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_read_all_orders" ON orders;
CREATE POLICY "admins_read_all_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "customers_insert_own_orders" ON orders;
CREATE POLICY "customers_insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_update_orders" ON orders;
CREATE POLICY "admins_update_orders" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_read_own_order_items" ON order_items;
CREATE POLICY "customers_read_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admins_read_all_order_items" ON order_items;
CREATE POLICY "admins_read_all_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "customers_insert_own_order_items" ON order_items;
CREATE POLICY "customers_insert_own_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_card_type ON products(card_type);
CREATE INDEX IF NOT EXISTS idx_products_rarity ON products(rarity);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Updated_at trigger for products
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
