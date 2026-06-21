import { useEffect, useState } from 'react';
import { Search, X, User, ShoppingBag, ChevronRight, DollarSign, Calendar, Plus, CreditCard as Edit2, Trash2, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

interface CustomerWithStats extends Profile {
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function callUserMgmt(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  refunded: 'bg-red-50 text-red-700 border-red-200',
};

function initials(c: CustomerWithStats) {
  return (c.full_name ?? c.email).charAt(0).toUpperCase();
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail panel
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async () => {
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, total, status, created_at'),
    ]);

    const ordersMap: Record<string, { count: number; total: number; last: string }> = {};
    (orders ?? []).forEach((o) => {
      if (!ordersMap[o.user_id]) ordersMap[o.user_id] = { count: 0, total: 0, last: o.created_at };
      ordersMap[o.user_id].count++;
      ordersMap[o.user_id].total += Number(o.total);
      if (o.created_at > ordersMap[o.user_id].last) ordersMap[o.user_id].last = o.created_at;
    });

    const enriched = (profiles ?? []).map((p) => ({
      ...p,
      orderCount: ordersMap[p.id]?.count ?? 0,
      totalSpent: ordersMap[p.id]?.total ?? 0,
      lastOrder: ordersMap[p.id]?.last ?? null,
    })) as CustomerWithStats[];

    setCustomers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const viewCustomer = async (c: CustomerWithStats) => {
    setSelected(c);
    setEditing(false);
    setMsg(null);
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, image_url))')
      .eq('user_id', c.id)
      .order('created_at', { ascending: false });
    setCustomerOrders(data ?? []);
    setLoadingOrders(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditName(selected.full_name ?? '');
    setEditEmail(selected.email);
    setEditing(true);
    setMsg(null);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    const result = await callUserMgmt('update', {
      user_id: selected.id,
      full_name: editName,
      ...(editEmail !== selected.email ? { email: editEmail } : {}),
    });
    setSaving(false);
    if (result.error) {
      setMsg({ type: 'error', text: result.error });
    } else {
      setMsg({ type: 'success', text: 'Customer updated.' });
      setEditing(false);
      const updated = { ...selected, full_name: editName || null, email: editEmail };
      setSelected(updated as CustomerWithStats);
      setCustomers((prev) => prev.map((c) => c.id === selected.id ? { ...c, full_name: editName || null, email: editEmail } : c));
    }
    setTimeout(() => setMsg(null), 3500);
  };

  const handleCreate = async () => {
    if (!createEmail || !createPassword) return;
    setCreating(true);
    const result = await callUserMgmt('create', {
      email: createEmail,
      full_name: createName || undefined,
      password: createPassword,
    });
    setCreating(false);
    if (result.error) {
      setCreateMsg({ type: 'error', text: result.error });
    } else {
      setCreateMsg({ type: 'success', text: 'Customer account created.' });
      setCreateEmail(''); setCreateName(''); setCreatePassword('');
      await fetchCustomers();
      setTimeout(() => { setShowCreate(false); setCreateMsg(null); }, 1500);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await callUserMgmt('delete', { user_id: deleteTarget.id });
    setDeleting(false);
    if (result.error) {
      alert(result.error);
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
    setDeleteTarget(null);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.email.toLowerCase().includes(s) || (c.full_name ?? '').toLowerCase().includes(s);
  });

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
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
        <span className="text-sm text-gray-500 hidden sm:block">
          <span className="font-semibold text-gray-900">{filtered.length}</span> customers
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}</p>
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
                  <th className="text-right px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => viewCustomer(c)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-red-600">{initials(c)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{c.full_name ?? 'Anonymous'}</p>
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
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">${c.totalSpent.toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
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

      {/* ── Customer detail drawer ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <span className="text-base font-bold text-red-600">{initials(selected)}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.full_name ?? 'Anonymous'}</p>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={startEdit}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setDeleteTarget(selected); setSelected(null); }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setSelected(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
                {[
                  { label: 'Orders', value: selected.orderCount, icon: ShoppingBag },
                  { label: 'Spent', value: `$${selected.totalSpent.toFixed(0)}`, icon: DollarSign },
                  { label: 'Member', value: new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), icon: Calendar },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white px-4 py-4 text-center">
                    <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Edit form */}
              {editing && (
                <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/40 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Edit Customer</p>
                  {msg && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {msg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {msg.text}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {/* Order history */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order History</p>
                {loadingOrders ? (
                  <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No orders placed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-semibold text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{order.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <div className="space-y-1">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate max-w-[180px]">{item.product?.name ?? 'Unknown'} × {item.quantity}</span>
                              <span className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                          <span className="text-xs font-semibold text-gray-600">Total</span>
                          <span className="text-sm font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setSelected(null)} className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Customer Modal ───────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Create Customer</h2>
              <button onClick={() => { setShowCreate(false); setCreateMsg(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {createMsg && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${createMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {createMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {createMsg.text}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name (optional)</label>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Jane Doe" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="jane@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min. 6 characters" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !createEmail || !createPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-1">Delete Customer?</h3>
              <p className="text-sm text-gray-500">
                This will permanently delete <span className="font-semibold text-gray-700">{deleteTarget.full_name ?? deleteTarget.email}</span> and all their data. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
