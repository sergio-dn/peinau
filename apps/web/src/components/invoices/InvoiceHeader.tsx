import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoiceStateBadge } from './InvoiceStateBadge';

interface InvoiceHeaderProps {
  invoice: any;
  onBack: () => void;
}

export function InvoiceHeader({ invoice, onBack }: InvoiceHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            Factura {invoice.tipoDte} #{invoice.folio}
          </h1>
          <InvoiceStateBadge state={invoice.state} />
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{invoice.razonSocialEmisor}</span>
          {' '}({invoice.rutEmisor})
        </p>
        <p>Emitida: {invoice.fechaEmision}</p>
        {invoice.fechaRecepcionSii && (
          <p>Recepcion SII: {invoice.fechaRecepcionSii}</p>
        )}
      </div>
    </div>
  );
}
