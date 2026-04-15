// NOTE: AppShell is the new canonical layout component (see AppShell.tsx).
// AppLayout is kept for backwards compatibility with existing route files.
export { AppShell as AppShell } from './AppShell';

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Calculator,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Facturas', href: '/invoices', icon: FileText },
  { name: 'Aprobaciones', href: '/approvals', icon: CheckSquare, roles: ['aprobador', 'admin'] },
  { name: 'Proveedores', href: '/suppliers', icon: Users },
  { name: 'Contabilidad', href: '/accounting', icon: Calculator, roles: ['contabilidad', 'admin'] },
  { name: 'Nominas de Pago', href: '/payment-batches', icon: CreditCard, roles: ['contabilidad', 'admin'] },
  { name: 'Reportes', href: '/reports', icon: BarChart3, roles: ['admin', 'contabilidad'] },
  { name: 'Administracion', href: '/admin', icon: Settings, roles: ['admin'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const visibleNav = navigation.filter(
    (item) => !item.roles || item.roles.some((r) => user?.roles.includes(r))
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-white border-r transform transition-transform lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0 shadow-sm' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-lg font-bold tracking-tight text-primary">Wild Lama</h1>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 mb-3 bg-slate-50 rounded-lg p-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center h-16 px-6 border-b bg-white shadow-sm lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="ml-4 text-lg font-bold">Wild Lama</h1>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
