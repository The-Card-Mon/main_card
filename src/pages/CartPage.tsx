import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface CartPageProps {
  onNavigate: (page: string) => void;
}

export default function CartPage({ onNavigate }: CartPageProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-200">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h2
            className="text-3xl font-bold text-gray-900 mb-2"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Cart is Empty
          </h2>
          <p className="text-gray-500 mb-8 text-sm">Add some amazing cards to get started!</p>
          <button
            onClick={() => onNavigate('catalog')}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
          >
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1
          className="text-3xl font-bold text-gray-900 mb-8"
          style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
        >
          Shopping Cart
          <span className="ml-3 text-lg font-semibold text-gray-400">({items.length} item{items.length !== 1 ? 's' : ''})</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="rounded-xl flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-200" style={{ width: '72px', height: '72px' }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{product.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[product.card_type, product.rarity].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1.5">${product.price.toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="p-2 hover:bg-gray-100 transition-colors text-gray-500"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 text-sm font-bold text-gray-900 min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition-colors text-gray-500"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 shadow-sm">
              <h3
                className="font-bold text-gray-900 text-lg mb-5"
                style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
              >
                Order Summary
              </h3>

              <div className="space-y-3 mb-5">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-xs text-gray-500">
                    <span className="truncate mr-2">{product.name} ×{quantity}</span>
                    <span className="font-semibold text-gray-700 flex-shrink-0">
                      ${(product.price * quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 mt-2">
                  <span className="font-bold text-gray-900">Total</span>
                  <span
                    className="font-bold text-gray-900 text-xl"
                    style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
                  >
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {user ? (
                <button
                  onClick={() => onNavigate('checkout')}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('auth')}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
                >
                  Sign In to Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
