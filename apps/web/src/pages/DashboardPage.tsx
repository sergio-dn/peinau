import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCLP } from '@wildlama/shared';
import { FileText, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

const STATE_COLORS: Record<string, string> = {
  recibida: '#3b82f6',
  pendiente: '#f59e0b',
  aprobada: '#22c55e',
  contabilizada: '#6366f1',
  en_nomina: '#8b5cf6',
  pagada: '#10b981',
  rechazada: '#ef4444',
};

export default function DashboardPage() {
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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Facturas</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rechazadas</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCLP(value), 'Monto']} />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
