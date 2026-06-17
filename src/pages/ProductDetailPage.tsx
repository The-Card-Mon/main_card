import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Minus, Plus, Zap, Star, Package, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { CARD_TYPE_COLORS, CARD_TYPE_PILL, RARITY_COLORS, RARITY_HOLO, RARITY_FOIL } from '../lib/constants';
import { useCart } from '../contexts/CartContext';

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
}

export default function ProductDetailPage({ productId, onBack }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      setProduct(data as Product | null);
      setLoading(false);
    })();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Card not found.</p>
          <button onClick={onBack} className="text-red-600 hover:text-red-700 font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const typeGradient = CARD_TYPE_COLORS[product.card_type ?? ''] ?? 'from-gray-400 to-gray-600';
  const typePill = CARD_TYPE_PILL[product.card_type ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const rarityPill = RARITY_COLORS[product.rarity ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const isHolo = RARITY_HOLO[product.rarity ?? ''] ?? false;
  const foilClass = RARITY_FOIL[product.rarity ?? ''] ?? '';

  const handleAdd = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Catalog
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Card image panel */}
          <div className={`relative rounded-3xl overflow-hidden shadow-2xl ${foilClass} ${isHolo ? 'holo' : ''}`}>
            {/* Type accent bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${typeGradient}`} />

            <div className={`relative bg-gradient-to-br ${typeGradient}`} style={{ height: '480px' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />

              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Zap className="w-28 h-28 text-white/15" />
                </div>
              )}

              {product.is_featured && (
                <div className="absolute top-4 left-4 z-20 bg-amber-500/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  Featured Card
                </div>
              )}

              {isHolo && !product.is_featured && (
                <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Holographic
                </div>
              )}
            </div>
          </div>

          {/* Card details */}
          <div className="flex flex-col">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.card_type && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${typePill}`}>
                  {product.card_type} Type
                </span>
              )}
              {product.rarity && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${rarityPill}`}>
                  {product.rarity}
                </span>
              )}
              {product.condition && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  {product.condition}
                </span>
              )}
            </div>

            <h1
              className="text-4xl font-bold text-gray-900 mb-3 leading-tight"
              style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
            >
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${product.price.toFixed(2)}
              </span>
            </div>

            {product.description && (
              <p className="text-gray-600 leading-relaxed mb-6 text-sm">{product.description}</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {product.hp && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">HP</p>
                  <p className="text-xl font-bold text-gray-900">{product.hp}</p>
                </div>
              )}
              {product.set_name && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Set</p>
                  <p className="font-bold text-gray-900 text-sm truncate">{product.set_name}</p>
                </div>
              )}
              {product.card_number && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Card #</p>
                  <p className="font-bold text-gray-900">{product.card_number}</p>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Available</p>
                <p className={`font-bold text-sm ${product.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                  {product.in_stock ? `${product.quantity} in stock` : 'Out of stock'}
                </p>
              </div>
            </div>

            {/* Add to cart */}
            {product.in_stock && product.quantity > 0 ? (
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="p-3 hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 py-2.5 text-sm font-bold text-gray-900 min-w-[3rem] text-center border-x border-gray-200">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(product.quantity, qty + 1))}
                    className="p-3 hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                    added
                      ? 'bg-green-600 text-white shadow-green-900/20'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/25'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {added ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </div>
            ) : (
              <div className="mt-auto flex items-center gap-2 p-4 bg-gray-100 rounded-xl text-gray-500 border border-gray-200">
                <Package className="w-5 h-5" />
                <span className="font-semibold text-sm">Currently out of stock</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
