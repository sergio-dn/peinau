export interface SiiCredentials {
  rut: string;       // e.g., '76123456-K'
  password: string;
}

export interface SiiSession {
  token: string;
  cookies: string[];
  expiresAt: Date;
}

export interface RpetcQuery {
  rutReceptor: string;  // Company's RUT
  periodoDesde: string; // YYYY-MM format
  periodoHasta: string;
  estado?: string;      // 'REGISTRO' | 'PENDIENTE' | 'ACEPTADO' | 'RECLAMADO'
}

export interface RpetcEntry {
  tipoDte: number;
  folio: number;
  fechaEmision: string;    // YYYY-MM-DD
  rutEmisor: string;
  razonSocialEmisor: string;
  montoExento: number;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
  fechaRecepcion: string;
  estado: string;
}

export interface DteDocument {
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  rutEmisor: string;
  razonSocialEmisor: string;
  giroEmisor: string;
  direccionEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  montoExento: number;
  montoNeto: number;
  montoIva: number;
  tasaIva: number;
  montoTotal: number;
  detalle: DteDetalleLine[];
  xmlRaw: string;
}

export interface DteDetalleLine {
  nroLinDet: number;
  nombreItem: string;
  descripcion?: string;
  cantidad?: number;
  unidadMedida?: string;
  precioUnitario?: number;
  descuentoPct?: number;
  montoItem: number;
  indicadorExencion?: number;  // 1=exento
}

export interface SiiSyncResult {
  startedAt: Date;
  finishedAt: Date;
  status: 'success' | 'error';
  invoicesFound: number;
  invoicesNew: number;
  errorMessage?: string;
}

/**
 * Normalized document output from SiiDocumentsService.
 * The API layer consumes this stable contract regardless of data source.
 */
export interface NormalizedDocument {
  externalId: string;       // "sii:{companyRut}:{tipo}:{folio}:{emisorRut}"
  source: 'portal' | 'official';
  sourceMode: 'rcv_detalle' | 'portal_xml' | 'soap_status';
  documentType: number;
  folio: number;
  issuerRut: string;
  issuerName: string;
  issuedAt: string;
  receivedAt: string;
  exemptAmount: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  rawSha256?: string;
}
