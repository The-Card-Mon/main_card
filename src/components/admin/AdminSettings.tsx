import { useEffect, useState } from 'react';
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
  Wrench,
  Eye,
  Share2,
  MessageSquare,
  Send,
} from 'lucide-react';

export default function AdminSettings() {
  const { user, profile } = useAuth();

  const [activeSection, setActiveSection] = useState<'account' | 'store' | 'security' | 'social' | 'discord' | 'ebay' | 'maintenance'>('account');

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nameSaved, setNameSaved] = useState(false);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // eBay connection test state
  const [ebayChecking, setEbayChecking] = useState(false);
  const [ebayStatus, setEbayStatus] = useState<{ connected: boolean; error?: string } | null>(null);

  // Maintenance state
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintTitle, setMaintTitle] = useState("We'll Be Right Back");
  const [maintMessage, setMaintMessage] = useState("We're performing scheduled maintenance and will be back shortly. Thank you for your patience.");
  const [maintBg, setMaintBg] = useState('');
  const [maintLoaded, setMaintLoaded] = useState(false);
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintSaved, setMaintSaved] = useState(false);

  // Load maintenance config + social links on mount
  useEffect(() => {
    supabase
      .from('modal_config')
      .select('maintenance_enabled, maintenance_title, maintenance_message, maintenance_bg_image_url, social_instagram, social_tiktok, social_facebook, social_twitter, social_youtube, social_discord, discord_webhook_url')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMaintEnabled(data.maintenance_enabled ?? false);
          setMaintTitle(data.maintenance_title ?? "We'll Be Right Back");
          setMaintMessage(data.maintenance_message ?? '');
          setMaintBg(data.maintenance_bg_image_url ?? '');
          setSocialInstagram(data.social_instagram ?? '');
          setSocialTiktok(data.social_tiktok ?? '');
          setSocialFacebook(data.social_facebook ?? '');
          setSocialTwitter(data.social_twitter ?? '');
          setSocialYoutube(data.social_youtube ?? '');
          setSocialDiscord(data.social_discord ?? '');
          setDiscordWebhook(data.discord_webhook_url ?? '');
        }
        setMaintLoaded(true);
      });
  }, []);

  const saveMaintenance = async () => {
    setMaintSaving(true);
    await supabase.from('modal_config').update({
      maintenance_enabled: maintEnabled,
      maintenance_title: maintTitle,
      maintenance_message: maintMessage,
      maintenance_bg_image_url: maintBg,
    }).eq('id', 1);
    setMaintSaving(false);
    setMaintSaved(true);
    setTimeout(() => setMaintSaved(false), 2500);
  };

  const toggleMaintenance = async (val: boolean) => {
    setMaintEnabled(val);
    await supabase.from('modal_config').update({ maintenance_enabled: val }).eq('id', 1);
  };

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

  // Social links
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTiktok, setSocialTiktok]       = useState('');
  const [socialFacebook, setSocialFacebook]   = useState('');
  const [socialTwitter, setSocialTwitter]     = useState('');
  const [socialYoutube, setSocialYoutube]     = useState('');
  const [socialDiscord, setSocialDiscord]     = useState('');
  const [socialSaving, setSocialSaving]       = useState(false);
  const [socialSaved, setSocialSaved]         = useState(false);

  // Discord webhook notifications
  const [discordWebhook, setDiscordWebhook]   = useState('');
  const [discordSaving, setDiscordSaving]     = useState(false);
  const [discordSaved, setDiscordSaved]       = useState(false);
  const [discordTesting, setDiscordTesting]   = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  const saveSocialLinks = async () => {
    setSocialSaving(true);
    await supabase.from('modal_config').update({
      social_instagram: socialInstagram,
      social_tiktok:    socialTiktok,
      social_facebook:  socialFacebook,
      social_twitter:   socialTwitter,
      social_youtube:   socialYoutube,
      social_discord:   socialDiscord,
    }).eq('id', 1);
    setSocialSaving(false);
    setSocialSaved(true);
    setTimeout(() => setSocialSaved(false), 2500);
  };

  const saveDiscordWebhook = async () => {
    setDiscordSaving(true);
    await supabase.from('modal_config').update({ discord_webhook_url: discordWebhook }).eq('id', 1);
    setDiscordSaving(false);
    setDiscordSaved(true);
    setTimeout(() => setDiscordSaved(false), 2500);
  };

  const testDiscordWebhook = async () => {
    if (!discordWebhook) return;
    setDiscordTesting(true);
    setDiscordTestResult(null);
    try {
      const res = await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: ':white_check_mark: Webhook Test',
            description: 'Discord notifications are connected and working.',
            color: 3066993,
            footer: { text: 'The Card Mon Admin' },
          }],
        }),
      });
      setDiscordTestResult(res.ok ? { ok: true, msg: 'Test message sent!' } : { ok: false, msg: `Discord returned ${res.status}` });
    } catch (err: any) {
      setDiscordTestResult({ ok: false, msg: err.message });
    } finally {
      setDiscordTesting(false);
      setTimeout(() => setDiscordTestResult(null), 5000);
    }
  };

  const sections = [
    { id: 'account' as const,     label: 'Account',          icon: User },
    { id: 'store' as const,       label: 'Store Settings',   icon: Globe },
    { id: 'social' as const,      label: 'Social Media',     icon: Share2 },
    { id: 'discord' as const,     label: 'Discord Alerts',   icon: MessageSquare },
    { id: 'security' as const,    label: 'Security',         icon: Lock },
    { id: 'maintenance' as const, label: 'Maintenance',      icon: Wrench },
    { id: 'ebay' as const,        label: 'eBay Integration', icon: ShoppingBag },
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

            {/* Social */}
            {activeSection === 'social' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Share2 className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Social Media Links</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">Links appear in the site footer. Leave blank to hide an icon.</p>
                    {[
                      { label: 'Instagram',   placeholder: 'https://instagram.com/yourchannel', value: socialInstagram, set: setSocialInstagram },
                      { label: 'TikTok',      placeholder: 'https://tiktok.com/@yourchannel',  value: socialTiktok,    set: setSocialTiktok },
                      { label: 'Facebook',    placeholder: 'https://facebook.com/yourpage',    value: socialFacebook,  set: setSocialFacebook },
                      { label: 'X / Twitter', placeholder: 'https://x.com/yourhandle',         value: socialTwitter,   set: setSocialTwitter },
                      { label: 'YouTube',     placeholder: 'https://youtube.com/@yourchannel', value: socialYoutube,   set: setSocialYoutube },
                      { label: 'Discord',     placeholder: 'https://discord.gg/yourinvite',    value: socialDiscord,   set: setSocialDiscord },
                    ].map(({ label, placeholder, value, set }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                        <input
                          type="url"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          placeholder={placeholder}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    ))}
                    <div className="pt-2">
                      <button
                        onClick={saveSocialLinks}
                        disabled={socialSaving}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {socialSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : socialSaved ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                        {socialSaving ? 'Saving...' : socialSaved ? 'Saved!' : 'Save Links'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Maintenance */}
            {activeSection === 'maintenance' && (
              <>
                {/* Toggle card */}
                <div className={`bg-white rounded-xl border overflow-hidden transition-colors ${maintEnabled ? 'border-amber-300' : 'border-gray-200'}`}>
                  <div className={`flex items-center gap-3 px-6 py-4 border-b transition-colors ${maintEnabled ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50/50'}`}>
                    <Wrench className={`w-5 h-5 ${maintEnabled ? 'text-amber-600' : 'text-gray-500'}`} />
                    <h3 className={`font-semibold ${maintEnabled ? 'text-amber-900' : 'text-gray-900'}`}>Maintenance Mode</h3>
                    {maintEnabled && (
                      <span className="ml-auto text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-amber-500 text-white">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable maintenance mode</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          The site will be hidden from visitors. Admins can still access everything.
                        </p>
                      </div>
                      <button
                        onClick={() => toggleMaintenance(!maintEnabled)}
                        className="relative rounded-full transition-colors flex-shrink-0"
                        style={{ width: 44, height: 24, backgroundColor: maintEnabled ? '#f59e0b' : '#d1d5db' }}
                      >
                        <div
                          className="absolute bg-white rounded-full shadow transition-all"
                          style={{ width: 20, height: 20, top: 2, left: maintEnabled ? 22 : 2 }}
                        />
                      </button>
                    </div>
                    {maintEnabled && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <strong>Maintenance mode is ON.</strong> All visitors see the maintenance page.
                          Staff can log in by clicking the store logo 5 times quickly on the maintenance page.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appearance */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Eye className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Maintenance Page Content</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {!maintLoaded ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Headline
                          </label>
                          <input
                            type="text"
                            value={maintTitle}
                            onChange={(e) => setMaintTitle(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="We'll Be Right Back"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Message
                          </label>
                          <textarea
                            rows={3}
                            value={maintMessage}
                            onChange={(e) => setMaintMessage(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                            placeholder="We're performing scheduled maintenance..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Background Image URL
                            <span className="ml-1 text-gray-400 normal-case font-normal">(optional)</span>
                          </label>
                          <input
                            type="url"
                            value={maintBg}
                            onChange={(e) => setMaintBg(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="https://... leave blank for default dark background"
                          />
                        </div>
                        <div className="pt-1">
                          <button
                            onClick={saveMaintenance}
                            disabled={maintSaving}
                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            {maintSaving
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : maintSaved
                              ? <CheckCircle className="w-4 h-4 text-green-400" />
                              : null}
                            {maintSaving ? 'Saving...' : maintSaved ? 'Saved!' : 'Save Content'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Staff access hint */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">How staff bypass maintenance</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    On the maintenance page, click the <strong className="text-gray-700">store logo</strong> (top center)
                    <strong className="text-gray-700"> 5 times quickly</strong> within 3 seconds. A minimal login panel will
                    appear. Admin credentials grant full access past the maintenance screen.
                    This trigger is invisible to regular visitors.
                  </p>
                </div>
              </>
            )}

            {/* Discord Alerts */}
            {activeSection === 'discord' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-gray-900">Discord Webhook</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                      Paste a Discord Incoming Webhook URL below. Notifications fire automatically via database triggers — no polling required.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Webhook URL</label>
                      <input
                        type="url"
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={saveDiscordWebhook}
                        disabled={discordSaving}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {discordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : discordSaved ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                        {discordSaving ? 'Saving...' : discordSaved ? 'Saved!' : 'Save Webhook'}
                      </button>
                      <button
                        onClick={testDiscordWebhook}
                        disabled={discordTesting || !discordWebhook}
                        className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {discordTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {discordTesting ? 'Sending...' : 'Send Test'}
                      </button>
                      {discordTestResult && (
                        <span className={`text-sm font-medium flex items-center gap-1.5 ${discordTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                          {discordTestResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {discordTestResult.msg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">What Gets Notified</h3>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {[
                        { emoji: '🛒', label: 'New Order Placed',        desc: 'Fires when a customer completes checkout' },
                        { emoji: '📥', label: 'New Sell Submission',      desc: 'Fires when someone submits cards to sell' },
                        { emoji: '✉️',  label: 'New Contact Message',     desc: 'Fires on every contact form submission' },
                        { emoji: '🎫', label: 'New Support Ticket',       desc: 'Fires when a support ticket is opened' },
                      ].map(({ emoji, label, desc }) => (
                        <li key={label} className="flex items-start gap-3">
                          <span className="text-lg leading-none mt-0.5">{emoji}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <p className="text-xs text-gray-400">{desc}</p>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto mt-0.5 flex-shrink-0" />
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                      Notifications are sent by the database directly — they fire even if no browser tab is open.
                    </p>
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
