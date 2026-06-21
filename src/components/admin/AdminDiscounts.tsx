import { useEffect, useState, useMemo } from 'react';
import {
  Tag, Plus, Pencil, Trash2, Save, X, Loader2, CheckCircle,
  AlertTriangle, ToggleLeft, ToggleRight, Search, Percent, DollarSign,
  Clock, Infinity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'flat';
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  description: '',
  type: 'percentage' as 'percentage' | 'flat',
  value: '',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
};
type FormState = typeof EMPTY_FORM;

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="font-mono text-sm font-bold tracking-widest text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
      {code}
    </span>
  );
}

function StatusPill({ active, expired }: { active: boolean; expired: boolean }) {
  if (expired) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <Clock className="w-3 h-3" />Expired
    </span>
  );
  if (!active) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      Inactive
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Active
    </span>
  );
}

export default function AdminDiscounts() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes((data as DiscountCode[]) ?? []);
    setLoading(false);
  };

  const isExpired = (c: DiscountCode) =>
    !!c.expires_at && new Date(c.expires_at) < new Date();

  const isExhausted = (c: DiscountCode) =>
    c.max_uses !== null && c.uses_count >= c.max_uses;

  const filtered = useMemo(() => {
    if (!search) return codes;
    const s = search.toLowerCase();
    return codes.filter((c) =>
      c.code.toLowerCase().includes(s) || (c.description ?? '').toLowerCase().includes(s)
    );
  }, [codes, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormMsg(null);
    setShowForm(true);
  };

  const openEdit = (c: DiscountCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? '',
      type: c.type,
      value: String(c.value),
      min_order_amount: c.min_order_amount > 0 ? String(c.min_order_amount) : '',
      max_uses: c.max_uses !== null ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: c.is_active,
    });
    setFormMsg(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setFormMsg(null); };

  const handleSave = async () => {
    setFormSaving(true);
    setFormMsg(null);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      type: form.type,
      value: parseFloat(form.value),
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_uses: form.max_uses.trim() ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('discount_codes').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('discount_codes').insert(payload));
    }

    if (error) {
      setFormMsg({ type: 'error', text: error.message.includes('unique') ? 'That code already exists.' : error.message });
    } else {
      setFormMsg({ type: 'success', text: editing ? 'Code updated.' : 'Code created!' });
      await fetchCodes();
      setTimeout(() => closeForm(), 1000);
    }
    setFormSaving(false);
  };

  const handleToggle = async (c: DiscountCode) => {
    setSaving(c.id);
    await supabase.from('discount_codes').update({ is_active: !c.is_active, updated_at: new Date().toISOString() }).eq('id', c.id);
    await fetchCodes();
    setSaving(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('discount_codes').delete().eq('id', deleteTarget.id);
    setCodes((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm((f) => ({ ...f, code }));
  };

  const setField = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const isFormValid = form.code.trim() && form.value && !isNaN(parseFloat(form.value)) && parseFloat(form.value) > 0;

  const fieldClass = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1.5';

  const stats = useMemo(() => ({
    total: codes.length,
    active: codes.filter((c) => c.is_active && !isExpired(c) && !isExhausted(c)).length,
    totalUses: codes.reduce((s, c) => s + c.uses_count, 0),
  }), [codes]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Discount Codes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage coupon codes for customers to use at checkout.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />New Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Codes', value: stats.total, icon: Tag, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Uses', value: stats.totalUses, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search codes..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Tag className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">{codes.length === 0 ? 'No discount codes yet' : 'No codes match your search'}</p>
            {codes.length === 0 && (
              <p className="text-sm text-gray-400 mb-5">Create your first discount code to offer savings to customers.</p>
            )}
            {codes.length === 0 && (
              <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors">
                <Plus className="w-4 h-4" />Create First Code
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => {
                  const expired = isExpired(c);
                  const exhausted = isExhausted(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <CodeBadge code={c.code} />
                        {c.description && <p className="text-xs text-gray-400 mt-1">{c.description}</p>}
                        {c.min_order_amount > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Min. order ${c.min_order_amount.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.type === 'percentage' ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                            {c.type === 'percentage'
                              ? <Percent className="w-3.5 h-3.5 text-purple-600" />
                              : <DollarSign className="w-3.5 h-3.5 text-emerald-600" />}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {c.type === 'percentage' ? `${c.value}% off` : `$${Number(c.value).toFixed(2)} off`}
                            </p>
                            <p className="text-[10px] text-gray-400 capitalize">{c.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900">{c.uses_count}</span>
                          <span className="text-gray-400 text-xs">/</span>
                          {c.max_uses !== null
                            ? <span className={`text-sm ${exhausted ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>{c.max_uses}</span>
                            : <Infinity className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                        {c.max_uses !== null && (
                          <div className="mt-1 h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${exhausted ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (c.uses_count / c.max_uses) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {c.expires_at ? (
                          <span className={expired ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1"><Infinity className="w-3.5 h-3.5" />No limit</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill active={c.is_active} expired={expired || exhausted} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(c)}
                            disabled={saving === c.id || expired || exhausted}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 disabled:opacity-40"
                            title={c.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {saving === c.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : c.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Drawer ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Discount Code' : 'New Discount Code'}</h3>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formMsg && (
                <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${formMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {formMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  {formMsg.text}
                </div>
              )}

              {/* Code */}
              <div>
                <label className={labelClass}>Code *</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={setField('code')}
                    placeholder="e.g. SAVE20"
                    className={`${fieldClass} uppercase flex-1`}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-3 py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Description (internal note)</label>
                <input value={form.description} onChange={setField('description')} placeholder="e.g. Summer promo 2026" className={fieldClass} />
              </div>

              {/* Type + Value */}
              <div>
                <label className={labelClass}>Discount Type *</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['percentage', 'flat'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.type === t ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      {t === 'percentage' ? 'Percentage' : 'Flat Amount'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {form.type === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number" min="0.01" step={form.type === 'percentage' ? '1' : '0.01'}
                    max={form.type === 'percentage' ? '100' : undefined}
                    value={form.value} onChange={setField('value')}
                    placeholder={form.type === 'percentage' ? '20' : '10.00'}
                    className={`${fieldClass} pl-7`}
                  />
                </div>
                {form.type === 'percentage' && parseFloat(form.value) > 100 && (
                  <p className="text-xs text-red-500 mt-1">Percentage cannot exceed 100%</p>
                )}
              </div>

              {/* Min order */}
              <div>
                <label className={labelClass}>Minimum Order Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={setField('min_order_amount')} placeholder="0.00 (no minimum)" className={`${fieldClass} pl-7`} />
                </div>
              </div>

              {/* Max uses */}
              <div>
                <label className={labelClass}>Usage Limit</label>
                <input type="number" min="1" value={form.max_uses} onChange={setField('max_uses')} placeholder="Leave empty for unlimited" className={fieldClass} />
              </div>

              {/* Expiry */}
              <div>
                <label className={labelClass}>Expiry Date & Time</label>
                <input type="datetime-local" value={form.expires_at} onChange={setField('expires_at')} className={fieldClass} />
                <p className="text-xs text-gray-400 mt-1">Leave empty for no expiry</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  {form.is_active ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                  {form.is_active ? 'Active — customers can use this code' : 'Inactive — hidden from customers'}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={closeForm} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!isFormValid || formSaving || (form.type === 'percentage' && parseFloat(form.value) > 100)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {formSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-1">Delete Discount Code?</h3>
              <p className="text-sm text-gray-500">
                Code <CodeBadge code={deleteTarget.code} /> will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
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
