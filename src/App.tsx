import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ErrorBoundary from './components/ErrorBoundary';

// Capture hash at module load before Supabase may clear it
const _startHash = typeof window !== 'undefined' ? window.location.hash : '';

import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import SellPage from './pages/SellPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import ShippingReturnsPage from './pages/ShippingReturnsPage';
import ContactPage from './pages/ContactPage';
import MaintenancePage from './pages/MaintenancePage';
import AccountPage from './pages/AccountPage';
import MysteryBoxPage from './pages/MysteryBoxPage';
import PromoModal from './components/PromoModal';
import { supabase } from './lib/supabase';
import { AlertTriangle } from 'lucide-react';
import type { AdminSection } from './components/admin/AdminLayout';

interface MaintenanceState {
  enabled: boolean;
  title: string;
  message: string;
  bgImageUrl: string;
}

function getInitialPage(): string {
  if (_startHash.includes('type=invite') || _startHash.includes('type=recovery')) return 'auth';
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  const valid = ['home', 'catalog', 'cart', 'auth', 'orders', 'account', 'sell', 'checkout',
                 'about', 'faq', 'shipping', 'contact', 'mystery-boxes', 'admin'];
  return page && valid.includes(page) ? page : 'home';
}

function pushUrl(page: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  params.set('page', page);
  if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  const qs = page === 'home' ? '' : `?${params.toString()}`;
  window.history.pushState({}, '', qs || '/');
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [productId, setProductId] = useState<string | null>(null);
  const [catalogType, setCatalogType] = useState<string>('');

  // Admin deep-link: ?page=admin&section=orders&order=UUID
  const [initialAdminSection] = useState<AdminSection | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('section') as AdminSection) ?? undefined;
  });
  const [initialOrderId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('order');
  });
  const [initialSubmissionId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('submission');
  });

  const { isAdmin, isStaff, loading, user, needsPasswordSetup } = useAuth();

  useEffect(() => {
    if (needsPasswordSetup) setCurrentPage('auth');
  }, [needsPasswordSetup]);

  // Sync state when browser back/forward is used
  useEffect(() => {
    const onPop = () => setCurrentPage(getInitialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    enabled: false,
    title: "We'll Be Right Back",
    message: "We're performing scheduled maintenance and will be back shortly.",
    bgImageUrl: '',
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('modal_config')
      .select('maintenance_enabled, maintenance_title, maintenance_message, maintenance_bg_image_url')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMaintenance({
            enabled: data.maintenance_enabled ?? false,
            title: data.maintenance_title ?? "We'll Be Right Back",
            message: data.maintenance_message ?? '',
            bgImageUrl: data.maintenance_bg_image_url ?? '',
          });
        }
        setMaintenanceLoading(false);
      })
      .catch(() => setMaintenanceLoading(false));
  }, []);

  const navigate = (page: string) => {
    if (page.startsWith('catalog?type=')) {
      const type = page.split('=')[1];
      setCatalogType(type);
      setCurrentPage('catalog');
      pushUrl('catalog', { type });
      return;
    }
    if (page === 'admin' && !isAdmin && !isStaff) return;
    if ((page === 'orders' || page === 'account' || page === 'mystery-boxes') && !user) {
      setCurrentPage('auth');
      pushUrl('auth');
      return;
    }
    if (page === 'checkout' && !user) {
      setCurrentPage('auth');
      pushUrl('auth');
      return;
    }
    setCatalogType('');
    setCurrentPage(page);
    setProductId(null);
    pushUrl(page);
    window.scrollTo(0, 0);
  };

  const viewProduct = (id: string) => {
    setProductId(id);
    setCurrentPage('product');
    pushUrl('product', { id });
    window.scrollTo(0, 0);
  };

  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show maintenance page to non-admin visitors
  if (maintenance.enabled && !isAdmin) {
    return (
      <MaintenancePage
        config={{
          title: maintenance.title,
          message: maintenance.message,
          bgImageUrl: maintenance.bgImageUrl,
        }}
        onStaffAccess={() => {
          setMaintenance((prev) => ({ ...prev }));
        }}
      />
    );
  }

  // Admin panel gets its own full-screen layout (no main header)
  if (currentPage === 'admin' && (isAdmin || isStaff)) {
    return (
      <>
        {maintenance.enabled && (
          <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-xs font-bold py-2 px-4">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Maintenance mode is ON — the site is hidden from visitors
          </div>
        )}
        <div className={maintenance.enabled ? 'pt-8' : ''}>
          <AdminPage
            onNavigate={navigate}
            initialSection={initialAdminSection}
            initialOrderId={initialOrderId}
            initialSubmissionId={initialSubmissionId}
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {maintenance.enabled && isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-xs font-bold py-2 px-4">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Maintenance mode is ON — the site is hidden from visitors
        </div>
      )}
      <div className={maintenance.enabled && isAdmin ? 'pt-8' : ''}>
        <Header currentPage={currentPage} onNavigate={navigate} />
        <PromoModal onNavigate={navigate} />
        {currentPage === 'home' && <HomePage onNavigate={navigate} onViewProduct={viewProduct} />}
        {currentPage === 'catalog' && (
          <CatalogPage onViewProduct={viewProduct} initialType={catalogType} />
        )}
        {currentPage === 'product' && productId && (
          <ProductDetailPage productId={productId} onBack={() => navigate('catalog')} />
        )}
        {currentPage === 'cart' && <CartPage onNavigate={navigate} />}
        {currentPage === 'auth' && <AuthPage onNavigate={navigate} />}
        {currentPage === 'orders' && user && <AccountPage onNavigate={navigate} initialTab="orders" />}
        {currentPage === 'account' && user && <AccountPage onNavigate={navigate} />}
        {currentPage === 'sell' && <SellPage onNavigate={navigate} />}
        {currentPage === 'checkout' && <CheckoutPage onNavigate={navigate} />}
        {currentPage === 'about' && <AboutPage onNavigate={navigate} />}
        {currentPage === 'faq' && <FAQPage onNavigate={navigate} />}
        {currentPage === 'shipping' && <ShippingReturnsPage onNavigate={navigate} />}
        {currentPage === 'contact' && <ContactPage onNavigate={navigate} />}
        {currentPage === 'mystery-boxes' && <MysteryBoxPage onNavigate={navigate} />}
        <Footer onNavigate={navigate} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
