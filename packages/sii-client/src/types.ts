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
