import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCLP } from '@wildlama/shared';
import { FileText, CheckSquare, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATE_COLORS: Record<string, string> = {
  recibida: '#3b82f6',
  pendiente: '#f59e0b',
  aprobada: '#10b981',
  contabilizada: '#6366f1',
  en_nomina: '#8b5cf6',
  pagada: '#14b8a6',
  rechazada: '#f43f5e',
};

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
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: () => {
      toast.error('Error al sincronizar con SII');
    },
  });
  const { data: stateData } = useQuery({
    queryKey: ['reports', 'invoices-by-state'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/invoices-by-state');
      return data;
    },
  });

  const { data: agingData } = useQuery({
    queryKey: ['reports', 'aging'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/aging');
      return data;
    },
  });

  const totalInvoices = stateData?.reduce((sum: number, s: any) => sum + s.count, 0) || 0;
  const pendingCount = stateData?.find((s: any) => s.state === 'pendiente')?.count || 0;
  const approvedCount = stateData?.find((s: any) => s.state === 'aprobada')?.count || 0;
  const rejectedCount = stateData?.find((s: any) => s.state === 'rechazada')?.count || 0;

  return (
    <div className="space-y-6">
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Facturas</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{totalInvoices}</p>
              </div>
              <div className="rounded-xl p-3 bg-blue-500/10">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pendientes</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{pendingCount}</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aprobadas</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{approvedCount}</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10">
                <CheckSquare className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rechazadas</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{rejectedCount}</p>
              </div>
              <div className="rounded-xl p-3 bg-rose-500/10">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Facturas por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {stateData && stateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ state, count }: any) => `${state} (${count})`}
                    outerRadius={100}
                    dataKey="count"
                  >
                    {stateData.map((entry: any) => (
                      <Cell key={entry.state} fill={STATE_COLORS[entry.state] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Facturas']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aging de Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {agingData && agingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCLP(value), 'Monto']} />
                  <Bar dataKey="total" fill="#3b62d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
