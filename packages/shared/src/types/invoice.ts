export const InvoiceState = {
  RECIBIDA: 'recibida',
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  CONTABILIZADA: 'contabilizada',
  EN_NOMINA: 'en_nomina',
  PAGADA: 'pagada',
  RECHAZADA: 'rechazada',
} as const;

export type InvoiceState = (typeof InvoiceState)[keyof typeof InvoiceState];

export const DteType = {
  FACTURA: 33,
  FACTURA_EXENTA: 34,
  FACTURA_COMPRA: 46,
  GUIA_DESPACHO: 52,
  NOTA_DEBITO: 56,
  NOTA_CREDITO: 61,
  BOLETA_HONORARIOS: 71,
} as const;

export type DteType = (typeof DteType)[keyof typeof DteType];

export interface Invoice {
  id: string;
  companyId: string;
  supplierId: string | null;
  tipoDte: DteType;
  folio: number;
  fechaEmision: string;
  fechaRecepcionSii: string | null;
  rutEmisor: string;
  razonSocialEmisor: string;
  montoExento: number;
  montoNeto: number;
  montoIva: number;
  tasaIva: number;
  montoTotal: number;
  state: InvoiceState;
  dteXml: string | null;
  siiTrackId: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  lineNumber: number;
  nombreItem: string;
  descripcion: string | null;
  cantidad: number;
  unidadMedida: string | null;
  precioUnitario: number;
  descuentoPct: number;
  montoItem: number;
  indicadorExencion: number | null;
  accountId: string | null;
  costCenterId: string | null;
}

export interface InvoiceStateHistory {
  id: string;
  invoiceId: string;
  fromState: InvoiceState | null;
  toState: InvoiceState;
  changedBy: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type CreateInvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateInvoiceInput = Partial<
  Omit<Invoice, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
>;
