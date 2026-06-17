import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import OrdersPage from './pages/OrdersPage';
import SellPage from './pages/SellPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import ShippingReturnsPage from './pages/ShippingReturnsPage';
import ContactPage from './pages/ContactPage';
import PromoModal from './components/PromoModal';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [productId, setProductId] = useState<string | null>(null);
  const [catalogType, setCatalogType] = useState<string>('');
  const { isAdmin, loading, user } = useAuth();

  const navigate = (page: string) => {
    if (page.startsWith('catalog?type=')) {
      const type = page.split('=')[1];
      setCatalogType(type);
      setCurrentPage('catalog');
      return;
    }
    if (page === 'admin' && !isAdmin) return;
    if (page === 'orders' && !user) {
      setCurrentPage('auth');
      return;
    }
    if (page === 'checkout' && !user) {
      setCurrentPage('auth');
      return;
    }
    setCatalogType('');
    setCurrentPage(page);
    setProductId(null);
    window.scrollTo(0, 0);
  };

  const viewProduct = (id: string) => {
    setProductId(id);
    setCurrentPage('product');
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Admin panel gets its own full-screen layout (no main header)
  if (currentPage === 'admin' && isAdmin) {
    return <AdminPage onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
      {currentPage === 'orders' && user && <OrdersPage />}
      {currentPage === 'sell' && <SellPage onNavigate={navigate} />}
      {currentPage === 'checkout' && <CheckoutPage onNavigate={navigate} />}
      {currentPage === 'about' && <AboutPage onNavigate={navigate} />}
      {currentPage === 'faq' && <FAQPage onNavigate={navigate} />}
      {currentPage === 'shipping' && <ShippingReturnsPage onNavigate={navigate} />}
      {currentPage === 'contact' && <ContactPage onNavigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
