import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Lock,
  Bell,
  Globe,
  ShieldCheck,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Tag,
  Star,
  ShoppingBag,
  Loader2,
  XCircle,
  ExternalLink,
  Key,
} from 'lucide-react';

export default function AdminSettings() {
  const { user, profile } = useAuth();

  const [activeSection, setActiveSection] = useState<'account' | 'store' | 'security' | 'ebay'>('account');

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nameSaved, setNameSaved] = useState(false);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // eBay connection test state
  const [ebayChecking, setEbayChecking] = useState(false);
  const [ebayStatus, setEbayStatus] = useState<{ connected: boolean; error?: string } | null>(null);

  const testEbayConnection = async () => {
    setEbayChecking(true);
    setEbayStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('ebay-listing', { body: { action: 'check' } });
      if (error) throw new Error(error.message);
      setEbayStatus({ connected: data?.connected === true, error: data?.error });
    } catch (err: any) {
      setEbayStatus({ connected: false, error: err.message });
    } finally {
      setEbayChecking(false);
    }
  };

  const [storeName, setStoreName] = useState('The Card Mon');
  const [storeTagline, setStoreTagline] = useState('Premium Pokemon Cards');
  const [storeSaved, setStoreSaved] = useState(false);

  const saveName = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const savePassword = async () => {
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Password updated successfully.' });
      setNewPw('');
      setConfirmPw('');
    }
    setTimeout(() => setPwMsg(null), 4000);
  };

  const saveStore = () => {
    setStoreSaved(true);
    setTimeout(() => setStoreSaved(false), 2500);
  };

  const sections = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'store' as const, label: 'Store Settings', icon: Globe },
    { id: 'security' as const, label: 'Security', icon: Lock },
    { id: 'ebay' as const, label: 'eBay Integration', icon: ShoppingBag },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-0.5">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ${activeSection === id ? 'opacity-60' : 'text-gray-300'}`} />
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-4">

            {/* Account */}
            {activeSection === 'account' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <User className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Profile Information</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed from the admin panel.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Role
                      </label>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                          Administrator
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={saveName}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {nameSaved ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                        {nameSaved ? 'Saved!' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      { label: 'New Order Placed', desc: 'Get notified when a customer places an order', checked: true },
                      { label: 'Out of Stock Alert', desc: 'Notify when a product reaches zero quantity', checked: true },
                      { label: 'New Customer Registration', desc: 'Get notified when a new account is created', checked: false },
                    ].map(({ label, desc, checked }) => (
                      <div key={label} className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                        <div className={`flex-shrink-0 w-10 h-5.5 rounded-full transition-colors cursor-pointer ${checked ? 'bg-red-500' : 'bg-gray-200'}`}
                          style={{ width: 40, height: 22, position: 'relative' }}>
                          <div className="absolute top-0 bg-white rounded-full shadow transition-all"
                            style={{ width: 18, height: 18, top: 2, left: checked ? 20 : 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Store Settings */}
            {activeSection === 'store' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Globe className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Store Identity</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={storeTagline}
                        onChange={(e) => setStoreTagline(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={saveStore}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {storeSaved ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                        {storeSaved ? 'Saved!' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Tag className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Catalog Rules</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      { label: 'Allow Guest Browsing', desc: 'Non-logged-in users can view products', active: true },
                      { label: 'Require Login to Checkout', desc: 'Customers must sign in before placing orders', active: true },
                      { label: 'Show Out of Stock Items', desc: 'Display cards with 0 quantity in catalog', active: false },
                    ].map(({ label, desc, active }) => (
                      <div key={label} className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                        <div className={`flex-shrink-0 rounded-full cursor-pointer transition-colors`}
                          style={{ width: 40, height: 22, backgroundColor: active ? '#ef4444' : '#d1d5db', position: 'relative' }}>
                          <div className="absolute bg-white rounded-full shadow transition-all"
                            style={{ width: 18, height: 18, top: 2, left: active ? 20 : 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Star className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-900">Featured Section</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <p className="text-sm text-gray-600">
                      Products marked as "Featured" will appear in the homepage hero section and the Featured Cards row.
                      Manage featured status from the Products section.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">Tip: Keep featured cards to 4–8 for best visual impact on the home page.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* eBay Integration */}
            {activeSection === 'ebay' && (
              <>
                {/* Connection status */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">eBay Connection</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                      Test that your eBay API credentials are working correctly. Once connected,
                      you can list any card directly from the Products page using the "List" button.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={testEbayConnection}
                        disabled={ebayChecking}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {ebayChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        {ebayChecking ? 'Testing...' : 'Test Connection'}
                      </button>
                      {ebayStatus && (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${ebayStatus.connected ? 'text-green-700' : 'text-red-700'}`}>
                          {ebayStatus.connected
                            ? <><CheckCircle className="w-4 h-4" /> Connected</>
                            : <><XCircle className="w-4 h-4" /> Not connected</>}
                        </span>
                      )}
                    </div>
                    {ebayStatus && !ebayStatus.connected && ebayStatus.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700 font-mono break-all">
                        {ebayStatus.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Required secrets */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Key className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Required Secrets</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <p className="text-sm text-gray-500 mb-4">
                      Add these as Edge Function secrets in your Supabase dashboard under
                      <strong className="text-gray-700"> Project Settings → Edge Functions → Secrets</strong>.
                    </p>
                    {[
                      { name: 'EBAY_CLIENT_ID', desc: 'Your eBay developer app Client ID' },
                      { name: 'EBAY_CLIENT_SECRET', desc: 'Your eBay developer app Client Secret' },
                      { name: 'EBAY_REFRESH_TOKEN', desc: 'OAuth refresh token from your eBay seller account' },
                      { name: 'EBAY_FULFILLMENT_POLICY_ID', desc: 'Shipping policy ID from your eBay account' },
                      { name: 'EBAY_PAYMENT_POLICY_ID', desc: 'Payment policy ID from your eBay account' },
                      { name: 'EBAY_RETURN_POLICY_ID', desc: 'Return policy ID from your eBay account' },
                    ].map(({ name, desc }) => (
                      <div key={name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <code className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 whitespace-nowrap flex-shrink-0">
                          {name}
                        </code>
                        <span className="text-xs text-gray-500 pt-1">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How to get credentials */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <ExternalLink className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Setup Guide</h3>
                  </div>
                  <div className="p-6 space-y-3 text-sm text-gray-600">
                    <ol className="list-decimal list-inside space-y-2.5">
                      <li>Register at <strong>developer.ebay.com</strong> and create a new application to get your Client ID and Secret.</li>
                      <li>In your app settings, add your redirect URI and enable the <em>sell.inventory</em> and <em>sell.account</em> OAuth scopes.</li>
                      <li>Run the eBay OAuth Authorization Code flow to get a Refresh Token tied to your seller account.</li>
                      <li>In your eBay seller account, create Fulfillment, Payment, and Return business policies and note their IDs.</li>
                      <li>Add all six secrets above to Supabase, then click <strong>Test Connection</strong>.</li>
                    </ol>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      <a
                        href="https://developer.ebay.com/develop/get-started"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        eBay Developer Portal
                      </a>
                      <a
                        href="https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        OAuth Refresh Token Guide
                      </a>
                    </div>
                  </div>
                </div>

                {/* How listing works */}
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works</h4>
                  <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
                    <li>Go to <strong>Products</strong> and click the <strong>List</strong> button on any card.</li>
                    <li>The card is published to eBay as a Fixed Price listing in the Pokemon Cards category.</li>
                    <li>Use the <strong>sync</strong> icon to push price or detail changes to an existing listing.</li>
                    <li>Use the <strong>end</strong> icon to withdraw the eBay listing without deleting the card.</li>
                    <li>eBay listing status (Live / Ended / Error) is shown inline in the Products table.</li>
                  </ul>
                </div>
              </>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Lock className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Change Password</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {pwMsg && (
                      <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
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
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Repeat password"
                      />
                    </div>
                    <button
                      onClick={savePassword}
                      disabled={savingPw || !newPw || !confirmPw}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {savingPw ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <ShieldCheck className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Access Control</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <ShieldCheck className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Admin-Only Store</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Only accounts with the admin role can create or manage product listings.
                          Customers can browse and purchase, but cannot list items for sale.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Row-Level Security Active</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Database-level security policies enforce all access controls automatically.
                          Admin actions are verified server-side.
                        </p>
                      </div>
                    </div>
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
