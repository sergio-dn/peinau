import { useState, useMemo } from 'react';
import { useMonthlyVolume, useSupplierRanking, useTaxSummary } from '@/api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCLP } from '@wildlama/shared';
import {
  ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, Legend,
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

const COLOR_Y1 = '#6366f1';
const COLOR_Y2 = '#f59e0b';

function fmtM(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}K`;
  return `$${v}`;
}

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[200px] space-y-1">
      <p className="font-semibold text-slate-700 text-sm mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums" style={{ color: p.color }}>
            {String(p.dataKey).startsWith('monto')
              ? formatCLP(p.value)
              : p.value.toLocaleString('es-CL')}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthlyVolumeReport() {
  const currentYear = new Date().getFullYear();
  const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const [year1, setYear1] = useState(currentYear);
  const [compareYear, setCompareYear] = useState('none');
  const year2 = compareYear !== 'none' ? Number(compareYear) : null;

  const { data: raw1, isLoading: l1 } = useMonthlyVolume(year1);
  const { data: raw2, isLoading: l2 } = useMonthlyVolume(year2 ?? year1 - 1);
  const isLoading = l1 || (year2 !== null && l2);

  const chartData = useMemo(() => {
    if (!raw1) return [];
    const total1 = raw1.reduce((s: number, m: any) => s + (m.totalAmount ?? 0), 0);
    const total2 = raw2 ? raw2.reduce((s: number, m: any) => s + (m.totalAmount ?? 0), 0) : 0;
    return raw1.map((m: any, i: number) => {
      const m2 = year2 ? raw2?.[i] : null;
      return {
        label: m.label,
        [`monto_${year1}`]:   m.totalAmount ?? 0,
        [`count_${year1}`]:   m.count ?? 0,
        [`pct_${year1}`]:     total1 > 0 ? +((m.totalAmount / total1) * 100).toFixed(1) : 0,
        ...(year2 && m2 ? {
          [`monto_${year2}`]: m2.totalAmount ?? 0,
          [`count_${year2}`]: m2.count ?? 0,
          [`pct_${year2}`]:   total2 > 0 ? +((m2.totalAmount / total2) * 100).toFixed(1) : 0,
        } : {}),
      };
    });
  }, [raw1, raw2, year1, year2]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-lg">Volumen Mensual de Facturas</CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={year1}
            onChange={(e) => setYear1(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-slate-400 font-medium">vs</span>
          <select
            value={compareYear}
            onChange={(e) => setCompareYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">Sin comparar</option>
            {YEARS.filter((y) => y !== year1).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Cargando...</div>
        ) : chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 55, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="monto"
                  orientation="left"
                  tickFormatter={fmtM}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<VolumeTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(v) => <span className="text-slate-600">{v}</span>}
                />

                <Bar yAxisId="monto" dataKey={`monto_${year1}`} name={`Monto ${year1}`}
                  fill={COLOR_Y1} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={32} />
                {year2 && (
                  <Bar yAxisId="monto" dataKey={`monto_${year2}`} name={`Monto ${year2}`}
                    fill={COLOR_Y2} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={32} />
                )}
                <Line yAxisId="count" type="monotone" dataKey={`count_${year1}`} name={`Facturas ${year1}`}
                  stroke={COLOR_Y1} strokeWidth={2.5} dot={{ r: 3, fill: COLOR_Y1 }} activeDot={{ r: 5 }} />
                {year2 && (
                  <Line yAxisId="count" type="monotone" dataKey={`count_${year2}`} name={`Facturas ${year2}`}
                    stroke={COLOR_Y2} strokeWidth={2.5} strokeDasharray="5 4"
                    dot={{ r: 3, fill: COLOR_Y2 }} activeDot={{ r: 5 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Tabla de % sobre el total anual */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 pr-3 text-slate-400 font-medium w-28">% del año</th>
                    {chartData.map((m: any) => (
                      <th key={m.label} className="text-center py-1.5 px-1 text-slate-400 font-medium">{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 pr-3 text-indigo-500 font-semibold">{year1}</td>
                    {chartData.map((m: any) => (
                      <td key={m.label} className="py-1 px-1 text-center tabular-nums text-indigo-600 font-medium">
                        {(m[`pct_${year1}`] ?? 0)}%
                      </td>
                    ))}
                  </tr>
                  {year2 && (
                    <tr>
                      <td className="py-1 pr-3 text-amber-500 font-semibold">{year2}</td>
                      {chartData.map((m: any) => (
                        <td key={m.label} className="py-1 px-1 text-center tabular-nums text-amber-600 font-medium">
                          {(m[`pct_${year2}`] ?? 0)}%
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Sin datos para el período seleccionado
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
