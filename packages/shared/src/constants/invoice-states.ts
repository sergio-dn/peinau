import { InvoiceState } from '../types/invoice.js';

export const INVOICE_STATES: Record<InvoiceState, { key: InvoiceState; label: string }> = {
  recibida: { key: 'recibida', label: 'Recibida' },
  pendiente: { key: 'pendiente', label: 'Pendiente de aprobación' },
  aprobada: { key: 'aprobada', label: 'Aprobada' },
  contabilizada: { key: 'contabilizada', label: 'Contabilizada' },
  en_nomina: { key: 'en_nomina', label: 'En nómina de pago' },
  pagada: { key: 'pagada', label: 'Pagada' },
  rechazada: { key: 'rechazada', label: 'Rechazada' },
};

export const VALID_TRANSITIONS: Record<InvoiceState, InvoiceState[]> = {
  recibida: ['pendiente', 'rechazada'],
  pendiente: ['aprobada', 'rechazada'],
  aprobada: ['contabilizada', 'rechazada'],
  contabilizada: ['en_nomina'],
  en_nomina: ['pagada'],
  pagada: [],
  rechazada: ['pendiente'],
};

export function canTransition(from: InvoiceState, to: InvoiceState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}
