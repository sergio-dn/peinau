import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoices } from '@/api/invoices';
import { InvoiceStateBadge } from '@/components/invoices/InvoiceStateBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCLP } from '@wildlama/shared';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATES = ['', 'recibida', 'pendiente', 'aprobada', 'contabilizada', 'en_nomina', 'pagada', 'rechazada'];

export default function InvoiceListPage() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInvoices({ search: search || undefined, state: state || undefined, page, limit: 25 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Facturas</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {STATES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Tipo</th>
                      <th className="text-left py-3 px-2 font-medium">Folio</th>
                      <th className="text-left py-3 px-2 font-medium">Fecha</th>
                      <th className="text-left py-3 px-2 font-medium">Proveedor</th>
                      <th className="text-left py-3 px-2 font-medium">RUT</th>
                      <th className="text-right py-3 px-2 font-medium">Neto</th>
                      <th className="text-right py-3 px-2 font-medium">Total</th>
                      <th className="text-left py-3 px-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data?.map((inv: any) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{inv.tipoDte}</td>
                        <td className="py-3 px-2">
                          <Link to={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium">
                            {inv.folio}
                          </Link>
                        </td>
                        <td className="py-3 px-2">{inv.fechaEmision}</td>
                        <td className="py-3 px-2">{inv.razonSocialEmisor}</td>
                        <td className="py-3 px-2 font-mono text-xs">{inv.rutEmisor}</td>
                        <td className="py-3 px-2 text-right">{formatCLP(Number(inv.montoNeto))}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatCLP(Number(inv.montoTotal))}</td>
                        <td className="py-3 px-2"><InvoiceStateBadge state={inv.state} /></td>
                      </tr>
                    ))}
                    {data?.data?.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No se encontraron facturas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {data && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {data.total} facturas encontradas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">Pagina {page} de {data.totalPages || 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (data.totalPages || 1)}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
