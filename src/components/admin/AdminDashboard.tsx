import { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  outOfStock: number;
  featuredCards: number;
  recentOrders: any[];
  topProducts: any[];
}

const ORDER_STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
  processing: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Delivered' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ordersRes, productsRes, profilesRes, recentOrdersRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at'),
        supabase.from('products').select('id, name, price, quantity, in_stock, is_featured, rarity'),
        supabase.from('profiles').select('id').eq('role', 'customer'),
        supabase
          .from('orders')
          .select('id, total, status, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];
      const customers = profilesRes.data ?? [];
      const recentOrders = recentOrdersRes.data ?? [];

      const totalRevenue = orders
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + o.total, 0);

      const rarityCounts: Record<string, number> = {};
      products.forEach((p) => {
        const r = p.rarity ?? 'Unknown';
        rarityCounts[r] = (rarityCounts[r] ?? 0) + 1;
      });

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        outOfStock: products.filter((p) => !p.in_stock || p.quantity === 0).length,
        featuredCards: products.filter((p) => p.is_featured).length,
        recentOrders,
        topProducts: products.slice(0, 5),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      sub: 'From delivered orders',
      subColor: 'text-emerald-600',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      sub: `${stats.pendingOrders} pending`,
      subColor: stats.pendingOrders > 0 ? 'text-amber-600' : 'text-gray-400',
    },
    {
      label: 'Products Listed',
      value: stats.totalProducts,
      icon: Package,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      sub: `${stats.outOfStock} out of stock`,
      subColor: stats.outOfStock > 0 ? 'text-red-500' : 'text-gray-400',
    },
    {
      label: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      sub: `${stats.featuredCards} featured cards`,
      subColor: 'text-gray-400',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, iconBg, iconColor, sub, subColor }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className={`text-xs font-medium mt-2 ${subColor}`}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <span className="text-xs text-gray-400 font-medium">Last 8 orders</span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentOrders.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">No orders yet</div>
            ) : (
              stats.recentOrders.map((order) => {
                const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={order.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} border flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Inventory snapshot */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Inventory Snapshot</h2>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: 'Total Listings',
                value: stats.totalProducts,
                bar: 100,
                color: 'bg-blue-500',
              },
              {
                label: 'In Stock',
                value: stats.totalProducts - stats.outOfStock,
                bar: stats.totalProducts
                  ? Math.round(((stats.totalProducts - stats.outOfStock) / stats.totalProducts) * 100)
                  : 0,
                color: 'bg-emerald-500',
              },
              {
                label: 'Out of Stock',
                value: stats.outOfStock,
                bar: stats.totalProducts
                  ? Math.round((stats.outOfStock / stats.totalProducts) * 100)
                  : 0,
                color: 'bg-red-400',
              },
              {
                label: 'Featured',
                value: stats.featuredCards,
                bar: stats.totalProducts
                  ? Math.round((stats.featuredCards / stats.totalProducts) * 100)
                  : 0,
                color: 'bg-amber-400',
              },
            ].map(({ label, value, bar, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{value}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${bar}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
                Pending Action
              </p>
              <p className="text-2xl font-bold text-red-700">{stats.pendingOrders}</p>
              <p className="text-sm text-red-600">order{stats.pendingOrders !== 1 ? 's' : ''} need fulfillment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
