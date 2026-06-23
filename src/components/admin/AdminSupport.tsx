import { useEffect, useState, useRef } from 'react';
import {
  Inbox, Search, RefreshCw, Plus, X, Send, Lock, MessageSquare,
  ChevronDown, Clock, CheckCircle, AlertTriangle, Loader2, User,
  Filter, Tag, UserCheck, Circle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer_name: string;
  customer_email: string;
  source: string;
  assigned_to: string | null;
  first_message: string;
  reply_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Reply {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  author_role: 'customer' | 'staff' | 'admin';
  body: string;
  is_internal: boolean;
  created_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  open:        { label: 'Open',        color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  waiting:     { label: 'Waiting',     color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
  resolved:    { label: 'Resolved',    color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500' },
  closed:      { label: 'Closed',      color: 'text-gray-500',   bg: 'bg-gray-100',  border: 'border-gray-200',   dot: 'bg-gray-400' },
};

const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-gray-500' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  high:   { label: 'High',   color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

const STATUS_TABS: { key: TicketStatus | 'all'; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'open',       label: 'Open' },
  { key: 'in_progress',label: 'In Progress' },
  { key: 'waiting',    label: 'Waiting' },
  { key: 'resolved',   label: 'Resolved' },
  { key: 'closed',     label: 'Closed' },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── PriorityBadge ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>;
}

// ─── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ subject: '', customer_name: '', customer_email: '', message: '', priority: 'normal' as TicketPriority });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.customer_email.trim() || !form.message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data: ticketId, error: err } = await supabase.rpc('create_support_ticket', {
        p_subject: form.subject.trim(),
        p_customer_name: form.customer_name.trim() || form.customer_email,
        p_customer_email: form.customer_email.trim(),
        p_message: form.message.trim(),
        p_source: 'manual',
      });
      if (err) throw err;
      if (form.priority !== 'normal' && ticketId) {
        await supabase.from('support_tickets').update({ priority: form.priority }).eq('id', ticketId);
      }
      onCreated();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">New Ticket</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subject *</label>
            <input className={field} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Order issue #1234" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Customer Name</label>
              <input className={field} value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
              <input type="email" className={field} value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="customer@example.com" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
            <select className={field} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message *</label>
            <textarea className={field + ' resize-none'} rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe the issue..." required />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  staff,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  staff: StaffMember[];
  onClose: () => void;
  onUpdated: (t: Ticket) => void;
}) {
  const { profile } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setReplies((data ?? []) as Reply[]);
    setLoadingReplies(false);
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => { fetchReplies(); }, [ticket.id]);

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    const authorRole = profile?.role === 'admin' ? 'admin' : 'staff';
    const { error } = await supabase.from('ticket_replies').insert({
      ticket_id: ticket.id,
      author_id: profile?.id,
      author_name: profile?.full_name || profile?.email || 'Staff',
      author_role: authorRole,
      body: replyBody.trim(),
      is_internal: isInternal,
    });
    if (!error) {
      setReplyBody('');
      await fetchReplies();
      // If sending a public reply, set status to in_progress (if was open)
      if (!isInternal && ticket.status === 'open') {
        await updateField('status', 'in_progress');
      }
    }
    setSending(false);
  };

  const updateField = async (field: string, value: string) => {
    setUpdating(true);
    const update: Record<string, string | null> = { [field]: value };
    if (field === 'status' && value === 'resolved') update.resolved_at = new Date().toISOString();
    const { data } = await supabase.from('support_tickets').update(update).eq('id', ticket.id).select().single();
    if (data) onUpdated(data as Ticket);
    setUpdating(false);
  };

  const assignedStaff = staff.find(s => s.id === ticket.assigned_to);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-gray-400">#{ticket.ticket_number}</span>
            <StatusBadge status={ticket.status} />
            <PriorityDot priority={ticket.priority} />
            <span className="text-xs text-gray-400 capitalize">{ticket.source.replace('_', ' ')}</span>
          </div>
          <h2 className="font-semibold text-gray-900 text-sm leading-snug truncate">{ticket.subject}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{ticket.customer_name} · {ticket.customer_email}</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="w-4 h-4" /></button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0 flex-wrap">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
          <select
            value={ticket.status}
            onChange={e => updateField('status', e.target.value)}
            disabled={updating}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
          >
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Priority</span>
          <select
            value={ticket.priority}
            onChange={e => updateField('priority', e.target.value)}
            disabled={updating}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
          >
            {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {/* Assign */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Assign</span>
          <select
            value={ticket.assigned_to ?? ''}
            onChange={e => updateField('assigned_to', e.target.value || null as any)}
            disabled={updating}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white max-w-[140px]"
          >
            <option value="">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
        </div>
        {updating && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 ml-auto" />}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loadingReplies ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          replies.map(reply => {
            const isCustomer = reply.author_role === 'customer';
            const isStaffReply = !isCustomer;
            return (
              <div key={reply.id} className={`flex gap-3 ${isStaffReply ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isCustomer
                    ? 'bg-gray-200 text-gray-600'
                    : reply.is_internal
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {initials(reply.author_name)}
                </div>
                <div className={`flex-1 max-w-[80%] ${isStaffReply ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{reply.author_name}</span>
                    {reply.is_internal && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Internal
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{timeAgo(reply.created_at)}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    reply.is_internal
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : isCustomer
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-600 text-white'
                  }`}>
                    {reply.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Reply composer */}
      <div className="border-t border-gray-100 bg-white px-5 py-4 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Reply as:</span>
          <button
            onClick={() => setIsInternal(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isInternal ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-3 h-3" /> Public Reply
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isInternal ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Lock className="w-3 h-3" /> Internal Note
          </button>
        </div>
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
          placeholder={isInternal ? 'Leave an internal note (only visible to staff)...' : 'Write a reply to the customer...'}
          rows={3}
          className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${
            isInternal ? 'border-amber-200 bg-amber-50 focus:ring-amber-400' : 'border-gray-200 focus:ring-red-500'
          }`}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400">Ctrl+Enter to send</p>
          <button
            onClick={sendReply}
            disabled={sending || !replyBody.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('open');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, role').in('role', ['admin', 'staff']),
    ]);
    setTickets((tRes.data ?? []) as Ticket[]);
    setStaff((sRes.data ?? []) as StaffMember[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(s) ||
        t.customer_email.toLowerCase().includes(s) ||
        t.customer_name.toLowerCase().includes(s) ||
        String(t.ticket_number).includes(s)
      );
    }
    return true;
  });

  // Stats
  const counts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: ticket list ── */}
      <div className={`flex flex-col border-r border-gray-200 bg-white ${selected ? 'hidden lg:flex lg:w-[380px]' : 'flex-1 lg:w-[380px] lg:flex-none'}`}>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map(({ key, label }) => {
              const cnt = key === 'all' ? tickets.length : (counts[key] ?? 0);
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key as any)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    statusFilter === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {label}
                  {cnt > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === key ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as any)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <Inbox className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No tickets</p>
            </div>
          ) : (
            filtered.map(t => {
              const isSelected = selected?.id === t.id;
              const staffName = staff.find(s => s.id === t.assigned_to)?.full_name ?? staff.find(s => s.id === t.assigned_to)?.email;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${isSelected ? 'bg-red-50 border-l-2 border-l-red-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">#{t.ticket_number}</span>
                      <StatusBadge status={t.status} />
                      <span className={`text-[10px] font-bold flex-shrink-0 ${PRIORITY_CFG[t.priority].color}`}>
                        {t.priority !== 'normal' ? t.priority.toUpperCase() : ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(t.updated_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{t.subject}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.customer_name} · {t.customer_email}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {t.reply_count > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <MessageSquare className="w-3 h-3" /> {t.reply_count}
                      </span>
                    )}
                    {staffName && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <UserCheck className="w-3 h-3" /> {staffName}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 capitalize">{t.source.replace('_', ' ')}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: ticket detail ── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TicketDetail
            ticket={selected}
            staff={staff}
            onClose={() => setSelected(null)}
            onUpdated={handleTicketUpdated}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">Select a ticket to view</p>
            <p className="text-xs text-gray-300 mt-1">or create a new one from the toolbar</p>
          </div>
        </div>
      )}

      {/* Stats strip at very top — desktop only when no ticket selected */}
      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); fetchAll(); }}
        />
      )}
    </div>
  );
}
