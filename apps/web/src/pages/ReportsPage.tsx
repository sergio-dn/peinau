import { useState } from 'react';
import { useMonthlyVolume, useSupplierRanking, useTaxSummary } from '@/api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCLP } from '@wildlama/shared';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, Building2, Receipt } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'volume' | 'suppliers' | 'tax'>('volume');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reportes</h1>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'volume'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('volume')}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Volumen Mensual
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('suppliers')}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Ranking Proveedores
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tax'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('tax')}
        >
          <Receipt className="w-4 h-4 inline mr-2" />
          Resumen Tributario
        </button>
      </div>

      {activeTab === 'volume' && <MonthlyVolumeReport />}
      {activeTab === 'suppliers' && <SupplierRankingReport />}
      {activeTab === 'tax' && <TaxSummaryReport />}
    </div>
  );
}

function MonthlyVolumeReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useMonthlyVolume(year);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Volumen Mensual de Facturas</CardTitle>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value: any, name: string) =>
                  name === 'totalAmount' ? [formatCLP(value), 'Monto Total'] : [value, 'Cantidad']
                }
              />
              <Legend
                formatter={(value: string) =>
                  value === 'count' ? 'Cantidad' : 'Monto Total'
                }
              />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="totalAmount" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Sin datos para el periodo seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierRankingReport() {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { data, isLoading } = useSupplierRanking({
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    limit: 15,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <CardTitle className="text-lg flex-1">Ranking de Proveedores</CardTitle>
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : data && data.length > 0 ? (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="razonSocial" type="category" width={200} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [formatCLP(value), 'Monto Total']} />
                <Bar dataKey="totalAmount" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Proveedor</th>
                    <th className="text-left py-2 px-2 font-medium">RUT</th>
                    <th className="text-right py-2 px-2 font-medium">Facturas</th>
                    <th className="text-right py-2 px-2 font-medium">Monto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((supplier: any, idx: number) => (
                    <tr key={supplier.rut} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{supplier.razonSocial}</td>
                      <td className="py-2 px-2 font-mono text-xs">{supplier.rut}</td>
                      <td className="py-2 px-2 text-right">{supplier.invoiceCount}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatCLP(Number(supplier.totalAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sin datos para el periodo seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaxSummaryReport() {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { data, isLoading } = useTaxSummary({
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <CardTitle className="text-lg flex-1">Resumen Tributario</CardTitle>
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Neto</p>
                <p className="text-2xl font-bold">{formatCLP(Number(data.totalNeto || 0))}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total IVA</p>
                <p className="text-2xl font-bold">{formatCLP(Number(data.totalIva || 0))}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCLP(Number(data.totalGeneral || 0))}</p>
              </div>
            </div>

            {/* Breakdown by DTE type */}
            {data.byDteType && data.byDteType.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Desglose por Tipo de Documento</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Tipo DTE</th>
                        <th className="text-right py-2 px-2 font-medium">Cantidad</th>
                        <th className="text-right py-2 px-2 font-medium">Neto</th>
                        <th className="text-right py-2 px-2 font-medium">IVA</th>
                        <th className="text-right py-2 px-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byDteType.map((row: any) => (
                        <tr key={row.tipoDte} className="border-b">
                          <td className="py-2 px-2 font-medium">{row.tipoDte}</td>
                          <td className="py-2 px-2 text-right">{row.count}</td>
                          <td className="py-2 px-2 text-right">{formatCLP(Number(row.neto))}</td>
                          <td className="py-2 px-2 text-right">{formatCLP(Number(row.iva))}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCLP(Number(row.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sin datos para el periodo seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
