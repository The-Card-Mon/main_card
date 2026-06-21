import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Receipt, Plus, CreditCard as Edit2, Trash2, Loader2, CheckCircle, AlertTriangle, X, ToggleLeft, ToggleRight, BarChart2, ShoppingBag, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TaxRule {
  id: string;
  name: string;
  rate: number;
  applies_to: 'all' | 'state' | 'country';
  region_code: string | null;
  is_active: boolean;
  created_at: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalTax: number;
  netRevenue: number;
  orderCount: number;
  refundedAmount: number;
  avgOrderValue: number;
  byMonth: { month: string; revenue: number; tax: number; orders: number }[];
}

const EMPTY_RULE: Omit<TaxRule, 'id' | 'created_at'> = {
  name: '',
  rate: 0,
  applies_to: 'all',
  region_code: null,
  is_active: true,
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminFinance() {
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [form, setForm] = useState(EMPTY_RULE);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: taxData }, { data: ordersData }] = await Promise.all([
      supabase.from('tax_config').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('total, tax_amount, payment_status, status, created_at'),
    ]);

    setRules((taxData ?? []) as TaxRule[]);

    const orders = (ordersData ?? []) as { total: number; tax_amount: number; payment_status: string; status: string; created_at: string }[];
    const paid = orders.filter((o) => o.payment_status === 'paid' || o.status === 'delivered');
    const refunded = orders.filter((o) => o.payment_status === 'refunded');

    const totalRevenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const totalTax = paid.reduce((s, o) => s + Number(o.tax_amount ?? 0), 0);
    const refundedAmount = refunded.reduce((s, o) => s + Number(o.total), 0);

    // Group by month (last 6 months)
    const monthMap = new Map<string, { revenue: number; tax: number; orders: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthMap.set(key, { revenue: 0, tax: 0, orders: 0 });
    }
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthMap.has(key)) {
        const m = monthMap.get(key)!;
        m.revenue += Number(o.total);
        m.tax += Number(o.tax_amount ?? 0);
        m.orders += 1;
      }
    }

    setStats({
      totalRevenue,
      totalTax,
      netRevenue: totalRevenue - totalTax,
      orderCount: paid.length,
      refundedAmount,
      avgOrderValue: paid.length > 0 ? totalRevenue / paid.length : 0,
      byMonth: Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v })),
    });
    setLoading(false);
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_RULE);
    setFormMsg(null);
    setShowForm(true);
  };

  const openEdit = (rule: TaxRule) => {
    setEditingRule(rule);
    setForm({ name: rule.name, rate: rule.rate, applies_to: rule.applies_to, region_code: rule.region_code, is_active: rule.is_active });
    setFormMsg(null);
    setShowForm(true);
  };

  const saveRule = async () => {
    if (!form.name.trim()) { setFormMsg({ type: 'error', text: 'Name is required.' }); return; }
    if (form.rate <= 0 || form.rate > 1) { setFormMsg({ type: 'error', text: 'Rate must be between 0.001 and 1 (e.g. 0.08 for 8%).' }); return; }
    if ((form.applies_to === 'state' || form.applies_to === 'country') && !form.region_code?.trim()) {
      setFormMsg({ type: 'error', text: 'Region code is required for state/country rules.' }); return;
    }

    setSavingId(editingRule?.id ?? 'new');
    const payload = { ...form, region_code: form.applies_to === 'all' ? null : form.region_code?.trim().toUpperCase() ?? null };

    const { error } = editingRule
      ? await supabase.from('tax_config').update(payload).eq('id', editingRule.id)
      : await supabase.from('tax_config').insert(payload);

    setSavingId(null);
    if (error) { setFormMsg({ type: 'error', text: error.message }); return; }

    setFormMsg({ type: 'success', text: editingRule ? 'Rule updated.' : 'Rule created.' });
    await loadAll();
    setTimeout(() => { setShowForm(false); setFormMsg(null); }, 1000);
  };

  const toggleActive = async (rule: TaxRule) => {
    setSavingId(rule.id);
    await supabase.from('tax_config').update({ is_active: !rule.is_active }).eq('id', rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    setSavingId(null);
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this tax rule?')) return;
    setDeletingId(id);
    await supabase.from('tax_config').delete().eq('id', id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  };

  const maxMonthRevenue = Math.max(...(stats?.byMonth.map((m) => m.revenue) ?? [1]), 1);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Revenue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />)
        ) : stats && [
          { label: 'Gross Revenue', value: `$${fmt(stats.totalRevenue)}`, sub: `${stats.orderCount} paid orders`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tax Collected', value: `$${fmt(stats.totalTax)}`, sub: 'across all orders', icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Net Revenue', value: `$${fmt(stats.netRevenue)}`, sub: 'after tax', icon: TrendingUp, color: 'text-gray-700', bg: 'bg-gray-100' },
          { label: 'Avg Order Value', value: `$${fmt(stats.avgOrderValue)}`, sub: `$${fmt(stats.refundedAmount)} refunded`, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Revenue — Last 6 Months</h2>
          </div>
          <button onClick={loadAll} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        {loading ? (
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-end gap-3 h-36">
            {stats?.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex flex-col justify-end" style={{ height: '100px' }}>
                  <div
                    className="w-full bg-gray-900 rounded-t-md transition-all"
                    style={{ height: `${Math.max((m.revenue / maxMonthRevenue) * 100, m.revenue > 0 ? 4 : 0)}%` }}
                  >
                    {m.revenue > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 whitespace-nowrap">
                        ${m.revenue > 1000 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue.toFixed(0)}
                      </div>
                    )}
                  </div>
                  {Number(m.tax) > 0 && (
                    <div
                      className="w-full bg-blue-400/30 rounded-t-sm absolute bottom-0"
                      style={{ height: `${(m.tax / maxMonthRevenue) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{m.month}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-900" /><span className="text-xs text-gray-500">Revenue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-400/50" /><span className="text-xs text-gray-500">Tax</span></div>
        </div>
      </div>

      {/* Tax configuration */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Tax Rules</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure sales tax rates applied at checkout</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1,2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No tax rules yet</p>
            <p className="text-xs text-gray-300 mt-1">Add a rule to automatically apply tax at checkout</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                    {!rule.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {(rule.rate * 100).toFixed(2)}% ·{' '}
                    {rule.applies_to === 'all' ? 'All orders' : `${rule.applies_to === 'state' ? 'State' : 'Country'}: ${rule.region_code}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(rule)}
                    disabled={savingId === rule.id}
                    className={`p-1.5 rounded-lg transition-colors ${rule.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {savingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : rule.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteRule(rule.id)} disabled={deletingId === rule.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                    {deletingId === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tax rule form modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editingRule ? 'Edit Tax Rule' : 'New Tax Rule'}</h2>
              <button onClick={() => { setShowForm(false); setFormMsg(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formMsg && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${formMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {formMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {formMsg.text}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rule Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. California Sales Tax" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rate (e.g. 0.08 = 8%)</label>
                <input
                  type="number"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {form.rate > 0 && <p className="text-xs text-gray-400 mt-1">{(form.rate * 100).toFixed(3)}%</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Applies To</label>
                <select value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value as TaxRule['applies_to'], region_code: null })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="all">All Orders</option>
                  <option value="state">Specific State (US)</option>
                  <option value="country">Specific Country</option>
                </select>
              </div>
              {form.applies_to !== 'all' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {form.applies_to === 'state' ? 'State Code (e.g. CA, NY)' : 'Country Code (e.g. US, GB)'}
                  </label>
                  <input
                    value={form.region_code ?? ''}
                    onChange={(e) => setForm({ ...form, region_code: e.target.value })}
                    placeholder={form.applies_to === 'state' ? 'CA' : 'US'}
                    maxLength={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Active</label>
                <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`transition-colors ${form.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {form.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <button
                onClick={saveRule}
                disabled={!!savingId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {savingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {savingId ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
