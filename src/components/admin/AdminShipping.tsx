import { useEffect, useState } from 'react';
import {
  Truck, Plus, Pencil, Trash2, Save, X, Loader2, CheckCircle,
  AlertTriangle, ToggleLeft, ToggleRight, GripVertical,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimated_days_min: number;
  estimated_days_max: number;
  carrier: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  estimated_days_min: '3',
  estimated_days_max: '7',
  carrier: '',
  is_active: true,
};

type FormState = typeof EMPTY_FORM;

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Amazon Logistics', 'OnTrac', 'Other'];

function MethodCard({
  method,
  onEdit,
  onDelete,
  onToggle,
  saving,
}: {
  method: ShippingMethod;
  onEdit: (m: ShippingMethod) => void;
  onDelete: (m: ShippingMethod) => void;
  onToggle: (m: ShippingMethod) => void;
  saving: string | null;
}) {
  const days =
    method.estimated_days_min === method.estimated_days_max
      ? `${method.estimated_days_min} day${method.estimated_days_min === 1 ? '' : 's'}`
      : `${method.estimated_days_min}–${method.estimated_days_max} days`;

  return (
    <div className={`bg-white rounded-xl border transition-all ${method.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 cursor-grab text-gray-300 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{method.name}</p>
              {method.description && (
                <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggle(method)}
                disabled={saving === method.id}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 disabled:opacity-50"
                title={method.is_active ? 'Deactivate' : 'Activate'}
              >
                {method.is_active ? (
                  <ToggleRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => onEdit(method)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(method)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-bold text-gray-900">
              {Number(method.price) === 0 ? 'Free' : `$${Number(method.price).toFixed(2)}`}
            </span>
            <span className="text-xs text-gray-400">{days}</span>
            {method.carrier && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {method.carrier}
              </span>
            )}
            {!method.is_active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminShipping() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShippingMethod | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ShippingMethod | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchMethods(); }, []);

  const fetchMethods = async () => {
    const { data } = await supabase
      .from('shipping_methods')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setMethods((data as ShippingMethod[]) ?? []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: String(methods.length) } as any);
    setFormMsg(null);
    setShowForm(true);
  };

  const openEdit = (m: ShippingMethod) => {
    setEditing(m);
    setForm({
      name: m.name,
      description: m.description ?? '',
      price: String(m.price),
      estimated_days_min: String(m.estimated_days_min),
      estimated_days_max: String(m.estimated_days_max),
      carrier: m.carrier ?? '',
      is_active: m.is_active,
    });
    setFormMsg(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setFormMsg(null); };

  const handleSave = async () => {
    setFormSaving(true);
    setFormMsg(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      estimated_days_min: parseInt(form.estimated_days_min) || 1,
      estimated_days_max: parseInt(form.estimated_days_max) || 1,
      carrier: form.carrier.trim() || null,
      is_active: form.is_active,
      sort_order: editing ? editing.sort_order : methods.length,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('shipping_methods').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('shipping_methods').insert(payload));
    }

    if (error) {
      setFormMsg({ type: 'error', text: error.message });
    } else {
      setFormMsg({ type: 'success', text: editing ? 'Method updated.' : 'Method added.' });
      await fetchMethods();
      setTimeout(() => { closeForm(); }, 1200);
    }
    setFormSaving(false);
  };

  const handleToggle = async (m: ShippingMethod) => {
    setSaving(m.id);
    await supabase.from('shipping_methods').update({ is_active: !m.is_active, updated_at: new Date().toISOString() }).eq('id', m.id);
    await fetchMethods();
    setSaving(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('shipping_methods').delete().eq('id', deleteTarget.id);
    setMethods((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const setField = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const fieldClass =
    'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1.5';

  const isFormValid = form.name.trim() && form.price !== '' && !isNaN(parseFloat(form.price));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Shipping Methods</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the shipping options customers can choose at checkout.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Method
        </button>
      </div>

      {/* Methods list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No shipping methods yet</p>
          <p className="text-sm text-gray-400 mb-5">Add your first option to offer customers shipping choices at checkout.</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Shipping Method
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
              saving={saving}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit drawer ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Shipping Method' : 'New Shipping Method'}</h3>
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

              <div>
                <label className={labelClass}>Name *</label>
                <input
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="e.g. Standard Shipping"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input
                  value={form.description}
                  onChange={setField('description')}
                  placeholder="Delivered in 5–7 business days"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Price *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={setField('price')}
                    placeholder="0.00"
                    className={`${fieldClass} pl-7`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Set to 0 to show as "Free"</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Est. Days (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.estimated_days_min}
                    onChange={setField('estimated_days_min')}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Est. Days (max)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.estimated_days_max}
                    onChange={setField('estimated_days_max')}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Carrier (optional)</label>
                <select value={form.carrier} onChange={setField('carrier')} className={fieldClass}>
                  <option value="">Select carrier...</option>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  {form.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                  {form.is_active ? 'Active — visible at checkout' : 'Inactive — hidden from customers'}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={closeForm}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isFormValid || formSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {formSaving ? 'Saving...' : editing ? 'Save Changes' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-1">Delete Shipping Method?</h3>
              <p className="text-sm text-gray-500">
                "<span className="font-semibold text-gray-700">{deleteTarget.name}</span>" will be permanently removed. Existing orders won't be affected.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
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
