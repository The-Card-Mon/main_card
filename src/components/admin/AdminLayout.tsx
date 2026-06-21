import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  ChevronRight,
  Flame,
  ExternalLink,
  Menu,
  X,
  ArrowDownToLine,
  Megaphone,
  Share2,
  Coins,
  UserCog,
  Shield,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export type AdminSection =
  | 'dashboard' | 'products' | 'orders' | 'customers'
  | 'sell-requests' | 'modal' | 'social' | 'rewards' | 'finance' | 'shipping' | 'staff' | 'settings';

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  'sell-requests': 'Sell Requests',
  modal: 'Promotions',
  social: 'Social Media',
  rewards: 'PokeBucks Rewards',
  finance: 'Finance & Tax',
  shipping: 'Shipping',
  staff: 'Staff Management',
  settings: 'Settings',
};

interface AdminLayoutProps {
  children: ReactNode;
  activeSection: AdminSection;
  onSection: (s: AdminSection) => void;
  onGoToStore: () => void;
}

// Staff-accessible sections (staff can view but not manage admin-only features)
const STAFF_SECTIONS: AdminSection[] = ['dashboard', 'orders', 'customers', 'sell-requests'];

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; dividerBefore?: boolean }[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'products',      label: 'Products',       icon: Package,        adminOnly: true },
  { id: 'orders',        label: 'Orders',         icon: ShoppingBag },
  { id: 'customers',     label: 'Customers',      icon: Users },
  { id: 'sell-requests', label: 'Sell Requests',  icon: ArrowDownToLine },
  { id: 'modal',         label: 'Promotions',     icon: Megaphone,      adminOnly: true },
  { id: 'social',        label: 'Social Media',   icon: Share2,         adminOnly: true },
  { id: 'rewards',       label: 'PokeBucks',      icon: Coins,          adminOnly: true },
  { id: 'finance',       label: 'Finance & Tax',  icon: TrendingUp,     adminOnly: true },
  { id: 'shipping',      label: 'Shipping',        icon: Truck,          adminOnly: true },
  { id: 'staff',         label: 'Staff',           icon: UserCog,        adminOnly: true, dividerBefore: true },
  { id: 'settings',      label: 'Settings',       icon: Settings,       adminOnly: true },
];

export default function AdminLayout({ children, activeSection, onSection, onGoToStore }: AdminLayoutProps) {
  const { isAdmin, isStaff, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = NAV.filter((item) => isAdmin || !item.adminOnly);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-800">
        <Flame className="w-6 h-6 text-red-500 flex-shrink-0" />
        <span className="font-bold text-white text-lg">The Card Mon</span>
        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
          isAdmin
            ? 'bg-red-600/20 text-red-400 border-red-600/30'
            : 'bg-blue-600/20 text-blue-400 border-blue-600/30'
        }`}>
          {isAdmin ? 'ADMIN' : 'STAFF'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleNav.map(({ id, label, icon: Icon, dividerBefore }) => {
          const active = activeSection === id;
          return (
            <div key={id}>
              {dividerBefore && <div className="mx-3 my-2 border-t border-gray-800" />}
              <button
                onClick={() => { onSection(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Signed in as */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/50">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            isAdmin ? 'bg-red-600/30 text-red-400' : 'bg-blue-600/30 text-blue-400'
          }`}>
            {isAdmin ? <Shield className="w-3.5 h-3.5" /> : (profile?.full_name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{profile?.full_name ?? 'Team Member'}</p>
            <p className="text-[10px] text-gray-600 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={onGoToStore}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-white hover:bg-gray-800 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          View Store
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-gray-900 flex flex-col z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{SECTION_TITLES[activeSection]}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                Store Live
              </span>
            )}
            {isStaff && !isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" />
                Staff Access
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
