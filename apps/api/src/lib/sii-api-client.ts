import { env } from '../config/env.js';

// --- Response types ---

export interface SiiApiPeriodo {
  codigo: string;
  nombre: string;
  año: number;
  mes: number;
}

export interface SiiApiSyncStartResponse {
  status: string;
  task_id: string;
  message: string;
}

export interface SiiApiSyncLog {
  id: number;
  periodo: string;
  operacion: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  docs_downloaded: number;
}

export interface SiiApiSyncStatus {
  rut: string;
  logs: SiiApiSyncLog[];
}

export interface SiiApiResumenTipoDoc {
  tipo_doc: number;
  tipo_doc_nombre: string | null;
  cantidad_doc: number;
  cantidad_anulados: number;
  monto_neto: number;
  monto_iva: number;
  monto_exento: number;
  monto_total: number;
}

export interface SiiApiResumenOperacion {
  total_documentos: number;
  neto: number;
  iva: number;
  exento: number;
  total: number;
  por_tipo: SiiApiResumenTipoDoc[];
}

export interface SiiApiResumen {
  rut: string;
  periodo: string;
  compras: SiiApiResumenOperacion | null;
  ventas: SiiApiResumenOperacion | null;
}

export interface SiiApiPaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  periodo: string;
  rut: string;
}

// --- Mapper ---

/**
 * Converts "DD/MM/YYYY" to "YYYY-MM-DD", or returns as-is if already ISO.
 */
function normalizeFecha(raw: string): string {
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  return raw;
}

/**
 * Parses "DD/MM/YYYY HH:mm:ss" or ISO string into a Date.
 */
function parseFechaRecepcion(raw: string): Date {
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}`);
  }
  return new Date(raw);
}

export function mapApiInvoiceToUpsert(item: Record<string, any>) {
  const tipoDte = Number(item.tipo_doc ?? 0);
  const folio = Number(item.folio ?? 0);
  const fechaEmision = normalizeFecha(item.fecha_emision ?? '');
  const rutEmisor = item.rut_contraparte && item.dv_contraparte
    ? `${item.rut_contraparte}-${item.dv_contraparte}`
    : '';
  const razonSocialEmisor = item.razon_social ?? '';
  const montoExento = Number(item.monto_exento ?? 0);
  const montoNeto = Number(item.monto_neto ?? 0);
  const montoIva = Number(item.monto_iva ?? 0);
  const montoTotal = Number(item.monto_total ?? 0);
  const fechaRecepcion = item.fecha_recepcion ?? null;

  return {
    tipoDte,
    folio,
    fechaEmision,
    fechaRecepcionSii: fechaRecepcion ? parseFechaRecepcion(fechaRecepcion) : undefined,
    rutEmisor,
    razonSocialEmisor,
    montoExento,
    montoNeto,
    montoIva,
    tasaIva: 19,
    montoTotal,
  };
}

// --- Client ---

class SiiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: any,
  ) {
    super(message);
    this.name = 'SiiApiError';
  }
}

class SiiApiClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (resp.status === 204) {
      return undefined as T;
    }

    const data = await resp.json();

    if (!resp.ok) {
      throw new SiiApiError(
        data.detail || data.message || `SII API error ${resp.status}`,
        resp.status,
        data,
      );
    }

    return data as T;
  }

  // Sync

  async triggerSync(
    clave: string,
    desde?: string,
    hasta?: string,
  ): Promise<SiiApiSyncStartResponse> {
    return this.request<SiiApiSyncStartResponse>('POST', '/api/v1/sync', {
      clave,
      ...(desde && { desde }),
      ...(hasta && { hasta }),
    });
  }

  async getSyncStatus(): Promise<SiiApiSyncStatus> {
    return this.request<SiiApiSyncStatus>('GET', '/api/v1/sync/status');
  }

  // Data retrieval

  async getPeriodos(): Promise<SiiApiPeriodo[]> {
    const resp = await this.request<{ rut: string; periodos: SiiApiPeriodo[] }>(
      'GET',
      '/api/v1/periodos',
    );
    return resp.periodos;
  }

  async getCompras(
    periodo: string,
    limit = 50,
    offset = 0,
  ): Promise<SiiApiPaginatedResponse<Record<string, any>>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request('GET', `/api/v1/compras/${periodo}?${params}`);
  }

  async getVentas(
    periodo: string,
    limit = 50,
    offset = 0,
  ): Promise<SiiApiPaginatedResponse<Record<string, any>>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request('GET', `/api/v1/ventas/${periodo}?${params}`);
  }

  async getAllCompras(periodo: string): Promise<Record<string, any>[]> {
    return this.fetchAllPages((limit, offset) => this.getCompras(periodo, limit, offset));
  }

  async getAllVentas(periodo: string): Promise<Record<string, any>[]> {
    return this.fetchAllPages((limit, offset) => this.getVentas(periodo, limit, offset));
  }

  async getResumen(periodo: string): Promise<SiiApiResumen> {
    return this.request<SiiApiResumen>('GET', `/api/v1/resumen/${periodo}`);
  }

  // Helpers

  private async fetchAllPages(
    fetcher: (limit: number, offset: number) => Promise<SiiApiPaginatedResponse<Record<string, any>>>,
  ): Promise<Record<string, any>[]> {
    const PAGE_SIZE = 200;
    const all: Record<string, any>[] = [];
    let offset = 0;

    while (true) {
      const page = await fetcher(PAGE_SIZE, offset);
      all.push(...page.data);
      if (offset + page.data.length >= page.total || page.data.length === 0) {
        break;
      }
      offset += page.data.length;
    }

    return all;
  }

  async waitForSync(timeoutMs = 300_000): Promise<SiiApiSyncStatus> {
    const start = Date.now();
    let delay = 3_000;

    while (Date.now() - start < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const status = await this.getSyncStatus();

      const hasLogs = status.logs.length > 0;
      if (hasLogs) {
        const allDone = status.logs.every(
          l => l.status === 'ok' || l.status === 'error' || l.status === 'completed',
        );
        if (allDone) return status;
      }

      delay = Math.min(delay * 1.5, 15_000);
    }

    return this.getSyncStatus();
  }
}

export const siiApiClient = new SiiApiClient(env.SII_API_URL, env.SII_API_KEY);
