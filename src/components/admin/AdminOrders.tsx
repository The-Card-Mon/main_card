import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  AlertCircle,
  Truck,
  CheckCircle,
  ChevronRight,
  Package,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderWithItems {
  id: string;
  user_id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product_id: string;
    product?: { name: string; image_url: string | null; card_type: string | null };
  }[];
}

const STATUS = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' },
  processing: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
} as const;

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'] as const;

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, image_url, card_type))')
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...orders];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((o) => o.id.toLowerCase().includes(s) || o.user_id.toLowerCase().includes(s));
    }
    if (filterStatus) r = r.filter((o) => o.status === filterStatus);
    return r;
  }, [orders, search, filterStatus]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    await supabase.from('orders').update({ status }).eq('id', orderId);
    await fetchOrders();
    setUpdating(null);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status } : null);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return counts;
  }, [orders]);

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS[status as keyof typeof STATUS] ?? STATUS.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            !filterStatus ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All <span className="ml-1 opacity-60">{orders.length}</span>
        </button>
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filterStatus === s
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              {(statusCounts[s] ?? 0) > 0 && (
                <span className="ml-0.5 opacity-70">{statusCounts[s]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold font-mono text-gray-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">
                        {order.user_id.slice(0, 12)}...
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex -space-x-2">
                        {order.order_items.slice(0, 3).map((item, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white overflow-hidden flex-shrink-0"
                          >
                            {item.product?.image_url ? (
                              <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Package className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.order_items.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-medium">
                            +{order.order_items.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>{STATUS[s].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order detail drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0">
              <div>
                <p className="font-bold text-gray-900 font-mono">
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(selectedOrder.created_at).toLocaleString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Status pipeline */}
              <div className="px-6 pt-5 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Order Status
                </p>
                <div className="flex items-center gap-1 mb-4">
                  {STATUS_ORDER.map((s, i) => {
                    const reached = STATUS_ORDER.indexOf(selectedOrder.status as any) >= i;
                    const cfg = STATUS[s];
                    const Icon = cfg.icon;
                    return (
                      <div key={s} className="flex-1 flex items-center gap-1">
                        <div
                          className={`flex-1 h-1.5 rounded-full transition-colors ${reached ? 'bg-red-500' : 'bg-gray-200'}`}
                        />
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            reached ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-gray-50 border-gray-200 text-gray-300'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {i < STATUS_ORDER.length - 1 && (
                          <div className={`flex-1 h-1.5 rounded-full transition-colors ${
                            STATUS_ORDER.indexOf(selectedOrder.status as any) > i ? 'bg-red-500' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-medium -mt-1">
                  {STATUS_ORDER.map((s) => <span key={s}>{STATUS[s].label}</span>)}
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Update Status
                  </label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                    disabled={!!updating}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Items */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Items ({selectedOrder.order_items.length})
                </p>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                          {item.product?.name ?? 'Unknown Card'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.product?.card_type ?? ''} · Qty {item.quantity}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Summary */}
              <div className="px-6 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Order Summary
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Order Total</span>
                  <span className="ml-auto font-bold text-gray-900">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Shipping Address</p>
                    <p className="text-gray-800 text-sm">
                      {selectedOrder.shipping_address ?? 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Placed</span>
                  <span className="ml-auto text-gray-800">
                    {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Close
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
