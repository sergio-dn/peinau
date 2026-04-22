import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  ListOrdered,
  Banknote,
  BookOpen,
  Building2,
  BarChart2,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { to: string; label: string; Icon: LucideIcon; exact?: boolean };
type NavSection = { label?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { to: '/',            label: 'Dashboard',           Icon: LayoutDashboard, exact: true },
      { to: '/invoices',    label: 'Facturas',             Icon: FileText },
      { to: '/approvals',   label: 'Aprobaciones',         Icon: CheckSquare },
      { to: '/payment-batches', label: 'Priorización Pagos', Icon: ListOrdered },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/payroll',     label: 'Nóminas de Pago',     Icon: Banknote },
      { to: '/accounting',  label: 'Contabilidad',         Icon: BookOpen },
      { to: '/suppliers',   label: 'Proveedores',          Icon: Building2 },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/reports',     label: 'Reportes',             Icon: BarChart2 },
      { to: '/admin',       label: 'Administración',       Icon: Settings },
    ],
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-700/80 text-white'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
  }`;

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <aside
      className="flex flex-col w-[240px] min-w-[240px] bg-[#0F172A] h-full overflow-y-auto sidebar-scroll"
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm select-none">
          P
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">Peinau</div>
          <div className="text-slate-500 text-xs">Wild Lama</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((section, si) => {
          const visibleItems = section.label === 'Herramientas' && !isAdmin
            ? section.items.filter((i) => i.to !== '/admin')
            : section.items;
          if (visibleItems.length === 0) return null;
          return (
            <div key={si}>
              {section.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={linkClass}
                  >
                    <item.Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 text-sm font-medium truncate">{user?.name ?? 'Usuario'}</div>
            <div className="text-slate-500 text-xs truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
