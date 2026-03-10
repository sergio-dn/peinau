import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePendingApprovals, useApproveInvoice, useRejectApproval } from '@/api/approvals';
import { InvoiceStateBadge } from '@/components/invoices/InvoiceStateBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCLP } from '@wildlama/shared';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';

export default function ApprovalQueuePage() {
  const { data: approvals, isLoading } = usePendingApprovals();
  const approveInvoice = useApproveInvoice();
  const rejectApproval = useRejectApproval();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [commentId, setCommentId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const handleApprove = (invoiceId: string) => {
    const comment = commentId === invoiceId ? approvalComment : undefined;
    approveInvoice.mutate(
      { invoiceId, comment },
      {
        onSuccess: () => {
          toast.success('Factura aprobada');
          setCommentId(null);
          setApprovalComment('');
        },
        onError: () => toast.error('Error al aprobar'),
      }
    );
  };

  const handleReject = (invoiceId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Debe ingresar un motivo de rechazo');
      return;
    }
    rejectApproval.mutate(
      { invoiceId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Factura rechazada');
          setRejectingId(null);
          setRejectReason('');
        },
        onError: () => toast.error('Error al rechazar'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cola de Aprobaciones</h1>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : !approvals || approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin aprobaciones pendientes</h3>
              <p className="text-muted-foreground">No hay facturas esperando tu aprobacion.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval: any) => (
            <Card key={approval.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Invoice info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        to={`/invoices/${approval.invoiceId}`}
                        className="text-lg font-semibold text-primary hover:underline"
                      >
                        {approval.tipoDte} #{approval.folio}
                      </Link>
                      <InvoiceStateBadge state={approval.state || 'pendiente'} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Proveedor: </span>
                        <span className="font-medium">{approval.razonSocialEmisor}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">RUT: </span>
                        <span className="font-mono">{approval.rutEmisor}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha: </span>
                        <span>{approval.fechaEmision}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-bold">{formatCLP(Number(approval.montoTotal))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/invoices/${approval.invoiceId}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCommentId(commentId === approval.invoiceId ? null : approval.invoiceId)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Comentar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(approval.invoiceId)}
                      disabled={approveInvoice.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRejectingId(rejectingId === approval.invoiceId ? null : approval.invoiceId)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>

                {/* Comment input */}
                {commentId === approval.invoiceId && (
                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Comentario de aprobacion (opcional)..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleApprove(approval.invoiceId)}
                      disabled={approveInvoice.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Aprobar con comentario
                    </Button>
                  </div>
                )}

                {/* Reject input */}
                {rejectingId === approval.invoiceId && (
                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Motivo de rechazo (obligatorio)..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(approval.invoiceId)}
                      disabled={rejectApproval.isPending}
                    >
                      Confirmar Rechazo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
