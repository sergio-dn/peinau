import { cn } from '@/lib/utils';
import {
  Inbox,
  Clock,
  CheckCircle2,
  BookOpen,
  ListChecks,
  BadgeCheck,
  XCircle,
} from 'lucide-react';

const STATE_CONFIG: Record<string, {
  label: string;
  className: string;
  Icon: React.ElementType;
}> = {
  recibida:      { label: 'Recibida',      className: 'bg-blue-500/10 text-blue-700 border-blue-500/20',       Icon: Inbox },
  pendiente:     { label: 'Pendiente',     className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',    Icon: Clock },
  aprobada:      { label: 'Aprobada',      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', Icon: CheckCircle2 },
  contabilizada: { label: 'Contabilizada', className: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20', Icon: BookOpen },
  en_nomina:     { label: 'En Nómina',     className: 'bg-violet-500/10 text-violet-700 border-violet-500/20', Icon: ListChecks },
  pagada:        { label: 'Pagada',        className: 'bg-teal-500/10 text-teal-700 border-teal-500/20',       Icon: BadgeCheck },
  rechazada:     { label: 'Rechazada',     className: 'bg-rose-500/10 text-rose-700 border-rose-500/20',       Icon: XCircle },
};

export function InvoiceStateBadge({ state }: { state: string }) {
  const config = STATE_CONFIG[state] ?? {
    label: state,
    className: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    Icon: Clock,
  };
  const { Icon } = config;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
      config.className
    )}>
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}
