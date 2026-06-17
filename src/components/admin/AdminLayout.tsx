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
} from 'lucide-react';
import { useState } from 'react';

export type AdminSection = 'dashboard' | 'products' | 'orders' | 'customers' | 'sell-requests' | 'modal' | 'social' | 'settings';

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  'sell-requests': 'Sell Requests',
  modal: 'Promotions',
  social: 'Social Media',
  settings: 'Settings',
};

interface AdminLayoutProps {
  children: ReactNode;
  activeSection: AdminSection;
  onSection: (s: AdminSection) => void;
  onGoToStore: () => void;
}

const NAV = [
  { id: 'dashboard' as AdminSection,     label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'products' as AdminSection,      label: 'Products',     icon: Package },
  { id: 'orders' as AdminSection,        label: 'Orders',       icon: ShoppingBag },
  { id: 'customers' as AdminSection,     label: 'Customers',    icon: Users },
  { id: 'sell-requests' as AdminSection, label: 'Sell Requests',icon: ArrowDownToLine },
  { id: 'modal' as AdminSection,         label: 'Promotions',   icon: Megaphone },
  { id: 'social' as AdminSection,        label: 'Social Media', icon: Share2 },
  { id: 'settings' as AdminSection,      label: 'Settings',     icon: Settings },
];

export default function AdminLayout({ children, activeSection, onSection, onGoToStore }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-800">
        <Flame className="w-6 h-6 text-red-500 flex-shrink-0" />
        <span className="font-bold text-white text-lg">The Card Mon</span>
        <span className="ml-auto text-[10px] font-semibold bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
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
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={onGoToStore}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
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
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-60 bg-gray-900 flex flex-col z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{SECTION_TITLES[activeSection]}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              Store Live
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
