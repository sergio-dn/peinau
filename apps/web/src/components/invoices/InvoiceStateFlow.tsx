import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

const FLOW_STATES = [
  { key: 'recibida',      label: 'Recibida' },
  { key: 'pendiente',     label: 'Pendiente' },
  { key: 'aprobada',      label: 'Aprobada' },
  { key: 'contabilizada', label: 'Contabilizada' },
  { key: 'en_nomina',     label: 'En Nómina' },
  { key: 'pagada',        label: 'Pagada' },
];

export function InvoiceStateFlow({ currentState }: { currentState: string }) {
  if (currentState === 'rechazada') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-lg">
        <X className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="text-sm font-medium text-rose-700">Factura rechazada — fuera del flujo de aprobación</span>
      </div>
    );
  }

  const currentIndex = FLOW_STATES.findIndex((s) => s.key === currentState);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {FLOW_STATES.map((step, idx) => {
        const isPast    = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture  = idx > currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center min-w-[80px]">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                isPast    && 'bg-emerald-500 border-emerald-500 text-white',
                isCurrent && 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100',
                isFuture  && 'bg-white border-slate-200 text-slate-400',
              )}>
                {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={cn(
                'text-[10px] mt-1 text-center leading-tight',
                isCurrent && 'text-blue-700 font-semibold',
                isPast    && 'text-emerald-600',
                isFuture  && 'text-slate-400',
              )}>
                {step.label}
              </span>
            </div>
            {idx < FLOW_STATES.length - 1 && (
              <div className={cn(
                'h-0.5 w-8 flex-shrink-0 mb-4 mx-1',
                idx < currentIndex ? 'bg-emerald-400' : 'bg-slate-200'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
