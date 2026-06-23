import { useEffect, useState } from 'react';
import {
  User,
  Package,
  Lock,
  ChevronRight,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Clock,
  Truck,
  Eye,
  EyeOff,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Calendar,
  CreditCard,
  MapPin,
  Loader2,
  LayoutDashboard,
  Coins,
  ArrowDownToLine,
  TrendingUp,
  Gift,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Order, OrderItem, Product } from '../types';

type Tab = 'overview' | 'orders' | 'rewards' | 'profile' | 'security';

interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product | null })[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',  icon: Package },
  shipped:    { label: 'Shipped',    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', icon: CheckCircle },
};

interface AccountPageProps {
  onNavigate: (page: string) => void;
  initialTab?: Tab;
}

export default function AccountPage({ onNavigate, initialTab = 'overview' }: AccountPageProps) {
  const { user, profile, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Orders
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Rewards
  type LedgerRow = { id: string; type: string; amount: number; description: string; created_at: string };
  const [pkbLedger, setPkbLedger] = useState<LedgerRow[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);

  // Profile edit
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as OrderWithItems[]) ?? []);
        setOrdersLoading(false);
      });

    supabase
      .from('rewards_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPkbLedger((data ?? []) as LedgerRow[]);
        setRewardsLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please sign in to view your account.</p>
          <button
            onClick={() => onNavigate('auth')}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const initials = (profile?.full_name ?? user.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    setProfileSaving(false);
    setProfileMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Profile updated successfully.' }
    );
    setTimeout(() => setProfileMsg(null), 3500);
  };

  const savePassword = async () => {
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    // Re-authenticate first
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
    if (authErr) {
      setPwSaving(false);
      setPwMsg({ type: 'error', text: 'Current password is incorrect.' });
      setTimeout(() => setPwMsg(null), 4000);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
    setTimeout(() => setPwMsg(null), 4000);
  };

  const pkbBalance = pkbLedger.reduce((sum, r) => sum + Number(r.amount), 0);

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders',   label: 'My Orders', icon: Package },
    { id: 'rewards',  label: 'PokeBucks',  icon: Coins },
    { id: 'profile',  label: 'Profile',   icon: User },
    { id: 'security', label: 'Security',  icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your profile, orders, and security settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-200 mb-3">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm leading-snug">
                {profile?.full_name || 'Collector'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-full">{user.email}</p>
              <div className="mt-3 px-3 py-1 bg-red-50 border border-red-100 rounded-full">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Customer</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                    tab === id
                      ? 'bg-red-50 text-red-700 border-l-2 border-l-red-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ${tab === id ? 'text-red-400' : 'text-gray-300'}`} />
                </button>
              ))}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'PokeBucks', value: `${Math.max(0, pkbBalance).toLocaleString()} $PKB`, icon: Coins, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'Member Since', value: new Date(profile?.created_at ?? '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <p className="text-xs text-gray-400 font-medium">{label}</p>
                      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Welcome card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
                  <div className="relative">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Welcome back</p>
                    <h2 className="text-2xl font-bold mb-1">{profile?.full_name || 'Collector'}</h2>
                    <p className="text-gray-400 text-sm">
                      {orders.length === 0
                        ? 'You haven\'t placed any orders yet. Start browsing our catalog!'
                        : `You have ${orders.length} order${orders.length !== 1 ? 's' : ''} in your history.`}
                    </p>
                    <button
                      onClick={() => onNavigate('catalog')}
                      className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-900/40"
                    >
                      Browse Catalog
                    </button>
                  </div>
                </div>

                {/* Recent orders */}
                {orders.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 text-sm">Recent Orders</h3>
                      <button
                        onClick={() => setTab('orders')}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        View all
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {orders.slice(0, 3).map((order) => {
                        const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                        const StatusIcon = cfg.icon;
                        return (
                          <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                              <span className="text-sm font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ORDERS ── */}
            {tab === 'orders' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Order History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Package className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium mb-1">No orders yet</p>
                    <p className="text-sm text-gray-400 mb-5">When you make a purchase, it'll appear here.</p>
                    <button
                      onClick={() => onNavigate('catalog')}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {orders.map((order) => {
                      const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                      const StatusIcon = cfg.icon;
                      const isExpanded = expandedOrder === order.id;
                      return (
                        <div key={order.id}>
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  Order #{order.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(order.created_at).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                ${Number(order.total).toFixed(2)}
                              </span>
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                              }
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="bg-gray-50/60 border-t border-gray-100 px-6 py-4 space-y-3">
                              {/* Mobile status badge */}
                              <div className="sm:hidden">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                              </div>

                              {order.shipping_address && (
                                <div className="flex items-start gap-2 text-xs text-gray-500">
                                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                                  {order.shipping_address}
                                </div>
                              )}

                              <div className="space-y-2">
                                {order.order_items?.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      {item.product?.image_url ? (
                                        <img src={item.product.image_url} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                          <Package className="w-4 h-4 text-gray-300" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{item.product?.name ?? 'Unknown Card'}</p>
                                        <p className="text-xs text-gray-400">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">
                                      ${(Number(item.price) * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-end pt-1">
                                <div className="text-sm text-gray-500">
                                  Order total: <span className="font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── REWARDS ── */}
            {tab === 'rewards' && (
              <>
                {/* Balance hero */}
                <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-yellow-900/20">
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0, transparent 50%)', backgroundSize: '100% 100%' }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-yellow-100" />
                      <span className="text-xs font-bold text-yellow-100 uppercase tracking-widest">PokeBucks Balance</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                      {rewardsLoading ? '—' : Math.max(0, pkbBalance).toLocaleString()}
                    </p>
                    <p className="text-yellow-100 font-semibold text-lg">$PKB</p>
                    <p className="text-yellow-200 text-sm mt-1">Spend on Mystery Boxes — no cash value</p>
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-lg px-3 py-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-yellow-100" />
                        <span className="text-xs font-semibold text-yellow-100">10 $PKB per $1 spent</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-lg px-3 py-1.5">
                        <Gift className="w-3.5 h-3.5 text-yellow-100" />
                        <span className="text-xs font-semibold text-yellow-100">Spend on Mystery Boxes</span>
                      </div>
                      <button
                        onClick={() => onNavigate('mystery-boxes')}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <span className="text-xs font-bold text-white">Open Mystery Boxes</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Shop & earn', desc: 'Get 10 $PKB for every $1 you spend on any order.' },
                    { step: '2', title: 'Accumulate points', desc: 'Points never expire. Stack them up over time.' },
                    { step: '3', title: 'Open Mystery Boxes', desc: 'Spend your $PKB on Bronze, Silver, or Gold Mystery Boxes. Points have no cash value.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-700 font-black text-sm flex items-center justify-center mb-3">
                        {step}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Transaction history */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">Transaction History</h3>
                  </div>
                  {rewardsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                  ) : pkbLedger.length === 0 ? (
                    <div className="text-center py-12">
                      <Coins className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-medium">No transactions yet</p>
                      <p className="text-xs text-gray-300 mt-1">Make a purchase to earn your first $PKB!</p>                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {pkbLedger.map((row) => {
                        const isCredit = Number(row.amount) > 0;
                        const typeLabel: Record<string, string> = {
                          earned: 'Earned', spent: 'Redeemed', withdrawn: 'Withdrawn',
                          bonus: 'Bonus', refunded: 'Refunded', manual: 'Admin Award',
                        };
                        return (
                          <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isCredit ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                              {isCredit
                                ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                : <ArrowDownToLine className="w-3.5 h-3.5 text-red-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{row.description}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {typeLabel[row.type] ?? row.type} · {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                {isCredit ? '+' : ''}{Number(row.amount).toLocaleString()} $PKB
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-semibold text-gray-900">Profile Information</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Update your display name</p>
                </div>
                <div className="p-6 space-y-5">
                  {profileMsg && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                      profileMsg.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {profileMsg.type === 'success'
                        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                      {profileMsg.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Email address cannot be changed.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Account Role
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg capitalize">
                        {profile?.role ?? 'Customer'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={saveProfile}
                      disabled={profileSaving}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-900">Change Password</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {pwMsg && (
                      <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                        pwMsg.type === 'success'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {pwMsg.type === 'success'
                          ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                        {pwMsg.text}
                      </div>
                    )}

                    {[
                      { label: 'Current Password', val: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                      { label: 'New Password', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew) },
                      { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw, show: showNew, toggle: () => setShowNew(!showNew) },
                    ].map(({ label, val, set, show, toggle }, i) => (
                      <div key={i}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          {label}
                        </label>
                        <div className="relative">
                          <input
                            type={show ? 'text' : 'password'}
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                            placeholder={i === 0 ? 'Your current password' : 'Min. 6 characters'}
                          />
                          <button
                            type="button"
                            onClick={toggle}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="pt-1">
                      <button
                        onClick={savePassword}
                        disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        {pwSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sign out all devices */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-900">Session</h2>
                  </div>
                  <div className="p-6 flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Sign out of your account</p>
                      <p className="text-xs text-gray-400 mt-0.5">You'll need to sign back in to access your account.</p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
