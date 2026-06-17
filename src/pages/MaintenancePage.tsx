import { useRef, useState } from 'react';
import { Loader2, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MaintenanceConfig {
  title: string;
  message: string;
  bgImageUrl: string;
}

interface MaintenancePageProps {
  config: MaintenanceConfig;
  onStaffAccess: () => void;
}

export default function MaintenancePage({ config, onStaffAccess }: MaintenancePageProps) {
  // Hidden staff login — triggered by clicking the logo 5 times within 3 seconds
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [logging, setLogging] = useState(false);

  const handleLogoClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      setShowLogin(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLogging(true);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !data.user) {
      setError('Invalid credentials.');
      setLogging(false);
      return;
    }
    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Staff access only.');
      setLogging(false);
      return;
    }
    setLogging(false);
    setShowLogin(false);
    onStaffAccess();
  };

  const bgStyle = config.bgImageUrl
    ? { backgroundImage: `url(${config.bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0c0c0e', ...bgStyle }}
    >
      {/* Subtle background overlay if bg image */}
      {config.bgImageUrl && (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Background texture / grid */}
      {!config.bgImageUrl && (
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                              repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
          }}
        />
      )}

      {/* Glow orbs */}
      {!config.bgImageUrl && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)' }} />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #ef4444, transparent 70%)' }} />
        </>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full mx-auto px-6 text-center">

        {/* Logo — clicking 5× triggers staff login */}
        <button
          onClick={handleLogoClick}
          className="mb-10 focus:outline-none select-none"
          tabIndex={-1}
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 group">
            {/* Card icon SVG */}
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center group-hover:border-red-600/30 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-red-500" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 9V4M12 15v5M9 12H3M21 12h-6" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
              The Card Mon
            </span>
          </div>
        </button>

        {/* Animated status indicator */}
        <div className="flex items-center gap-2 mb-8">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase text-amber-400/80">
            Maintenance in Progress
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight tracking-tight">
          {config.title || "We'll Be Right Back"}
        </h1>

        {/* Divider */}
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent mb-6" />

        {/* Message */}
        <p className="text-base text-white/50 leading-relaxed max-w-sm">
          {config.message || "We're performing scheduled maintenance. Thank you for your patience."}
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <p className="text-[11px] text-white/15 tracking-wider select-none">
          &copy; {new Date().getFullYear()} The Card Mon
        </p>
      </div>

      {/* Staff login overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowLogin(false)}>
          <div
            className="w-full max-w-sm bg-[#141416] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-white/80">Staff Access</span>
              </div>
              <button onClick={() => setShowLogin(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/30 transition-all"
                  placeholder="staff@cardmon.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/30 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/30 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={logging || !email || !password}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors mt-2"
              >
                {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {logging ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
