import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InvoiceStateBadge } from '@/components/invoices/InvoiceStateBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { formatCLP } from '@wildlama/shared';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

const DTE_NAMES: Record<number, string> = {
  33: 'Factura',
  34: 'Fac. Exenta',
  43: 'Liq. Factura',
  46: 'Fac. Compra',
  56: 'Nota Débito',
  61: 'Nota Crédito',
};

function formatTipoDte(tipo: number): string {
  return DTE_NAMES[tipo] || `DTE ${tipo}`;
}

interface ApprovalCardProps {
  approval: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove: (invoiceId: string, comment?: string) => void;
  onReject: (invoiceId: string, reason: string) => void;
}

export function ApprovalCard({
  approval,
  isSelected,
  onSelect,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');

  const handleApprove = () => {
    onApprove(approval.invoiceId, comment || undefined);
    setApproveOpen(false);
    setComment('');
  };

  const handleReject = () => {
    if (reason.trim().length < 10) return;
    onReject(approval.invoiceId, reason);
    setRejectOpen(false);
    setReason('');
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect(approval.invoiceId)}
                className="mt-1"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to={`/invoices/${approval.invoiceId}`}
                  className="text-lg font-semibold text-primary hover:underline"
                >
                  {formatTipoDte(approval.tipoDte)} #{approval.folio}
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

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/invoices/${approval.invoiceId}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Link>
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setApproveOpen(true)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Factura</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Comentario opcional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Factura</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motivo de rechazo (minimo 10 caracteres)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-sm text-destructive">
              El motivo debe tener al menos 10 caracteres.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reason.trim().length < 10}
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
