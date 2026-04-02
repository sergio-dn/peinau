import { cn } from '@/lib/utils';

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  recibida: { label: 'Recibida', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  pendiente: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  aprobada: { label: 'Aprobada', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  contabilizada: { label: 'Contabilizada', className: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' },
  en_nomina: { label: 'En Nomina', className: 'bg-violet-500/10 text-violet-700 border-violet-500/20' },
  pagada: { label: 'Pagada', className: 'bg-teal-500/10 text-teal-700 border-teal-500/20' },
  rechazada: { label: 'Rechazada', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
};

export function InvoiceStateBadge({ state }: { state: string }) {
  const config = STATE_CONFIG[state] || { label: state, className: 'bg-slate-500/10 text-slate-700 border-slate-500/20' };
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
      config.className
    )}>
      {config.label}
    </span>
  );
}
