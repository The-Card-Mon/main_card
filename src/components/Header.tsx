import { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart, User, LogOut, Shield, Menu, X, Layers, DollarSign,
  ChevronDown, HelpCircle, Truck, Info, MessageSquare, Settings,
  Package, Sparkles, Tag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, isAdmin, isStaff, signOut } = useAuth();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) setShopOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const nav = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
    setUserMenuOpen(false);
    setShopOpen(false);
    setHelpOpen(false);
  };

  const shopPages = [
    { id: 'catalog',       label: 'All Cards',      icon: Tag,      desc: 'Browse our full collection' },
    { id: 'mystery-boxes', label: 'Mystery Boxes',  icon: Sparkles, desc: 'Surprise packs & bundles' },
  ];

  const helpPages = [
    { id: 'about',    label: 'About Us',          icon: Info },
    { id: 'faq',      label: 'FAQ',               icon: HelpCircle },
    { id: 'shipping', label: 'Shipping & Returns', icon: Truck },
    { id: 'contact',  label: 'Contact Us',         icon: MessageSquare },
  ];

  const shopActive = ['catalog', 'mystery-boxes'].includes(currentPage);
  const helpActive = ['about', 'faq', 'shipping', 'contact'].includes(currentPage);

  const DropdownBtn = ({
    label, active, open, onClick, children,
  }: {
    label: string; active: boolean; open: boolean; onClick: () => void; children?: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        active ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
      {label}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      {active && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full" />}
    </button>
  );

  return (
    <header className="bg-gray-950 sticky top-0 z-50 shadow-xl shadow-black/30">
      <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">

          {/* Logo */}
          <button onClick={() => nav('home')} className="flex items-center gap-3 group flex-shrink-0">
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
            {/* Home */}
            <button
              onClick={() => nav('home')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                currentPage === 'home' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
              {currentPage === 'home' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Shop dropdown */}
            <div className="relative" ref={shopRef}>
              <DropdownBtn label="Shop" active={shopActive} open={shopOpen} onClick={() => setShopOpen(!shopOpen)} />
              {shopOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-2 z-50">
                  {shopPages.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      key={id}
                      onClick={() => nav(id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        currentPage === id ? 'bg-white/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${id === 'mystery-boxes' ? 'text-yellow-400' : 'text-red-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold leading-none mb-1 ${currentPage === id ? 'text-white' : 'text-gray-200'}`}>{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sell Cards */}
            <button
              onClick={() => nav('sell')}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                currentPage === 'sell' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              <DropdownBtn label="Help" active={helpActive} open={helpOpen} onClick={() => setHelpOpen(!helpOpen)} />
              {helpOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-1.5 z-50">
                  {helpPages.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => nav(id)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                        currentPage === id ? 'text-white bg-white/5' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => nav('cart')}
              className="relative p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center shadow border border-gray-950">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {isAdmin ? 'Admin' : isStaff ? 'Staff' : 'Account'}
                  </span>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm text-gray-200 font-medium truncate mt-0.5">{user.email}</p>
                    </div>

                    {/* Account links */}
                    <div className="py-1">
                      <button onClick={() => nav('account')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5">
                        <Settings className="w-3.5 h-3.5 text-gray-500" />
                        Account Settings
                      </button>
                      <button onClick={() => nav('orders')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5">
                        <Package className="w-3.5 h-3.5 text-gray-500" />
                        My Orders
                      </button>
                    </div>

                    {(isAdmin || isStaff) && (
                      <>
                        <div className="border-t border-white/10 py-1">
                          <p className="px-4 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            {isAdmin ? 'Administration' : 'Staff'}
                          </p>
                          <button onClick={() => nav('admin')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5">
                            <Shield className="w-3.5 h-3.5 text-gray-500" />
                            {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
                          </button>
                        </div>
                      </>
                    )}

                    <div className="border-t border-white/10 pt-1">
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2.5"
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

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-gray-950/98 backdrop-blur-sm">
          <div className="py-2">
            {[
              { id: 'home',          label: 'Home' },
              { id: 'catalog',       label: 'All Cards' },
              { id: 'mystery-boxes', label: 'Mystery Boxes' },
              { id: 'sell',          label: 'Sell Cards' },
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
          </div>

          <div className="border-t border-white/5 py-2">
            <p className="px-6 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Help</p>
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

          {user && (
            <div className="border-t border-white/5 py-2">
              <p className="px-6 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Account</p>
              <button onClick={() => nav('account')} className="w-full text-left px-6 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                Account Settings
              </button>
              <button onClick={() => nav('orders')} className="w-full text-left px-6 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                My Orders
              </button>
              {(isAdmin || isStaff) && (
                <button onClick={() => nav('admin')} className="w-full text-left px-6 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
                </button>
              )}
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="w-full text-left px-6 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
