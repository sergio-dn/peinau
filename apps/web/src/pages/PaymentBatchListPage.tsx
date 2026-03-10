import { useState } from 'react';
import { usePaymentBatches, useApprovePaymentBatch, useExecutePaymentBatch } from '@/api/payment-batches';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCLP } from '@wildlama/shared';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, Play, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const BATCH_STATE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'info' },
  ejecutada: { label: 'Ejecutada', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

export default function PaymentBatchListPage() {
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePaymentBatches({ state: state || undefined, page, limit: 20 });
  const approveBatch = useApprovePaymentBatch();
  const executeBatch = useExecutePaymentBatch();

  const handleApprove = (batchId: string) => {
    approveBatch.mutate(batchId, {
      onSuccess: () => toast.success('Nomina aprobada'),
      onError: () => toast.error('Error al aprobar nomina'),
    });
  };

  const handleExecute = (batchId: string) => {
    executeBatch.mutate(batchId, {
      onSuccess: () => toast.success('Nomina ejecutada'),
      onError: () => toast.error('Error al ejecutar nomina'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nominas de Pago</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="ejecutada">Ejecutada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <>
              <div className="space-y-4">
                {data?.data?.map((batch: any) => {
                  const stateConfig = BATCH_STATE_CONFIG[batch.state] || { label: batch.state, variant: 'outline' as const };
                  return (
                    <div key={batch.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <h3 className="font-semibold">{batch.name}</h3>
                            <Badge variant={stateConfig.variant}>{stateConfig.label}</Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Fecha Pago: </span>
                              <span>{batch.paymentDate}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Facturas: </span>
                              <span className="font-medium">{batch.invoiceCount || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Monto Total: </span>
                              <span className="font-bold">{formatCLP(Number(batch.totalAmount || 0))}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Creada: </span>
                              <span>{new Date(batch.createdAt).toLocaleDateString('es-CL')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {batch.state === 'pendiente' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(batch.id)}
                              disabled={approveBatch.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                          )}
                          {batch.state === 'aprobada' && (
                            <Button
                              size="sm"
                              onClick={() => handleExecute(batch.id)}
                              disabled={executeBatch.isPending}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Ejecutar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!data?.data || data.data.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No se encontraron nominas de pago</p>
                  </div>
                )}
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {data.total} nominas encontradas
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
                    <span className="text-sm">Pagina {page} de {data.totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
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
