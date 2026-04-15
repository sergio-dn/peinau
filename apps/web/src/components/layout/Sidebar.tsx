import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞', exact: true },
  { to: '/invoices', label: 'Facturas', icon: '📄' },
  { to: '/approvals', label: 'Aprobaciones', icon: '✓' },
  { to: '/suppliers', label: 'Proveedores', icon: '🏢' },
  { to: '/payment-batches', label: 'Pagos', icon: '💳' },
  { to: '/accounting', label: 'Contabilidad', icon: '📊' },
  { to: '/reports', label: 'Reportes', icon: '📈' },
];

const adminItems = [
  { to: '/admin', label: 'Administración', icon: '⚙' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const isAdmin = user?.roles?.includes('admin');

  return (
    <aside
      className="flex flex-col w-[240px] min-w-[240px] bg-[#0F172A] h-full overflow-y-auto sidebar-scroll"
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm">
          P
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Peinau</div>
          <div className="text-slate-500 text-xs">CxP · Wild Lama</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Admin</span>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-sm font-medium">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 text-sm font-medium truncate">{user?.name ?? 'Usuario'}</div>
            <div className="text-slate-500 text-xs truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <span className="w-5 text-center">↩</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
