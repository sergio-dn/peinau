import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useInvoiceHistory, useUpdateLineAccounting, useContabilizar, useRejectInvoice } from '@/api/invoices';
import { useAccounts, useCostCenters } from '@/api/accounting';
import { InvoiceStateBadge } from '@/components/invoices/InvoiceStateBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCLP } from '@wildlama/shared';
import { toast } from 'sonner';
import { ArrowLeft, Clock, CheckCircle, XCircle, Calculator } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: invoice, isLoading } = useInvoice(id!);
  const { data: history } = useInvoiceHistory(id!);
  const { data: accounts } = useAccounts();
  const { data: costCenters } = useCostCenters();
  const updateLineAccounting = useUpdateLineAccounting();
  const contabilizar = useContabilizar();
  const rejectInvoice = useRejectInvoice();

  const handleAccountChange = (lineId: string, accountId: string) => {
    updateLineAccounting.mutate(
      { invoiceId: id!, lineId, accountId: accountId || null, costCenterId: null },
      { onSuccess: () => toast.success('Cuenta actualizada') }
    );
  };

  const handleCostCenterChange = (lineId: string, costCenterId: string) => {
    updateLineAccounting.mutate(
      { invoiceId: id!, lineId, accountId: null, costCenterId: costCenterId || null },
      { onSuccess: () => toast.success('Centro de costo actualizado') }
    );
  };

  const handleContabilizar = () => {
    contabilizar.mutate(id!, {
      onSuccess: () => toast.success('Factura contabilizada'),
      onError: () => toast.error('Error al contabilizar'),
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Debe ingresar un motivo de rechazo');
      return;
    }
    rejectInvoice.mutate(
      { invoiceId: id!, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Factura rechazada');
          setShowRejectForm(false);
          setRejectReason('');
        },
        onError: () => toast.error('Error al rechazar'),
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando factura...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-8 text-muted-foreground">Factura no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Factura {invoice.tipoDte} #{invoice.folio}
            </h1>
            <InvoiceStateBadge state={invoice.state} />
          </div>
          <p className="text-muted-foreground mt-1">
            {invoice.razonSocialEmisor} - {invoice.rutEmisor}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.state === 'aprobada' && (
            <Button onClick={handleContabilizar} disabled={contabilizar.isPending}>
              <Calculator className="w-4 h-4 mr-2" />
              Contabilizar
            </Button>
          )}
          {['recibida', 'pendiente'].includes(invoice.state) && (
            <Button
              variant="destructive"
              onClick={() => setShowRejectForm(!showRejectForm)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          )}
        </div>
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Motivo de rechazo..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1"
              />
              <Button variant="destructive" onClick={handleReject} disabled={rejectInvoice.isPending}>
                Confirmar Rechazo
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Detalle de la Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Fecha Emision</p>
                <p className="font-medium">{invoice.fechaEmision}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Recepcion SII</p>
                <p className="font-medium">{invoice.fechaRecepcionSii || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Neto</p>
                <p className="font-medium">{formatCLP(Number(invoice.montoNeto))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IVA</p>
                <p className="font-medium">{formatCLP(Number(invoice.montoIva))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Exento</p>
                <p className="font-medium">{formatCLP(Number(invoice.montoExento || 0))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-xl font-bold">{formatCLP(Number(invoice.montoTotal))}</p>
              </div>
            </div>

            {/* Invoice lines */}
            <h4 className="font-semibold mb-3">Lineas de Detalle</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Descripcion</th>
                    <th className="text-right py-2 px-2 font-medium">Cant.</th>
                    <th className="text-right py-2 px-2 font-medium">Precio</th>
                    <th className="text-right py-2 px-2 font-medium">Total</th>
                    <th className="text-left py-2 px-2 font-medium">Cuenta</th>
                    <th className="text-left py-2 px-2 font-medium">Centro Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines?.map((line: any) => (
                    <tr key={line.id} className="border-b">
                      <td className="py-2 px-2">{line.descripcion}</td>
                      <td className="py-2 px-2 text-right">{line.cantidad}</td>
                      <td className="py-2 px-2 text-right">{formatCLP(Number(line.precioUnitario))}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatCLP(Number(line.montoTotal))}</td>
                      <td className="py-2 px-2">
                        <select
                          value={line.accountId || ''}
                          onChange={(e) => handleAccountChange(line.id, e.target.value)}
                          className="h-8 rounded border border-input bg-background px-2 text-xs w-full max-w-[160px]"
                        >
                          <option value="">Sin cuenta</option>
                          {accounts?.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={line.costCenterId || ''}
                          onChange={(e) => handleCostCenterChange(line.id, e.target.value)}
                          className="h-8 rounded border border-input bg-background px-2 text-xs w-full max-w-[160px]"
                        >
                          <option value="">Sin CC</option>
                          {costCenters?.map((cc: any) => (
                            <option key={cc.id} value={cc.id}>
                              {cc.code} - {cc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* History sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((entry: any, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.action === 'rechazada' ? 'bg-red-100' :
                        entry.action === 'aprobada' ? 'bg-green-100' :
                        'bg-blue-100'
                      }`}>
                        {entry.action === 'rechazada' ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : entry.action === 'aprobada' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      {idx < history.length - 1 && (
                        <div className="w-px h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.fromState} &rarr; {entry.toState}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.userName} - {new Date(entry.createdAt).toLocaleString('es-CL')}
                      </p>
                      {entry.comment && (
                        <p className="text-sm mt-1">{entry.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin historial</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
