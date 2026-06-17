export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  card_type: string | null;
  rarity: string | null;
  set_name: string | null;
  card_number: string | null;
  hp: number | null;
  in_stock: boolean;
  quantity: number;
  is_featured: boolean;
  condition: string | null;
  tcg_price: number | null;
  tcg_price_updated_at: string | null;
  use_custom_price: boolean;
  ebay_listing_id: string | null;
  ebay_offer_id: string | null;
  ebay_listing_status: 'active' | 'ended' | 'error' | null;
  ebay_listing_url: string | null;
  ebay_listed_at: string | null;
  ebay_listing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'customer';
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type CardType =
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Psychic'
  | 'Fighting'
  | 'Darkness'
  | 'Metal'
  | 'Fairy'
  | 'Dragon'
  | 'Colorless'
  | 'Lightning';

export type Rarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Ultra Rare'
  | 'Legendary'
  | 'Secret Rare';

export type Condition = 'Mint' | 'Near Mint' | 'Excellent' | 'Good' | 'Lightly Played';
