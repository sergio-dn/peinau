import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { useContabilizar } from '@/api/invoices';
import { toast } from 'sonner';
import { BookCheck, XCircle } from 'lucide-react';

const ACTION_DESCRIPTIONS: Record<string, string> = {
  aprobar:       'Marca la factura como aprobada y la envía a Contabilidad para imputación.',
  rechazar:      'Rechaza la factura. Deberás indicar un motivo. Esta acción es irreversible.',
  contabilizar:  'Registra la factura en el sistema contable y la mueve a nómina de pagos.',
  enviar_nomina: 'Incluye esta factura en la próxima nómina de pagos para tesorería.',
  pagar:         'Confirma el pago de la factura. El estado cambiará a "Pagada".',
};

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
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {showContabilizar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleContabilizar} disabled={contabilizar.isPending}>
                <BookCheck className="mr-2 h-4 w-4" />
                {contabilizar.isPending ? 'Contabilizando...' : 'Contabilizar'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              {ACTION_DESCRIPTIONS.contabilizar}
            </TooltipContent>
          </Tooltip>
        )}
        {showRechazar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" onClick={onReject}>
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              {ACTION_DESCRIPTIONS.rechazar}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
