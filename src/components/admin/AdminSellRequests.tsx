import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  Eye,
  DollarSign,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Package,
  Layers,
  Mail,
  Phone,
  Calendar,
  Tag,
  MessageSquare,
  Save,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubmissionCard {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  quantity: number;
  notes: string | null;
}

interface Submission {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  submission_type: 'individual' | 'collection';
  description: string | null;
  card_count: number | null;
  overall_condition: string | null;
  image_urls: string[];
  asking_price: number | null;
  status: string;
  offer_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  sell_submission_cards: SubmissionCard[];
}

const STATUSES = [
  { value: 'pending',    label: 'Pending',      color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: Clock },
  { value: 'reviewing', label: 'Reviewing',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: Eye },
  { value: 'offer_made',label: 'Offer Made',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: DollarSign },
  { value: 'accepted',  label: 'Accepted',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: ThumbsUp },
  { value: 'rejected',  label: 'Not Accepted',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: ThumbsDown },
  { value: 'completed', label: 'Completed',     color: 'text-gray-700',   bg: 'bg-gray-100',  border: 'border-gray-200',  icon: CheckCircle },
];

function statusCfg(status: string) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

function StatusBadge({ status }: { status: string }) {
  const s = statusCfg(status);
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

export default function AdminSellRequests({ highlightSubmissionId }: { highlightSubmissionId?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const highlightRef = useRef<HTMLButtonElement | null>(null);
  const didHighlight = useRef(false);

  // Detail panel state
  const [offerAmount, setOfferAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('sell_submissions')
      .select('*, sell_submission_cards(*)')
      .order('created_at', { ascending: false });
    setSubmissions((data as Submission[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!highlightSubmissionId || didHighlight.current || submissions.length === 0) return;
    const target = submissions.find((s) => s.id === highlightSubmissionId);
    if (target) {
      didHighlight.current = true;
      openDetail(target);
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [submissions, highlightSubmissionId]);

  const filtered = useMemo(() => {
    let r = [...submissions];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(
        (sub) =>
          sub.contact_name.toLowerCase().includes(s) ||
          sub.contact_email.toLowerCase().includes(s) ||
          sub.id.toLowerCase().includes(s)
      );
    }
    if (filterStatus) r = r.filter((sub) => sub.status === filterStatus);
    if (filterType)   r = r.filter((sub) => sub.submission_type === filterType);
    return r;
  }, [submissions, search, filterStatus, filterType]);

  const openDetail = (sub: Submission) => {
    setSelected(sub);
    setOfferAmount(sub.offer_amount?.toString() ?? '');
    setAdminNotes(sub.admin_notes ?? '');
  };

  const closeDetail = () => setSelected(null);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status };
    if (offerAmount) updates.offer_amount = parseFloat(offerAmount);
    if (adminNotes.trim()) updates.admin_notes = adminNotes.trim();
    await supabase.from('sell_submissions').update(updates).eq('id', selected.id);
    await fetchSubmissions();
    setSelected((prev) => prev ? { ...prev, status, offer_amount: updates.offer_amount as number ?? prev.offer_amount, admin_notes: updates.admin_notes as string ?? prev.admin_notes } : null);
    setSaving(false);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (offerAmount !== '') updates.offer_amount = offerAmount ? parseFloat(offerAmount) : null;
    if (adminNotes !== selected.admin_notes) updates.admin_notes = adminNotes.trim() || null;
    if (Object.keys(updates).length) {
      await supabase.from('sell_submissions').update(updates).eq('id', selected.id);
      await fetchSubmissions();
    }
    setSaving(false);
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s) => { map[s.status] = (map[s.status] ?? 0) + 1; });
    return map;
  }, [submissions]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: list */}
      <div className={`flex flex-col ${selected ? 'hidden xl:flex xl:w-[420px]' : 'flex-1'} border-r border-gray-200 bg-white overflow-hidden`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Sell Requests</h2>
            <span className="text-sm text-gray-500">{filtered.length} of {submissions.length}</span>
          </div>

          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStatus === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({submissions.length})
            </button>
            {STATUSES.filter((s) => counts[s.value]).map((s) => (
              <button
                key={s.value}
                onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filterStatus === s.value ? `${s.color} ${s.bg} ${s.border}` : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label} ({counts[s.value]})
              </button>
            ))}
          </div>

          {/* Search + type filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
            >
              <option value="">All Types</option>
              <option value="individual">Individual</option>
              <option value="collection">Collection</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Filter className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No submissions match your filters.</p>
            </div>
          ) : (
            filtered.map((sub) => (
              <button
                key={sub.id}
                ref={sub.id === highlightSubmissionId ? (el) => { highlightRef.current = el; } : undefined}
                onClick={() => openDetail(sub)}
                className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 ${
                  selected?.id === sub.id ? 'bg-red-50 border-l-2 border-red-500' : ''
                } ${sub.id === highlightSubmissionId && selected?.id !== sub.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  sub.submission_type === 'individual' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  {sub.submission_type === 'individual'
                    ? <Package className="w-4 h-4 text-orange-600" />
                    : <Layers className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{sub.contact_name}</span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{sub.contact_email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 capitalize">{sub.submission_type}</span>
                    {sub.submission_type === 'individual' && (
                      <span className="text-xs text-gray-400">{sub.sell_submission_cards?.length ?? 0} card{(sub.sell_submission_cards?.length ?? 0) !== 1 ? 's' : ''}</span>
                    )}
                    {sub.asking_price && (
                      <span className="text-xs text-gray-400">Asking ${sub.asking_price.toFixed(2)}</span>
                    )}
                    <span className="text-xs text-gray-300 ml-auto">
                      {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Detail header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <button onClick={closeDetail} className="xl:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{selected.contact_name}</h3>
                <StatusBadge status={selected.status} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">#{selected.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <button onClick={closeDetail} className="hidden xl:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Contact */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</h4>
                <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${selected.contact_email}`} className="text-sm text-blue-600 hover:underline">{selected.contact_email}</a>
                    <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                  </div>
                  {selected.contact_phone && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{selected.contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {new Date(selected.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {selected.asking_price && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Asking <strong>${selected.asking_price.toFixed(2)}</strong></span>
                    </div>
                  )}
                </div>
              </section>

              {/* Submission details */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {selected.submission_type === 'individual' ? 'Cards' : 'Collection Details'}
                </h4>
                {selected.submission_type === 'individual' ? (
                  selected.sell_submission_cards?.length > 0 ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Card</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Set</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Cond.</th>
                            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selected.sell_submission_cards.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800">
                                {c.card_name}
                                {c.card_number && <span className="text-gray-400 text-xs ml-1">#{c.card_number}</span>}
                                {c.notes && <p className="text-[11px] text-gray-400 mt-0.5">{c.notes}</p>}
                              </td>
                              <td className="px-3 py-2.5 text-gray-500 text-xs">{c.set_name ?? '—'}</td>
                              <td className="px-3 py-2.5 text-gray-500 text-xs">{c.condition ?? '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-700 font-medium">{c.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No cards listed.</p>
                  )
                ) : (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    {selected.description && <p className="text-sm text-gray-700">{selected.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {selected.card_count && <span>~{selected.card_count} cards</span>}
                      {selected.overall_condition && <span>Condition: {selected.overall_condition}</span>}
                    </div>
                  </div>
                )}
              </section>

              {/* Images */}
              {selected.image_urls?.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Photos</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selected.image_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Offer + notes */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Offer & Notes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Offer Amount ($)</label>
                    <div className="relative max-w-48">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min={0} step={0.01}
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Admin Notes (visible to customer)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Add a note for the customer..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
                    />
                  </div>
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </section>

              {/* Status actions */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Update Status</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUSES.map((s) => {
                    const Icon = s.icon;
                    const isCurrent = selected.status === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => updateStatus(s.value)}
                        disabled={saving || isCurrent}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          isCurrent
                            ? `${s.color} ${s.bg} ${s.border} cursor-default`
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {s.label}
                        {isCurrent && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden xl:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Select a submission to review</p>
          </div>
        </div>
      )}
    </div>
  );
}
