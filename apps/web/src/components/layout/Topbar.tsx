import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/invoices': 'Facturas',
  '/approvals': 'Cola de Aprobación',
  '/suppliers': 'Proveedores',
  '/payment-batches': 'Lotes de Pago',
  '/accounting': 'Contabilidad',
  '/reports': 'Reportes',
  '/admin': 'Administración',
};

export function Topbar() {
  const { pathname } = useLocation();
  // Match longest prefix
  const title = Object.entries(titles)
    .filter(([path]) => pathname === path || (path !== '/' && pathname.startsWith(path)))
    .sort(([a], [b]) => b.length - a.length)[0]?.[1] ?? 'Peinau';

  return (
    <header className="flex items-center h-14 px-6 bg-white border-b border-slate-200 flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
    </header>
  );
}
