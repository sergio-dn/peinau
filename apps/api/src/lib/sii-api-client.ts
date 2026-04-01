import { env } from '../config/env.js';

// --- Response types ---

export interface SiiApiCompany {
  rut: string;
  razon_social: string | null;
  activa: boolean;
  created_at: string | null;
}

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

function formatRut(rutBody?: string, dv?: string): string {
  if (!rutBody || !dv) return '';
  return `${rutBody}-${dv}`;
}

export function mapApiInvoiceToUpsert(item: Record<string, any>) {
  const tipoDte = item.tipo_doc ?? item.detTipoDte ?? item.tipo_dte ?? 0;
  const folio = item.folio ?? item.detNroDoc ?? 0;
  const fechaEmision = item.fecha_emision ?? item.detFchDoc ?? '';
  const rutEmisor = item.rut_emisor ?? item.rut_proveedor ?? formatRut(item.detRutDoc, item.detDvDoc) ?? '';
  const razonSocialEmisor = item.razon_social ?? item.razon_social_emisor ?? item.detRznSoc ?? '';
  const montoExento = Number(item.monto_exento ?? item.detMntExe ?? 0);
  const montoNeto = Number(item.monto_neto ?? item.detMntNeto ?? 0);
  const montoIva = Number(item.monto_iva ?? item.detMntIVA ?? 0);
  const montoTotal = Number(item.monto_total ?? item.detMntTotal ?? 0);
  const fechaRecepcion = item.fecha_recepcion ?? item.detFchRecep ?? null;

  return {
    tipoDte: Number(tipoDte),
    folio: Number(folio),
    fechaEmision,
    fechaRecepcionSii: fechaRecepcion ? new Date(fechaRecepcion) : undefined,
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

  // Company management

  async registerCompany(rut: string, clave: string, razonSocial?: string): Promise<SiiApiCompany> {
    return this.request<SiiApiCompany>('POST', '/api/v1/empresas', {
      rut,
      clave,
      razon_social: razonSocial ?? null,
    });
  }

  async listCompanies(): Promise<SiiApiCompany[]> {
    const resp = await this.request<{ empresas: SiiApiCompany[] }>('GET', '/api/v1/empresas');
    return resp.empresas;
  }

  // Sync

  async triggerSync(
    rut: string,
    clave: string,
    desde?: string,
    hasta?: string,
    force?: boolean,
  ): Promise<SiiApiSyncStartResponse> {
    return this.request<SiiApiSyncStartResponse>('POST', `/api/v1/${rut}/sync`, {
      clave,
      ...(desde && { desde }),
      ...(hasta && { hasta }),
      ...(force && { force }),
    });
  }

  async getSyncStatus(rut: string): Promise<SiiApiSyncStatus> {
    return this.request<SiiApiSyncStatus>('GET', `/api/v1/${rut}/sync/status`);
  }

  // Data retrieval

  async getPeriodos(rut: string): Promise<SiiApiPeriodo[]> {
    const resp = await this.request<{ rut: string; periodos: SiiApiPeriodo[] }>(
      'GET',
      `/api/v1/${rut}/periodos`,
    );
    return resp.periodos;
  }

  async getCompras(
    rut: string,
    periodo: string,
    limit = 50,
    offset = 0,
  ): Promise<SiiApiPaginatedResponse<Record<string, any>>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request('GET', `/api/v1/${rut}/compras/${periodo}?${params}`);
  }

  async getVentas(
    rut: string,
    periodo: string,
    limit = 50,
    offset = 0,
  ): Promise<SiiApiPaginatedResponse<Record<string, any>>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request('GET', `/api/v1/${rut}/ventas/${periodo}?${params}`);
  }

  async getAllCompras(rut: string, periodo: string): Promise<Record<string, any>[]> {
    return this.fetchAllPages((limit, offset) => this.getCompras(rut, periodo, limit, offset));
  }

  async getAllVentas(rut: string, periodo: string): Promise<Record<string, any>[]> {
    return this.fetchAllPages((limit, offset) => this.getVentas(rut, periodo, limit, offset));
  }

  async getResumen(rut: string, periodo: string): Promise<SiiApiResumen> {
    return this.request<SiiApiResumen>('GET', `/api/v1/${rut}/resumen/${periodo}`);
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

  async waitForSync(rut: string, timeoutMs = 300_000): Promise<SiiApiSyncStatus> {
    const start = Date.now();
    let delay = 3_000;

    while (Date.now() - start < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const status = await this.getSyncStatus(rut);

      const hasLogs = status.logs.length > 0;
      if (hasLogs) {
        const allDone = status.logs.every(
          l => l.status === 'ok' || l.status === 'error' || l.status === 'completed',
        );
        if (allDone) return status;
      }

      delay = Math.min(delay * 1.5, 15_000);
    }

    return this.getSyncStatus(rut);
  }
}

export const siiApiClient = new SiiApiClient(env.SII_API_URL, env.SII_API_KEY);
