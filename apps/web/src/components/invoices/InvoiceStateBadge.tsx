import { Badge } from '@/components/ui/Badge';

const STATE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' }> = {
  recibida: { label: 'Recibida', variant: 'info' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  contabilizada: { label: 'Contabilizada', variant: 'default' },
  en_nomina: { label: 'En Nomina', variant: 'secondary' },
  pagada: { label: 'Pagada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'destructive' },
};

export function InvoiceStateBadge({ state }: { state: string }) {
  const config = STATE_CONFIG[state] || { label: state, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
