import { useEffect, useState } from 'react';
import {
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Gift,
  ArrowDownToLine,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getOnChainPkbTotalSupply, PKB_CONTRACT } from '../../lib/pkb';

type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  wallet_address: string;
  status: WithdrawalStatus;
  tx_hash: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profile?: { email: string; full_name: string | null };
}

interface LedgerBalance {
  user_id: string;
  balance: number;
  email: string;
  full_name: string | null;
}

const STATUS_CONFIG: Record<WithdrawalStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: Loader2 },
  completed:  { label: 'Completed',  color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  rejected:   { label: 'Rejected',   color: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
};

const FILTER_TABS: { key: WithdrawalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortAddr(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function AdminRewards() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [processForm, setProcessForm] = useState<{ id: string; txHash: string; note: string } | null>(null);
  const [rejectForm, setRejectForm] = useState<{ id: string; note: string } | null>(null);
  const [showAward, setShowAward] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [onChainSupply, setOnChainSupply] = useState<number | null>(null);

  // Manual award form
  const [customers, setCustomers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [awardUserId, setAwardUserId] = useState('');
  const [awardAmount, setAwardAmount] = useState('');
  const [awardDesc, setAwardDesc] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [wRes, pRes, cRes] = await Promise.all([
      supabase.from('rewards_withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name').eq('role', 'customer'),
      supabase.from('rewards_ledger').select('user_id, amount'),
    ]);

    const profiles = (pRes.data ?? []) as { id: string; email: string; full_name: string | null }[];
    setCustomers(profiles);

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const ws = (wRes.data ?? []) as Withdrawal[];
    setWithdrawals(ws.map((w) => ({
      ...w,
      profile: profileMap.get(w.user_id),
    })));

    // Calculate balances per user
    const ledger = (cRes.data ?? []) as { user_id: string; amount: number }[];
    const balanceMap = new Map<string, number>();
    for (const row of ledger) {
      balanceMap.set(row.user_id, (balanceMap.get(row.user_id) ?? 0) + Number(row.amount));
    }
    const bals: LedgerBalance[] = [];
    for (const [uid, bal] of balanceMap.entries()) {
      const p = profileMap.get(uid);
      if (p) bals.push({ user_id: uid, balance: bal, email: p.email, full_name: p.full_name });
    }
    bals.sort((a, b) => b.balance - a.balance);
    setBalances(bals);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    getOnChainPkbTotalSupply()
      .then(setOnChainSupply)
      .catch(() => setOnChainSupply(null));
  }, []);

  const setActing = (id: string, on: boolean) =>
    setActionLoading((prev) => { const s = new Set(prev); on ? s.add(id) : s.delete(id); return s; });

  const processWithdrawal = async (id: string, status: 'completed' | 'processing', txHash: string, note: string) => {
    setActing(id, true);
    try {
      await supabase.rpc('admin_process_withdrawal', {
        p_withdrawal_id: id,
        p_status: status,
        p_tx_hash: txHash || null,
        p_admin_note: note || null,
      });
      setProcessForm(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to process');
    } finally {
      setActing(id, false);
    }
  };

  const rejectWithdrawal = async (id: string, note: string) => {
    setActing(id, true);
    try {
      await supabase.rpc('admin_process_withdrawal', {
        p_withdrawal_id: id,
        p_status: 'rejected',
        p_tx_hash: null,
        p_admin_note: note || null,
      });
      setRejectForm(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to reject');
    } finally {
      setActing(id, false);
    }
  };

  const handleAward = async () => {
    if (!awardUserId || !awardAmount || Number(awardAmount) <= 0) return;
    setAwarding(true);
    try {
      const { error } = await supabase.rpc('admin_award_pokebucks', {
        p_user_id: awardUserId,
        p_amount: Number(awardAmount),
        p_description: awardDesc.trim() || `Manual bonus of ${awardAmount} $PKB`,
      });
      if (error) throw new Error(error.message);
      setAwardMsg({ type: 'success', text: `Awarded ${awardAmount} $PKB successfully.` });
      setAwardUserId(''); setAwardAmount(''); setAwardDesc('');
      await fetchData();
    } catch (err: any) {
      setAwardMsg({ type: 'error', text: err.message ?? 'Failed to award PKB' });
    } finally {
      setAwarding(false);
      setTimeout(() => setAwardMsg(null), 4000);
    }
  };

  const filtered = filter === 'all' ? withdrawals : withdrawals.filter((w) => w.status === filter);
  const totalIssued = balances.reduce((sum, b) => sum + Math.max(b.balance, 0), 0);
  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On-chain total supply */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center mb-3">
            <Flame className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Total $PKB Minted (On-Chain)</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
            {onChainSupply === null
              ? <span className="text-gray-300 text-lg">Loading...</span>
              : onChainSupply.toLocaleString()}
          </p>
          <a
            href={`https://polygonscan.com/token/${PKB_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-0.5"
          >
            View on Polygonscan <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {[
          { label: 'PKB Issued via Rewards', value: totalIssued.toLocaleString(), sub: `≈ $${(totalIssued / 10).toFixed(2)} in app`, icon: Coins, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Pending Withdrawals', value: pendingCount, sub: 'awaiting processing', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total PKB Withdrawn', value: totalWithdrawn.toLocaleString(), sub: `≈ $${(totalWithdrawn / 10).toFixed(2)} on Polygon`, icon: ArrowDownToLine, color: 'text-green-600', bg: 'bg-green-50' },
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

      {/* Withdrawals */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Withdrawal Requests</h2>
          <button onClick={fetchData} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          {FILTER_TABS.map(({ key, label }) => {
            const count = key === 'all' ? withdrawals.length : withdrawals.filter((w) => w.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key as WithdrawalStatus | 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === key ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <ArrowDownToLine className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No withdrawals in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((w) => {
              const cfg = STATUS_CONFIG[w.status];
              const StatusIcon = cfg.icon;
              const isActing = actionLoading.has(w.id);
              const isProcessing = processForm?.id === w.id;
              const isRejecting = rejectForm?.id === w.id;

              return (
                <div key={w.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          <StatusIcon className={`w-2.5 h-2.5 ${w.status === 'processing' ? 'animate-spin' : ''}`} />
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {w.amount.toLocaleString()} $PKB
                        </span>
                        <span className="text-xs text-gray-400">≈ ${(w.amount / 10).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium truncate">
                        {w.profile?.full_name || w.profile?.email || w.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">{w.profile?.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {shortAddr(w.wallet_address)}
                        </span>
                        <a
                          href={`https://polygonscan.com/address/${w.wallet_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="View on Polygonscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {w.tx_hash && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-gray-400">TX:</span>
                          <a
                            href={`https://polygonscan.com/tx/${w.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-blue-600 hover:text-blue-800"
                          >
                            {shortAddr(w.tx_hash)}
                          </a>
                        </div>
                      )}
                      {w.admin_note && (
                        <p className="text-xs text-gray-400 mt-1 italic">Note: {w.admin_note}</p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">{fmt(w.created_at)}</p>
                    </div>

                    {/* Actions */}
                    {(w.status === 'pending' || w.status === 'processing') && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => { setProcessForm({ id: w.id, txHash: '', note: '' }); setRejectForm(null); }}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Complete'}
                        </button>
                        <button
                          onClick={() => { setRejectForm({ id: w.id, note: '' }); setProcessForm(null); }}
                          disabled={isActing}
                          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Process form */}
                  {isProcessing && (
                    <div className="mt-3 p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-green-800">Enter Polygon transaction hash</p>
                      <input
                        type="text"
                        value={processForm!.txHash}
                        onChange={(e) => setProcessForm({ ...processForm!, txHash: e.target.value })}
                        placeholder="0x..."
                        className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      />
                      <input
                        type="text"
                        value={processForm!.note}
                        onChange={(e) => setProcessForm({ ...processForm!, note: e.target.value })}
                        placeholder="Optional note"
                        className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => processWithdrawal(w.id, 'completed', processForm!.txHash, processForm!.note)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark Complete
                        </button>
                        <button
                          onClick={() => processWithdrawal(w.id, 'processing', processForm!.txHash, processForm!.note)}
                          disabled={isActing}
                          className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-white transition-colors"
                        >
                          Mark Processing
                        </button>
                        <button onClick={() => setProcessForm(null)} className="px-3 py-2 text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Reject form */}
                  {isRejecting && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-red-800">Rejection reason (PKB will be refunded)</p>
                      <input
                        type="text"
                        value={rejectForm!.note}
                        onChange={(e) => setRejectForm({ ...rejectForm!, note: e.target.value })}
                        placeholder="Reason (optional)"
                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejectWithdrawal(w.id, rejectForm!.note)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Confirm Reject
                        </button>
                        <button onClick={() => setRejectForm(null)} className="px-3 py-2 text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Award */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAward(!showAward)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-gray-900 text-sm">Manually Award $PKB</span>
          </div>
          {showAward ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showAward && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
            {awardMsg && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mt-4 ${
                awardMsg.type === 'success'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {awardMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {awardMsg.text}
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Customer</label>
                <select
                  value={awardUserId}
                  onChange={(e) => setAwardUserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PKB Amount</label>
                <input
                  type="number"
                  min="1"
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <input
                  type="text"
                  value={awardDesc}
                  onChange={(e) => setAwardDesc(e.target.value)}
                  placeholder="e.g. Welcome bonus"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <button
              onClick={handleAward}
              disabled={awarding || !awardUserId || !awardAmount || Number(awardAmount) <= 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-yellow-900/20"
            >
              {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              {awarding ? 'Awarding...' : 'Award PokeBucks'}
            </button>
          </div>
        )}
      </div>

      {/* Balances leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-gray-900 text-sm">Customer Balances</span>
            <span className="text-xs text-gray-400">({balances.length} holders)</span>
          </div>
          {showBalances ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showBalances && (
          <div className="border-t border-gray-100">
            {balances.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No PKB holders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {balances.map((b, i) => (
                  <div key={b.user_id} className="flex items-center gap-4 px-6 py-3">
                    <span className="text-xs font-bold text-gray-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.full_name || b.email}</p>
                      {b.full_name && <p className="text-xs text-gray-400 truncate">{b.email}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{Math.max(0, b.balance).toLocaleString()} <span className="text-xs font-semibold text-yellow-600">$PKB</span></p>
                      <p className="text-xs text-gray-400">≈ ${(Math.max(0, b.balance) / 10).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
