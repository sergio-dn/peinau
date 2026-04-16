import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import InvoiceListPage from '@/pages/InvoiceListPage';
import InvoiceDetailPage from '@/pages/InvoiceDetailPage';
import ApprovalQueuePage from '@/pages/ApprovalQueuePage';
import SupplierListPage from '@/pages/SupplierListPage';
import AccountingPage from '@/pages/AccountingPage';
import PaymentBatchListPage from '@/pages/PaymentBatchListPage';
import ReportsPage from '@/pages/ReportsPage';
import AdminPage from '@/pages/AdminPage';

const PaymentPriorityPage = lazy(() => import('@/pages/PaymentPriorityPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore((s) => ({ isAuthenticated: s.isAuthenticated, isLoading: s.isLoading }));
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        try {
          const { data } = await api.get('/api/auth/me');
          setUser(data.user ?? data);
        } catch (e) {
          console.warn('[App] Profile sync failed:', e);
        }
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
        api.get('/api/auth/me').then(({ data }) => {
          setUser(data.user ?? data);
        }).catch(() => {});
      } else if (!session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setLoading]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
                <Route path="/payment-priority" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>}><PaymentPriorityPage /></Suspense>} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
