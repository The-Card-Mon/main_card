import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, User, LogOut, Shield, Menu, X, Layers, DollarSign, ChevronDown, HelpCircle, Truck, Info, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const nav = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
    setUserMenuOpen(false);
    setHelpOpen(false);
  };

  const helpPages = [
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'shipping', label: 'Shipping & Returns', icon: Truck },
    { id: 'contact', label: 'Contact Us', icon: MessageSquare },
  ];

  const helpActive = ['about', 'faq', 'shipping', 'contact'].includes(currentPage);

  return (
    <header className="bg-gray-950 sticky top-0 z-50 shadow-xl shadow-black/30">
      {/* Rainbow accent line */}
      <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <button onClick={() => nav('home')} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:shadow-red-700/60 transition-shadow">
              <Layers className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="text-xl font-bold tracking-wide text-white" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                The Card Mon
              </div>
              <div className="text-[9px] text-amber-400/80 tracking-[0.2em] uppercase font-semibold">
                Premium TCG
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {[
              { id: 'home', label: 'Home' },
              { id: 'catalog', label: 'Catalog' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => nav(id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  currentPage === id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
                {currentPage === id && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
            <button
              onClick={() => nav('sell')}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                currentPage === 'sell'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Sell Cards
              {currentPage === 'sell' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Help dropdown */}
            <div className="relative" ref={helpRef}>
              <button
                onClick={() => setHelpOpen(!helpOpen)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  helpActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Help
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${helpOpen ? 'rotate-180' : ''}`} />
                {helpActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full" />
                )}
              </button>
              {helpOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-1.5 z-50">
                  {helpPages.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => nav(id)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                        currentPage === id
                          ? 'text-white bg-white/5'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => nav('admin')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => nav('cart')}
              className="relative p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center shadow border border-gray-950">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {isAdmin ? 'Admin' : 'Account'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm text-gray-200 font-medium truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={() => nav('orders')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      My Orders
                    </button>
                    <button
                      onClick={() => nav('sell')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Sell Cards
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => nav('admin')}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Admin Dashboard
                      </button>
                    )}
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => nav('auth')}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-red-900/40"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-gray-950/95 backdrop-blur-sm py-2">
          {[
            { id: 'home', label: 'Home' },
            { id: 'catalog', label: 'Catalog' },
            { id: 'sell', label: 'Sell Cards' },
            ...(isAdmin ? [{ id: 'admin', label: 'Admin Dashboard' }] : []),
            ...(user ? [{ id: 'orders', label: 'My Orders' }] : []),
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => nav(id)}
              className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                currentPage === id
                  ? 'text-white bg-white/5 border-l-2 border-red-500 pl-[22px]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="border-t border-white/5 mt-1 pt-1">
            <p className="px-6 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Help</p>
            {helpPages.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => nav(id)}
                className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                  currentPage === id
                    ? 'text-white bg-white/5 border-l-2 border-red-500 pl-[22px]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
