import { Button } from '@/components/ui/Button';
import { useContabilizar } from '@/api/invoices';
import { toast } from 'sonner';
import { BookCheck, XCircle } from 'lucide-react';

interface InvoiceActionsProps {
  invoice: any;
  onReject: () => void;
}

export function InvoiceActions({ invoice, onReject }: InvoiceActionsProps) {
  const contabilizar = useContabilizar();

  const handleContabilizar = () => {
    contabilizar.mutate(invoice.id, {
      onSuccess: () => toast.success('Factura contabilizada'),
      onError: () => toast.error('Error al contabilizar'),
    });
  };

  const showContabilizar = invoice.state === 'aprobada';
  const showRechazar = invoice.state === 'recibida' || invoice.state === 'pendiente';

  if (!showContabilizar && !showRechazar) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {showContabilizar && (
        <Button onClick={handleContabilizar} disabled={contabilizar.isPending}>
          <BookCheck className="mr-2 h-4 w-4" />
          {contabilizar.isPending ? 'Contabilizando...' : 'Contabilizar'}
        </Button>
      )}
      {showRechazar && (
        <Button variant="destructive" onClick={onReject}>
          <XCircle className="mr-2 h-4 w-4" />
          Rechazar
        </Button>
      )}
    </div>
  );
}
