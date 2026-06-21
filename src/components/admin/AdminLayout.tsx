import type { ReactNode } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings, ChevronRight,
  Flame, ExternalLink, Menu, X, ArrowDownToLine, Megaphone, Share2,
  Coins, UserCog, Shield, TrendingUp, Truck, Tag,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export type AdminSection =
  | 'dashboard' | 'orders' | 'customers' | 'sell-requests'
  | 'products' | 'modal' | 'social' | 'rewards' | 'shipping' | 'discounts'
  | 'finance' | 'staff' | 'settings';

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard:      'Dashboard',
  orders:         'Orders',
  customers:      'Customers',
  'sell-requests':'Sell Requests',
  products:       'Products',
  modal:          'Promotions',
  social:         'Social Media',
  rewards:        'PokeBucks Rewards',
  shipping:       'Shipping',
  discounts:      'Discount Codes',
  finance:        'Finance & Tax',
  staff:          'Staff Management',
  settings:       'Settings',
};

interface NavItem {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  staffVisible: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    staffVisible: true,
    items: [
      { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
      { id: 'orders',        label: 'Orders',         icon: ShoppingBag },
      { id: 'customers',     label: 'Customers',      icon: Users },
      { id: 'sell-requests', label: 'Sell Requests',  icon: ArrowDownToLine },
    ],
  },
  {
    label: 'Store',
    staffVisible: false,
    items: [
      { id: 'products',  label: 'Products',      icon: Package },
      { id: 'modal',     label: 'Promotions',    icon: Megaphone },
      { id: 'discounts', label: 'Discounts',     icon: Tag },
      { id: 'social',    label: 'Social Media',  icon: Share2 },
      { id: 'rewards',   label: 'PokeBucks',     icon: Coins },
      { id: 'shipping',  label: 'Shipping',      icon: Truck },
    ],
  },
  {
    label: 'Business',
    staffVisible: false,
    items: [
      { id: 'finance', label: 'Finance & Tax', icon: TrendingUp },
    ],
  },
  {
    label: 'Admin',
    staffVisible: false,
    items: [
      { id: 'staff',    label: 'Staff',    icon: UserCog },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface AdminLayoutProps {
  children: ReactNode;
  activeSection: AdminSection;
  onSection: (s: AdminSection) => void;
  onGoToStore: () => void;
}

export default function AdminLayout({ children, activeSection, onSection, onGoToStore }: AdminLayoutProps) {
  const { isAdmin, isStaff, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleGroups = NAV_GROUPS
    .filter((g) => isAdmin || g.staffVisible)
    .map((g) => g);

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-800">
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

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
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
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/50">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
            isAdmin ? 'bg-red-600/30 text-red-400' : 'bg-blue-600/30 text-blue-400'
          }`}>
            {isAdmin ? <Shield className="w-3.5 h-3.5" /> : (profile?.full_name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-300 truncate">{profile?.full_name ?? 'Team Member'}</p>
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
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-gray-900 flex flex-col z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{SECTION_TITLES[activeSection]}</h1>
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
