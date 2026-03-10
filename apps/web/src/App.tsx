import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InvoiceListPage from '@/pages/InvoiceListPage';
import InvoiceDetailPage from '@/pages/InvoiceDetailPage';
import ApprovalQueuePage from '@/pages/ApprovalQueuePage';
import SupplierListPage from '@/pages/SupplierListPage';
import AccountingPage from '@/pages/AccountingPage';
import PaymentBatchListPage from '@/pages/PaymentBatchListPage';
import ReportsPage from '@/pages/ReportsPage';
import AdminPage from '@/pages/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/invoices" element={<InvoiceListPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/approvals" element={<ApprovalQueuePage />} />
                <Route path="/suppliers" element={<SupplierListPage />} />
                <Route path="/accounting" element={<AccountingPage />} />
                <Route path="/payment-batches" element={<PaymentBatchListPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
