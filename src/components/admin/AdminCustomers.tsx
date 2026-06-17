import { useEffect, useState } from 'react';
import { Search, X, User, ShoppingBag, ChevronRight, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

interface CustomerWithStats extends Profile {
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total, status, created_at');

      const ordersMap: Record<string, { count: number; total: number; last: string }> = {};
      (orders ?? []).forEach((o) => {
        if (!ordersMap[o.user_id]) {
          ordersMap[o.user_id] = { count: 0, total: 0, last: o.created_at };
        }
        ordersMap[o.user_id].count++;
        ordersMap[o.user_id].total += o.total;
        if (o.created_at > ordersMap[o.user_id].last) {
          ordersMap[o.user_id].last = o.created_at;
        }
      });

      const enriched = (profiles ?? []).map((p) => ({
        ...p,
        orderCount: ordersMap[p.id]?.count ?? 0,
        totalSpent: ordersMap[p.id]?.total ?? 0,
        lastOrder: ordersMap[p.id]?.last ?? null,
      })) as CustomerWithStats[];

      setCustomers(enriched);
      setLoading(false);
    })();
  }, []);

  const viewCustomer = async (c: CustomerWithStats) => {
    setSelected(c);
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, image_url))')
      .eq('user_id', c.id)
      .order('created_at', { ascending: false });
    setCustomerOrders(data ?? []);
    setLoadingOrders(false);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(s) ||
      (c.full_name ?? '').toLowerCase().includes(s)
    );
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filtered.length}</span> customers
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Order</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => viewCustomer(c)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-red-600">
                            {(c.full_name ?? c.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {c.full_name ?? 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">{c.orderCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">
                      ${c.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {c.lastOrder
                        ? new Date(c.lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <span className="text-base font-bold text-red-600">
                    {(selected.full_name ?? selected.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.full_name ?? 'Anonymous'}</p>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
                {[
                  { label: 'Orders', value: selected.orderCount, icon: ShoppingBag },
                  { label: 'Spent', value: `$${selected.totalSpent.toFixed(0)}`, icon: DollarSign },
                  {
                    label: 'Member Since',
                    value: new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    icon: Calendar,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white px-4 py-4 text-center">
                    <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Orders */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Order History
                </p>
                {loadingOrders ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No orders placed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-semibold text-gray-600">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <div className="space-y-1">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate max-w-[180px]">
                                {item.product?.name ?? 'Unknown'} × {item.quantity}
                              </span>
                              <span className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                          <span className="text-xs font-semibold text-gray-600">Total</span>
                          <span className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
