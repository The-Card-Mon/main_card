import { useEffect, useState } from 'react';
import { Package, Clock, Truck, CheckCircle, ExternalLink, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Order, OrderItem, Product } from '../types';

interface OrderWithItems extends Order {
  shipping_method_name: string | null;
  shipping_cost: number;
  tracking_number: string | null;
  tracking_carrier: string | null;
  shipped_at: string | null;
  order_items: (OrderItem & { product: Product | null })[];
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
};

const CARRIER_TRACKING_URLS: Record<string, (n: string) => string> = {
  USPS:              (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  UPS:               (n) => `https://www.ups.com/track?tracknum=${n}`,
  FedEx:             (n) => `https://www.fedex.com/fedextrack/?tracknumbers=${n}`,
  DHL:               (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
  'Amazon Logistics':(n) => `https://www.amazon.com/progress-tracker/package/?_encoding=UTF8&packageIndex=0&orderId=${n}`,
  OnTrac:            (n) => `https://www.ontrac.com/tracking.asp?tracking_number=${n}`,
};

function getTrackingUrl(carrier: string | null, number: string): string | null {
  if (!carrier || !number) return null;
  const fn = CARRIER_TRACKING_URLS[carrier];
  return fn ? fn(number) : null;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please sign in to view your orders.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const trackingUrl = getTrackingUrl(order.tracking_carrier, order.tracking_number ?? '');

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          Order #{order.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {order.shipping_address && (
                      <div className="flex items-start gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-400">{order.shipping_address}</p>
                      </div>
                    )}

                    {/* Shipping method */}
                    {order.shipping_method_name && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Truck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500">
                          {order.shipping_method_name}
                          {Number(order.shipping_cost) > 0 && ` · $${Number(order.shipping_cost).toFixed(2)}`}
                          {Number(order.shipping_cost) === 0 && ' · Free'}
                        </p>
                      </div>
                    )}

                    {/* Tracking info */}
                    {order.tracking_number && (
                      <div className="flex items-center gap-2 mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <Truck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-indigo-700">
                            {order.tracking_carrier ? `${order.tracking_carrier} Tracking` : 'Tracking Number'}
                          </p>
                          <p className="text-xs font-mono text-indigo-600 truncate">{order.tracking_number}</p>
                        </div>
                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0 transition-colors"
                          >
                            Track <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-indigo-500 flex-shrink-0">No link</span>
                        )}
                      </div>
                    )}

                    <div className="border-t border-gray-50 pt-3 space-y-2">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {item.product?.name ?? 'Unknown Card'} x{item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
