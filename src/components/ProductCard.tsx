import { ShoppingCart, Eye, Zap, Star, Sparkles } from 'lucide-react';
import type { Product } from '../types';
import { CARD_TYPE_COLORS, CARD_TYPE_ACCENT, CARD_TYPE_PILL, RARITY_COLORS, RARITY_HOLO, RARITY_FOIL } from '../lib/constants';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  product: Product;
  onView: (id: string) => void;
}

export default function ProductCard({ product, onView }: ProductCardProps) {
  const { addItem } = useCart();
  const typeGradient = CARD_TYPE_COLORS[product.card_type ?? ''] ?? 'from-gray-400 to-gray-600';
  const typeAccent = CARD_TYPE_ACCENT[product.card_type ?? ''] ?? 'bg-gray-400';
  const typePill = CARD_TYPE_PILL[product.card_type ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const rarityPill = RARITY_COLORS[product.rarity ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const isHolo = RARITY_HOLO[product.rarity ?? ''] ?? false;
  const foilClass = RARITY_FOIL[product.rarity ?? ''] ?? '';

  return (
    <div
      className={`group bg-white rounded-xl overflow-hidden transition-all duration-300 card-lift cursor-pointer border border-gray-100 shadow-card hover:shadow-card-hover flex flex-col ${foilClass} ${isHolo ? 'holo' : ''}`}
    >
      {/* Type accent bar */}
      <div className={`h-0.5 w-full ${typeAccent} flex-shrink-0`} />

      {/* Image — 5:7 = Pokemon TCG aspect ratio */}
      <div
        className={`relative bg-gradient-to-br ${typeGradient} overflow-hidden aspect-[5/7] flex items-center justify-center`}
        onClick={() => onView(product.id)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-10 pointer-events-none" />

        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500 drop-shadow-xl"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Zap className="w-10 h-10 text-white/25" />
          </div>
        )}

        {/* Badges */}
        {product.is_featured && (
          <div className="absolute top-2 left-2 z-20 bg-amber-500/95 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Star className="w-2 h-2 fill-white" />
            FEATURED
          </div>
        )}
        {isHolo && !product.is_featured && (
          <div className="absolute top-2 left-2 z-20 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-white/30">
            <Sparkles className="w-2 h-2" />
            HOLO
          </div>
        )}

        {/* Price */}
        <div className="absolute bottom-2 right-2 z-20 bg-gray-950/85 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-md shadow border border-white/10">
          ${product.price.toFixed(2)}
        </div>

        {/* Condition chip */}
        {product.condition && (
          <div className="absolute bottom-2 left-2 z-20 bg-black/60 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded border border-white/15">
            {product.condition}
          </div>
        )}

        {/* Out of stock */}
        {!product.in_stock && (
          <div className="absolute inset-0 z-30 bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wider px-2.5 py-1 rounded-md bg-black/40 border border-white/20">
              OUT OF STOCK
            </span>
          </div>
        )}

        {/* Quick-view overlay on hover */}
        <div className="absolute inset-0 z-25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold border border-white/20 shadow">
            <Eye className="w-3 h-3" />
            Quick View
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <h3
          className="font-bold text-gray-900 text-xs leading-snug line-clamp-2 group-hover:text-red-600 transition-colors cursor-pointer"
          onClick={() => onView(product.id)}
        >
          {product.name}
        </h3>

        {product.set_name && (
          <p className="text-[10px] text-gray-400 truncate leading-none">{product.set_name}</p>
        )}

        {/* Type + Rarity pills */}
        {(product.card_type || product.rarity) && (
          <div className="flex flex-wrap gap-1">
            {product.card_type && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border leading-none ${typePill}`}>
                {product.card_type}
              </span>
            )}
            {product.rarity && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border leading-none ${rarityPill}`}>
                {product.rarity}
              </span>
            )}
          </div>
        )}

        {/* Add to cart */}
        <div className="mt-auto pt-1">
          {product.in_stock && product.quantity > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); addItem(product); }}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-sm"
            >
              <ShoppingCart className="w-3 h-3" />
              Add to Cart
            </button>
          ) : (
            <button
              onClick={() => onView(product.id)}
              className="w-full py-1.5 text-[11px] font-semibold border border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
