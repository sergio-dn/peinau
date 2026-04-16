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
  CheckCircle2,
  CalendarClock,
  CreditCard,
  Calculator,
  Building2,
  BarChart3,
  Settings2,
  LogOut,
  Menu,
  Bell,
} from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Facturas', href: '/invoices', icon: FileText },
      {
        name: 'Aprobaciones',
        href: '/approvals',
        icon: CheckCircle2,
        roles: ['aprobador', 'admin', 'cfo'],
      },
      {
        name: 'Priorización Pagos',
        href: '/payment-priority',
        icon: CalendarClock,
        roles: ['jefatura', 'tesoreria', 'admin', 'cfo'],
      },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      {
        name: 'Nóminas de Pago',
        href: '/payment-batches',
        icon: CreditCard,
        roles: ['tesoreria', 'admin', 'cfo'],
      },
      {
        name: 'Contabilidad',
        href: '/accounting',
        icon: Calculator,
        roles: ['contabilidad', 'admin'],
      },
      {
        name: 'Proveedores',
        href: '/suppliers',
        icon: Building2,
        roles: ['contabilidad', 'admin'],
      },
    ],
  },
  {
    label: 'HERRAMIENTAS',
    items: [
      {
        name: 'Reportes',
        href: '/reports',
        icon: BarChart3,
        roles: ['admin', 'contabilidad', 'cfo', 'tesoreria'],
      },
      {
        name: 'Administración',
        href: '/admin',
        icon: Settings2,
        roles: ['admin'],
      },
    ],
  },
];

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || !user || item.roles.some((r) => user.roles?.includes(r))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-white font-bold text-lg leading-tight">Peinau</p>
        <p className="text-slate-400 text-xs mt-0.5">Wild Lama</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((group, groupIdx) => (
          <div key={groupIdx} className={groupIdx > 0 ? 'mt-2' : ''}>
            {group.label && (
              <p className="text-slate-500 text-xs uppercase tracking-wider mt-4 mb-1 px-3">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors my-0.5',
                    isActive
                      ? 'bg-blue-600/20 text-white font-medium before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:bg-blue-500 before:rounded-full'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.name ?? '—'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop static, mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-4 sticky top-0 z-30">
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search */}
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Bell / Notifications */}
            <button
              className="relative p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {/* Badge placeholder — show only when there are notifications */}
              {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
            </button>

            {/* Company name */}
            <span className="text-sm text-slate-600 hidden sm:block">Wild Lama</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-6 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
