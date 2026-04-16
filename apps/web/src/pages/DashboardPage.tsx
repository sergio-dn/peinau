import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { formatCLP } from '@wildlama/shared';
import { AlertTriangle, RefreshCw, FileText, Clock, TrendingUp, Inbox } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const STATE_COLORS: Record<string, string> = {
  recibida: '#3b82f6',
  pendiente: '#f59e0b',
  aprobada: '#10b981',
  contabilizada: '#6366f1',
  en_nomina: '#8b5cf6',
  pagada: '#14b8a6',
  rechazada: '#f43f5e',
};

const STATE_LABELS: Record<string, string> = {
  recibida: 'Recibida',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  contabilizada: 'Contabilizada',
  en_nomina: 'En Nómina',
  pagada: 'Pagada',
  rechazada: 'Rechazada',
};

function SkeletonCard() {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm animate-pulse">
      <div className="bg-slate-100 rounded h-4 w-24 mb-3" />
      <div className="bg-slate-100 rounded h-8 w-16" />
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin');

  const { data: syncStatus } = useQuery({
    queryKey: ['sii', 'sync-status'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sii/sync/status');
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/sii/sync');
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronización completada: ${data.invoicesNew || 0} nuevas facturas`);
      queryClient.invalidateQueries({ queryKey: ['sii', 'sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Error al sincronizar con SII');
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/dashboard');
      return data;
    },
    staleTime: 60_000,
  });

  const totalEstado = stats?.porEstado?.reduce((sum: number, s: any) => sum + s.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {syncStatus?.lastSync && (
              <span className="text-sm text-muted-foreground">
                Último sync: {format(new Date(syncStatus.lastSync), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            )}
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Sincronizando...' : 'Sync SII'}
            </Button>
          </div>
        )}
      </div>

      {/* Alerta facturas sin procesar */}
      {stats?.facturasRecibidas > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            <strong>{stats.facturasRecibidas}</strong> facturas recibidas sin procesar
          </span>
          <Link to="/invoices" className="ml-auto text-sm text-amber-700 underline">
            Ver facturas →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Facturas del mes</p>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {stats?.totalFacturasMes ?? 0}
            </p>
          </div>

          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Monto del mes</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {formatCLP(stats?.montoTotalMes ?? 0)}
            </p>
          </div>

          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Sin procesar</p>
              <Inbox className={`w-4 h-4 ${stats?.facturasRecibidas > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums ${stats?.facturasRecibidas > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats?.facturasRecibidas ?? 0}
            </p>
          </div>

          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Pend. aprobación</p>
              <Clock className={`w-4 h-4 ${stats?.facturasPendientesAprobacion > 0 ? 'text-blue-400' : 'text-slate-300'}`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums ${stats?.facturasPendientesAprobacion > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
              {stats?.facturasPendientesAprobacion ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Dos columnas: recientes + top proveedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facturas recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Facturas recientes</CardTitle>
            <Link to="/invoices" className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-8" />
                ))}
              </div>
            ) : stats?.recientes?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 font-medium pr-3">Tipo</th>
                      <th className="pb-2 font-medium pr-3">Folio</th>
                      <th className="pb-2 font-medium pr-3">Proveedor</th>
                      <th className="pb-2 font-medium text-right pr-3">Monto</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recientes.map((inv: any) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-3 text-slate-600">{inv.tipoDte ?? '-'}</td>
                        <td className="py-2 pr-3 font-mono text-slate-700">{inv.folio}</td>
                        <td className="py-2 pr-3 text-slate-700 max-w-[140px] truncate" title={inv.razonSocialEmisor}>
                          {inv.razonSocialEmisor}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-800">
                          {formatCLP(inv.montoTotal)}
                        </td>
                        <td className="py-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATE_COLORS[inv.state] ?? '#94a3b8'}22`,
                              color: STATE_COLORS[inv.state] ?? '#64748b',
                            }}
                          >
                            {STATE_LABELS[inv.state] ?? inv.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-4 text-center">Sin facturas recientes</p>
            )}
          </CardContent>
        </Card>

        {/* Top proveedores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top proveedores del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-10" />
                ))}
              </div>
            ) : stats?.topProveedores?.length > 0 ? (
              <ol className="space-y-3">
                {stats.topProveedores.map((p: any, i: number) => (
                  <li key={p.rut ?? i} className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold w-5 text-right flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate text-sm" title={p.razonSocial}>
                        {p.razonSocial}
                      </p>
                      <p className="text-xs text-slate-400">{p.count} {p.count === 1 ? 'factura' : 'facturas'}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 tabular-nums flex-shrink-0">
                      {formatCLP(p.monto)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-slate-400 text-sm py-4 text-center">Sin datos para este mes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribución por estado */}
      {!isLoading && stats?.porEstado?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Distribución por estado — mes actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.porEstado
                .slice()
                .sort((a: any, b: any) => b.count - a.count)
                .map((s: any) => {
                  const pct = Math.round((s.count / totalEstado) * 100);
                  return (
                    <div key={s.state}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 font-medium">{STATE_LABELS[s.state] ?? s.state}</span>
                        <span className="text-slate-500 tabular-nums">
                          {s.count} — {formatCLP(s.monto)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: STATE_COLORS[s.state] ?? '#94a3b8',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
