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

interface AdminPageProps {
  onNavigate: (page: string) => void;
}

export default function AdminPage({ onNavigate }: AdminPageProps) {
  const [section, setSection] = useState<AdminSection>('dashboard');

  return (
    <AdminLayout
      activeSection={section}
      onSection={setSection}
      onGoToStore={() => onNavigate('home')}
    >
      {section === 'dashboard' && <AdminDashboard />}
      {section === 'products' && <AdminProducts />}
      {section === 'orders' && <AdminOrders />}
      {section === 'customers' && <AdminCustomers />}
      {section === 'sell-requests' && <AdminSellRequests />}
      {section === 'modal' && <AdminModal />}
      {section === 'social' && <AdminSocial />}
      {section === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
}
