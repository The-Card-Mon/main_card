import { useState } from 'react';
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
  onNavigate: (page: string) => void;
}

type Mode = 'signin' | 'signup' | 'forgot';

function SetPasswordForm({ onNavigate }: AuthPageProps) {
  const { needsPasswordSetup, clearPasswordSetup, user } = useAuth();
  const isInvite = window.location.hash.includes('type=invite');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!needsPasswordSetup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const updatePayload: { password: string; data?: { full_name: string } } = { password };
      if (isInvite && fullName.trim()) updatePayload.data = { full_name: fullName.trim() };

      const { error: updateErr } = await supabase.auth.updateUser(updatePayload);
      if (updateErr) { setError(updateErr.message); return; }

      if (isInvite && fullName.trim() && user) {
        await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
      }

      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setSuccess(true);
      clearPasswordSetup();
      setTimeout(() => onNavigate('home'), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-2xl p-8">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
          <Lock className="w-4 h-4 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-lg">
          {isInvite ? "You've been invited!" : 'Set a new password'}
        </h2>
      </div>
      <p className="text-gray-500 text-xs mb-6 ml-10">
        {isInvite
          ? 'Your account is ready. Choose a password to get started.'
          : 'Enter a new password for your account.'}
      </p>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 border border-red-500/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 bg-green-500/10 text-green-400 text-sm px-4 py-3 rounded-xl mb-4 border border-green-500/20">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Password set! Redirecting...
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {isInvite && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Your name"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {isInvite ? 'Choose a Password' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="Repeat password"
                required
                minLength={6}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/30 mt-2"
          >
            {submitting ? 'Saving...' : isInvite ? 'Set Password & Continue' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AuthPage({ onNavigate }: AuthPageProps) {
  const { signIn, signUp, needsPasswordSetup } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setError(null); setSuccess(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/?reset=true',
      });
      setSubmitting(false);
      if (err) {
        setError(err.message);
      } else {
        setSuccess('Password reset link sent — check your email inbox.');
      }
      return;
    }

    const result = mode === 'signup'
      ? await signUp(email, password, fullName)
      : await signIn(email, password);

    if (result.error) {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex flex-col items-center group"
          >
            <img
              src="/assets/branding/gpt-image-2_creating_a_logo_for_a_business_named_The_Card_Mon_a_trading_card_selling_company-0.jpg"
              alt="The Card Mon"
              className="h-24 w-auto rounded-xl object-contain group-hover:opacity-90 transition-opacity"
            />
          </button>

          <p className="text-gray-500 mt-4 text-sm">
            {needsPasswordSetup
              ? 'Secure your account'
              : mode === 'signup'
              ? 'Create your collector account'
              : mode === 'forgot'
              ? 'Reset your password'
              : 'Welcome back, collector'}
          </p>
        </div>

        {/* Set-password form (invite or recovery) */}
        {needsPasswordSetup && <SetPasswordForm onNavigate={onNavigate} />}

        {/* Normal sign in / sign up / forgot forms */}
        {!needsPasswordSetup && (
          <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-2xl p-8">

            {mode === 'forgot' && (
              <button
                onClick={() => { setMode('signin'); reset(); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            )}

            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 border border-red-500/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 bg-green-500/10 text-green-400 text-sm px-4 py-3 rounded-xl mb-6 border border-green-500/20">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); reset(); }}
                        className="text-[11px] text-red-400/80 hover:text-red-400 transition-colors font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              {mode === 'forgot' && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || (!!success && mode === 'forgot')}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/30 mt-2"
              >
                {submitting
                  ? 'Please wait...'
                  : mode === 'signup'
                  ? 'Create Account'
                  : mode === 'forgot'
                  ? 'Send Reset Link'
                  : 'Sign In'}
              </button>
            </form>

            {mode !== 'forgot' && (
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <button
                  onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); reset(); }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                  <span className="text-red-400 font-semibold hover:text-red-300">
                    {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onNavigate('home')}
          className="mt-5 w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
