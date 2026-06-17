import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  DollarSign,
  X,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CardRow {
  card_name: string;
  set_name: string;
  card_number: string;
  condition: string;
  quantity: number;
  notes: string;
}

interface SubmissionWithCards {
  id: string;
  contact_name: string;
  contact_email: string;
  submission_type: string;
  description: string | null;
  card_count: number | null;
  overall_condition: string | null;
  asking_price: number | null;
  image_urls: string[];
  status: string;
  offer_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  sell_submission_cards: CardRow[];
}

const CONDITIONS = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  pending:    { label: 'Pending Review', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: Clock },
  reviewing:  { label: 'Under Review',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: Eye },
  offer_made: { label: 'Offer Made',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: DollarSign },
  accepted:   { label: 'Accepted',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: ThumbsUp },
  rejected:   { label: 'Not Accepted',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: ThumbsDown },
  completed:  { label: 'Completed',      color: 'text-gray-700',   bg: 'bg-gray-100',  border: 'border-gray-200',  icon: CheckCircle },
};

const EMPTY_CARD: CardRow = { card_name: '', set_name: '', card_number: '', condition: 'Near Mint', quantity: 1, notes: '' };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function SellPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();

  // Form state
  const [type, setType] = useState<'individual' | 'collection'>('individual');
  const [cards, setCards] = useState<CardRow[]>([{ ...EMPTY_CARD }]);
  const [description, setDescription] = useState('');
  const [cardCount, setCardCount] = useState('');
  const [overallCondition, setOverallCondition] = useState('Near Mint');
  const [askingPrice, setAskingPrice] = useState('');
  const [imageUrls, setImageUrls] = useState(['', '', '']);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // My submissions
  const [mySubmissions, setMySubmissions] = useState<SubmissionWithCards[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setContactEmail(user.email ?? '');
      fetchMySubmissions();
    }
  }, [user]);

  const fetchMySubmissions = async () => {
    if (!user) return;
    setLoadingSubmissions(true);
    const { data } = await supabase
      .from('sell_submissions')
      .select('*, sell_submission_cards(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMySubmissions((data as SubmissionWithCards[]) ?? []);
    setLoadingSubmissions(false);
  };

  const addCard = () => setCards((prev) => [...prev, { ...EMPTY_CARD }]);

  const removeCard = (i: number) => setCards((prev) => prev.filter((_, idx) => idx !== i));

  const updateCard = (i: number, field: keyof CardRow, value: string | number) => {
    setCards((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contactName.trim() || !contactEmail.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (type === 'individual' && !cards.some((c) => c.card_name.trim())) {
      setError('Add at least one card.');
      return;
    }
    if (type === 'collection' && !description.trim()) {
      setError('Please describe your collection.');
      return;
    }

    setSubmitting(true);

    const filteredUrls = imageUrls.filter((u) => u.trim());
    const submissionPayload: Record<string, unknown> = {
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim() || null,
      submission_type: type,
      image_urls: filteredUrls,
      asking_price: askingPrice ? parseFloat(askingPrice) : null,
    };

    if (user) submissionPayload.user_id = user.id;

    if (type === 'collection') {
      submissionPayload.description = description.trim();
      submissionPayload.card_count = cardCount ? parseInt(cardCount) : null;
      submissionPayload.overall_condition = overallCondition;
    }

    const { data: submission, error: subErr } = await supabase
      .from('sell_submissions')
      .insert(submissionPayload)
      .select('id')
      .single();

    if (subErr || !submission) {
      setError(subErr?.message ?? 'Failed to submit. Please try again.');
      setSubmitting(false);
      return;
    }

    if (type === 'individual') {
      const validCards = cards.filter((c) => c.card_name.trim());
      if (validCards.length) {
        await supabase.from('sell_submission_cards').insert(
          validCards.map((c) => ({
            submission_id: submission.id,
            card_name: c.card_name.trim(),
            set_name: c.set_name.trim() || null,
            card_number: c.card_number.trim() || null,
            condition: c.condition || null,
            quantity: c.quantity,
            notes: c.notes.trim() || null,
          }))
        );
      }
    }

    setSubmitted(true);
    setSubmitting(false);
    if (user) fetchMySubmissions();
  };

  const resetForm = () => {
    setSubmitted(false);
    setType('individual');
    setCards([{ ...EMPTY_CARD }]);
    setDescription('');
    setCardCount('');
    setOverallCondition('Near Mint');
    setAskingPrice('');
    setImageUrls(['', '', '']);
    setContactPhone('');
    setError(null);
  };

  const respondToOffer = async (submissionId: string, decision: 'accepted' | 'rejected') => {
    setRespondingId(submissionId);
    await supabase
      .from('sell_submissions')
      .update({ status: decision })
      .eq('id', submissionId);
    await fetchMySubmissions();
    setRespondingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gray-950 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-3 py-1 mb-4">
              <DollarSign className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 text-xs font-semibold uppercase tracking-wide">Sell Your Cards</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Turn Your Collection<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Into Cash</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed">
              Submit individual cards or entire collections. We'll review your submission and make you a fair offer within 1–2 business days.
            </p>
            <div className="flex flex-wrap gap-6 mt-6">
              {[
                { step: '1', label: 'Submit your cards' },
                { step: '2', label: 'We review & offer' },
                { step: '3', label: 'Accept & get paid' },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step}
                  </div>
                  <span className="text-gray-300 text-sm">{label}</span>
                  {step !== '3' && <ArrowRight className="w-3.5 h-3.5 text-gray-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* Submission Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">New Submission</h2>
            <p className="text-sm text-gray-500 mt-0.5">Fill out the form below to get an offer.</p>
          </div>

          {submitted ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Submission Received!</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                We'll review your submission and get back to you at <strong>{contactEmail}</strong> within 1–2 business days.
              </p>
              <button
                onClick={resetForm}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">What are you selling?</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'individual', icon: Package, title: 'Individual Cards', desc: 'Specific cards you want to sell' },
                    { value: 'collection', icon: Layers, title: 'Full Collection', desc: 'Bulk lot or entire binder' },
                  ] as const).map(({ value, icon: Icon, title, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        type === value
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        type === value ? 'bg-red-600' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4.5 h-4.5 ${type === value ? 'text-white' : 'text-gray-500'}`} style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${type === value ? 'text-red-700' : 'text-gray-800'}`}>{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual cards */}
              {type === 'individual' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">Cards</label>
                    <button
                      type="button"
                      onClick={addCard}
                      className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Card
                    </button>
                  </div>
                  <div className="space-y-3">
                    {cards.map((card, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Card {i + 1}</span>
                          {cards.length > 1 && (
                            <button type="button" onClick={() => removeCard(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Card Name *</label>
                            <input
                              value={card.card_name}
                              onChange={(e) => updateCard(i, 'card_name', e.target.value)}
                              placeholder="e.g. Charizard"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Set</label>
                            <input
                              value={card.set_name}
                              onChange={(e) => updateCard(i, 'set_name', e.target.value)}
                              placeholder="e.g. Base Set"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Card #</label>
                            <input
                              value={card.card_number}
                              onChange={(e) => updateCard(i, 'card_number', e.target.value)}
                              placeholder="e.g. 4/102"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Condition</label>
                            <select
                              value={card.condition}
                              onChange={(e) => updateCard(i, 'condition', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            >
                              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Qty</label>
                            <input
                              type="number" min={1}
                              value={card.quantity}
                              onChange={(e) => updateCard(i, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                            <input
                              value={card.notes}
                              onChange={(e) => updateCard(i, 'notes', e.target.value)}
                              placeholder="Any details..."
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection fields */}
              {type === 'collection' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Description *</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe your collection — what sets, notable cards, overall state, storage history, etc."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Approx. Card Count</label>
                      <input
                        type="number" min={1}
                        value={cardCount}
                        onChange={(e) => setCardCount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Overall Condition</label>
                      <select
                        value={overallCondition}
                        onChange={(e) => setOverallCondition(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                      >
                        {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Asking price + photos */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Asking Price (optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave blank and we'll make you an offer.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Photo URLs (optional)</label>
                  <div className="space-y-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative">
                        <input
                          value={url}
                          onChange={(e) => {
                            const next = [...imageUrls];
                            next[i] = e.target.value;
                            setImageUrls(next);
                          }}
                          placeholder={`Image URL ${i + 1}`}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 pr-8"
                        />
                        {url && (
                          <button type="button" onClick={() => { const n = [...imageUrls]; n[i] = ''; setImageUrls(n); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone (optional)</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* My Submissions */}
        {user && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Submissions</h2>
            {loadingSubmissions ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
              </div>
            ) : mySubmissions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map((sub) => {
                  const expanded = expandedId === sub.id;
                  return (
                    <div key={sub.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(expanded ? null : sub.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 capitalize">
                              {sub.submission_type === 'individual'
                                ? `${sub.sell_submission_cards?.length ?? 0} Card${(sub.sell_submission_cards?.length ?? 0) !== 1 ? 's' : ''}`
                                : 'Collection'}
                            </span>
                            <StatusBadge status={sub.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {sub.asking_price ? ` · Asking $${sub.asking_price.toFixed(2)}` : ''}
                          </p>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>

                      {expanded && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                          {sub.status === 'offer_made' && sub.offer_amount && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-orange-800 mb-0.5">We've made you an offer!</p>
                                <p className="text-3xl font-bold text-orange-700">${sub.offer_amount.toFixed(2)}</p>
                                {sub.admin_notes && <p className="text-sm text-orange-700 mt-1">{sub.admin_notes}</p>}
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => respondToOffer(sub.id, 'accepted')}
                                  disabled={respondingId === sub.id}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  Accept Offer
                                </button>
                                <button
                                  onClick={() => respondToOffer(sub.id, 'rejected')}
                                  disabled={respondingId === sub.id}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold transition-colors"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}
                          {sub.admin_notes && sub.status !== 'offer_made' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-xs font-semibold text-blue-700 mb-0.5">Note from us:</p>
                              <p className="text-sm text-blue-800">{sub.admin_notes}</p>
                            </div>
                          )}
                          {sub.submission_type === 'individual' && sub.sell_submission_cards?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cards</p>
                              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                                {sub.sell_submission_cards.map((c, i) => (
                                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white text-sm">
                                    <span className="font-medium text-gray-800 flex-1">{c.card_name}</span>
                                    {c.set_name && <span className="text-gray-400 text-xs">{c.set_name}</span>}
                                    {c.condition && <span className="text-gray-500 text-xs">{c.condition}</span>}
                                    <span className="text-gray-400 text-xs">×{c.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {sub.submission_type === 'collection' && (
                            <div className="text-sm text-gray-700 space-y-1">
                              {sub.description && <p>{sub.description}</p>}
                              {sub.card_count && <p className="text-gray-500 text-xs">~{sub.card_count} cards · {sub.overall_condition}</p>}
                            </div>
                          )}
                          {sub.image_urls?.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {sub.image_urls.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
