import { useEffect, useState } from 'react';
import {
  Coins,
  Loader2,
  Gift,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LedgerBalance {
  user_id: string;
  balance: number;
  email: string;
  full_name: string | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminRewards() {
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAward, setShowAward] = useState(false);
  const [showBalances, setShowBalances] = useState(true);

  // Manual award form
  const [customers, setCustomers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [awardUserId, setAwardUserId] = useState('');
  const [awardAmount, setAwardAmount] = useState('');
  const [awardDesc, setAwardDesc] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats
  const [totalIssued, setTotalIssued] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('role', 'customer'),
      supabase.from('rewards_ledger').select('user_id, amount, type'),
    ]);

    const profiles = (pRes.data ?? []) as { id: string; email: string; full_name: string | null }[];
    setCustomers(profiles);

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const ledger = (cRes.data ?? []) as { user_id: string; amount: number; type: string }[];

    let issued = 0;
    let redeemed = 0;
    const balanceMap = new Map<string, number>();
    for (const row of ledger) {
      balanceMap.set(row.user_id, (balanceMap.get(row.user_id) ?? 0) + Number(row.amount));
      if (Number(row.amount) > 0) issued += Number(row.amount);
      if (row.type === 'spent') redeemed += Math.abs(Number(row.amount));
    }

    setTotalIssued(issued);
    setTotalRedeemed(redeemed);

    const bals: LedgerBalance[] = [];
    for (const [uid, bal] of balanceMap.entries()) {
      const p = profileMap.get(uid);
      if (p) bals.push({ user_id: uid, balance: bal, email: p.email, full_name: p.full_name });
    }
    bals.sort((a, b) => b.balance - a.balance);
    setBalances(bals);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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

  const activeHolders = balances.filter((b) => b.balance > 0).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total $PKB Issued', value: totalIssued.toLocaleString(), sub: `≈ $${(totalIssued / 10).toFixed(2)} in rewards given`, icon: Coins, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total $PKB Redeemed', value: totalRedeemed.toLocaleString(), sub: `≈ $${(totalRedeemed / 10).toFixed(2)} in discounts`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Active Holders', value: activeHolders, sub: `${balances.length} total customers tracked`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
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

      {/* Customer Balances */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchData(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {showBalances ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {showBalances && (
          <div className="border-t border-gray-100">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : balances.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No $PKB holders yet</p>
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
                      <p className="text-sm font-bold text-gray-900">
                        {Math.max(0, b.balance).toLocaleString()}{' '}
                        <span className="text-xs font-semibold text-yellow-600">$PKB</span>
                      </p>
                      <p className="text-xs text-gray-400">≈ ${(Math.max(0, b.balance) / 10).toFixed(2)} value</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Earn/redeem info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-yellow-800 mb-1">Rates</p>
        <p className="text-xs text-yellow-700">Earn rate: <strong>$1 spent = 10 $PKB</strong> &nbsp;·&nbsp; Redeem rate: <strong>10 $PKB = $1 off</strong></p>
        <p className="text-xs text-yellow-600 mt-1">Points are awarded automatically after each completed order and can be redeemed at checkout.</p>
      </div>
    </div>
  );
}
