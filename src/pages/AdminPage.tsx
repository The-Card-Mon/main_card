import { useState } from 'react';
import AdminLayout, { type AdminSection } from '../components/admin/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminProducts from '../components/admin/AdminProducts';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminSettings from '../components/admin/AdminSettings';
import AdminSellRequests from '../components/admin/AdminSellRequests';
import AdminModal from '../components/admin/AdminModal';
import AdminSocial from '../components/admin/AdminSocial';
import AdminRewards from '../components/admin/AdminRewards';
import AdminStaff from '../components/admin/AdminStaff';
import AdminFinance from '../components/admin/AdminFinance';
import AdminShipping from '../components/admin/AdminShipping';
import AdminDiscounts from '../components/admin/AdminDiscounts';
import AdminSupport from '../components/admin/AdminSupport';

interface AdminPageProps {
  onNavigate: (page: string) => void;
  initialSection?: AdminSection;
  initialOrderId?: string | null;
}

export default function AdminPage({ onNavigate, initialSection, initialOrderId }: AdminPageProps) {
  const [section, setSection] = useState<AdminSection>(initialSection ?? 'dashboard');

  return (
    <AdminLayout
      activeSection={section}
      onSection={setSection}
      onGoToStore={() => onNavigate('home')}
    >
      {section === 'dashboard' && <AdminDashboard />}
      {section === 'products' && <AdminProducts />}
      {section === 'orders' && <AdminOrders highlightOrderId={initialOrderId ?? undefined} />}
      {section === 'customers' && <AdminCustomers />}
      {section === 'sell-requests' && <AdminSellRequests />}
      {section === 'modal' && <AdminModal />}
      {section === 'discounts' && <AdminDiscounts />}
      {section === 'social' && <AdminSocial />}
      {section === 'rewards' && <AdminRewards />}
      {section === 'finance' && <AdminFinance />}
      {section === 'shipping' && <AdminShipping />}
      {section === 'staff' && <AdminStaff />}
      {section === 'support' && <AdminSupport />}
      {section === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
}
