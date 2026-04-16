import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { formatCLP } from '@wildlama/shared';
import { startOfWeek, addWeeks, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PriorityInvoice {
  id: string;
  tipoDte: number;
  folio: number;
  razonSocialEmisor: string;
  montoTotal: number;
  fechaEmision: string;
  paymentWeek: string | null;
}

const DTE_NAMES: Record<number, string> = {
  33: 'F.33', 34: 'F.34', 46: 'F.46', 56: 'ND', 61: 'NC',
};

function getWeekOptions() {
  const now = new Date();
  return [0, 1, 2, 3].map((offset) => {
    const weekStart = startOfWeek(addWeeks(now, offset), { weekStartsOn: 1 });
    return {
      value: format(weekStart, 'yyyy-MM-dd'),
      label:
        offset === 0
          ? 'Esta semana'
          : offset === 1
          ? 'Próxima semana'
          : `Semana del ${format(weekStart, "d 'de' MMMM", { locale: es })}`,
    };
  });
}

function groupByWeek(invoices: PriorityInvoice[]) {
  const weekOptions = getWeekOptions();
  const groups: Record<string, { label: string; invoices: PriorityInvoice[] }> = {
    null: { label: 'Sin asignar', invoices: [] },
  };
  weekOptions.forEach((w) => {
    groups[w.value] = { label: w.label, invoices: [] };
  });

  invoices.forEach((inv) => {
    const key = inv.paymentWeek ?? 'null';
    if (groups[key]) {
      groups[key].invoices.push(inv);
    } else {
      groups['null'].invoices.push(inv);
    }
  });

  return Object.entries(groups).map(([key, val]) => ({ key, ...val }));
}

export default function PaymentPriorityPage() {
  const queryClient = useQueryClient();
  const weekOptions = getWeekOptions();

  const { data: invoices = [], isLoading } = useQuery<PriorityInvoice[]>({
    queryKey: ['payment-priority'],
    queryFn: async () => {
      const { data } = await apiClient.get('/payment-priority/invoices');
      return data;
    },
  });

  const assignWeek = useMutation({
    mutationFn: async ({ id, weekDate }: { id: string; weekDate: string }) => {
      await apiClient.put(`/payment-priority/${id}/week`, { weekDate });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-priority'] }),
  });

  const groups = groupByWeek(invoices);

  const totalPorSemana = groups.map((g) => ({
    label: g.label,
    count: g.invoices.length,
    monto: g.invoices.reduce((s, i) => s + Number(i.montoTotal), 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Priorización de Pagos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Asigna la semana de pago a las facturas aprobadas
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {invoices.length} facturas pendientes
        </Badge>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
              <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {groups.map((group) => (
            <div key={group.key} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Column header */}
              <div className="px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">
                      {group.label}
                    </span>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {group.invoices.length}
                  </span>
                </div>
                {group.invoices.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {formatCLP(group.invoices.reduce((s, i) => s + Number(i.montoTotal), 0))}
                  </p>
                )}
              </div>

              {/* Invoice cards */}
              <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                {group.invoices.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin facturas</p>
                )}
                {group.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-blue-200 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {inv.razonSocialEmisor}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DTE_NAMES[inv.tipoDte] ?? `DTE ${inv.tipoDte}`} #{inv.folio}
                    </p>
                    <p className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                      {formatCLP(Number(inv.montoTotal))}
                    </p>

                    {/* Week selector */}
                    <div className="mt-2">
                      <select
                        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={inv.paymentWeek ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            assignWeek.mutate({ id: inv.id, weekDate: e.target.value });
                          }
                        }}
                      >
                        <option value="">Asignar semana…</option>
                        {weekOptions.map((w) => (
                          <option key={w.value} value={w.value}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-semibold text-slate-700">Resumen por semana</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-2 px-5 font-medium text-slate-600">Semana</th>
              <th className="text-right py-2 px-5 font-medium text-slate-600">Facturas</th>
              <th className="text-right py-2 px-5 font-medium text-slate-600">Monto Total</th>
            </tr>
          </thead>
          <tbody>
            {totalPorSemana.map((row) => (
              <tr key={row.label} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2.5 px-5 text-slate-700">{row.label}</td>
                <td className="py-2.5 px-5 text-right tabular-nums">{row.count}</td>
                <td className="py-2.5 px-5 text-right font-medium tabular-nums">
                  {formatCLP(row.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
