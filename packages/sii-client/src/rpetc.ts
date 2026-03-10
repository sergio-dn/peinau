/**
 * Registro de Compras y Ventas (RCV) Query Module
 *
 * Queries the SII Registro de Compras to get received DTEs.
 *
 * Endpoint: POST https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getDetalleCompra
 *
 * Requires TOKEN cookie from authenticated SII session.
 * Uses tough-cookie CookieJar to share cookies between session init and API calls.
 */

import axios, { AxiosInstance } from 'axios';
import { CookieJar, Cookie } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import type { SiiAuth } from './auth.js';
import type { RpetcQuery, RpetcEntry } from './types.js';

const RCV_BASE_URL = 'https://www4.sii.cl/consdcvinternetui/services/data/facadeService';
const RCV_PAGE_URL = 'https://www4.sii.cl/consdcvinternetui/';
const RCV_DOMAIN = 'https://www4.sii.cl';

export class RpetcClient {
  private rcvClient: AxiosInstance | null = null;
  private jar: CookieJar | null = null;
  private initialized = false;

  constructor(private auth: SiiAuth) {}

  // Common DTE types for purchases
  private static readonly DTE_TYPES = [33, 34, 43, 46, 56, 61];

  /**
   * Create an axios instance with a shared CookieJar.
   * Injects all auth cookies into the jar so they're sent with every request.
   */
  private async createClientWithJar(): Promise<{ client: AxiosInstance; token: string }> {
    const session = await this.auth.getSession();
    const jar = new CookieJar();

    // Inject all auth cookies into the jar for www4.sii.cl domain
    for (const cookieStr of session.cookies) {
      try {
        // cookieStr is "NAME=VALUE" — we need to add domain/path for tough-cookie
        const [name, ...valueParts] = cookieStr.split('=');
        const value = valueParts.join('=');
        const cookie = new Cookie({
          key: name.trim(),
          value: value,
          domain: 'sii.cl',
          path: '/',
        });
        await jar.setCookie(cookie.toString(), RCV_DOMAIN);
      } catch (err) {
        console.warn(`[RPETC] Failed to set cookie in jar: ${cookieStr.split('=')[0]} - ${(err as Error).message}`);
      }
    }

    // Log what we injected
    const jarCookies = await jar.getCookies(RCV_DOMAIN);
    console.log(`[RPETC] Cookie jar initialized with ${jarCookies.length} cookies: ${jarCookies.map(c => c.key).join(', ')}`);

    const client = wrapper(axios.create({
      jar,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-CL,es;q=0.9',
        'Origin': 'https://www4.sii.cl',
        'Referer': 'https://www4.sii.cl/consdcvinternetui/',
      },
    }));

    this.jar = jar;
    this.rcvClient = client;
    return { client, token: session.token };
  }

  /**
   * Initialize RCV session by visiting the page.
   * This sets server-side state and additional cookies (stored in the jar automatically).
   */
  private async initSession(): Promise<void> {
    if (this.initialized && this.rcvClient) return;

    const { client } = await this.createClientWithJar();

    try {
      console.log('[RPETC] Initializing RCV session (GET page)...');
      await client.get(RCV_PAGE_URL, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        validateStatus: () => true,
        maxRedirects: 5,
      });

      // Log cookies after session init
      const postInitCookies = await this.jar!.getCookies(RCV_DOMAIN);
      console.log(`[RPETC] After session init: ${postInitCookies.length} cookies: ${postInitCookies.map(c => c.key).join(', ')}`);

      this.initialized = true;
      console.log('[RPETC] RCV session initialized');
    } catch (err) {
      console.warn(`[RPETC] RCV session init failed: ${(err as Error).message}`);
    }
  }

  /**
   * Ensure we have an initialized client with cookie jar
   */
  private async getClient(): Promise<{ client: AxiosInstance; token: string }> {
    await this.initSession();
    const session = await this.auth.getSession();
    return { client: this.rcvClient!, token: session.token };
  }

  /**
   * Query the Registro de Compras for received DTEs in a period.
   * First calls getResumen to discover which DTE types have documents,
   * then queries detalle only for types that exist.
   */
  async queryReceivedDtes(query: RpetcQuery): Promise<RpetcEntry[]> {
    const { client, token } = await this.getClient();

    // RUT receptor: strip dots, split rut-dv
    const rutClean = query.rutReceptor.replace(/\./g, '');
    const rutRaw = rutClean.replace(/[^0-9kK]/g, '');
    const rutBody = rutRaw.slice(0, -1);
    const dv = rutRaw.slice(-1).toUpperCase();

    // Period format: YYYYMM (no separator)
    const periodo = query.periodoDesde.replace(/-/g, '');

    // Step 1: Get resumen to know which types have documents
    let typesToQuery = RpetcClient.DTE_TYPES;
    try {
      const resumenResult = await this.callGetResumen(client, token, rutBody, dv, periodo);
      if (resumenResult && Array.isArray(resumenResult.data)) {
        const typesWithDocs = resumenResult.data
          .filter((item: any) => (item.rsmnTotDoc || 0) > 0)
          .map((item: any) => parseInt(item.rsmnTipoDocInteger || item.rsmnTipoDoc || '0'))
          .filter((t: number) => t > 0);
        if (typesWithDocs.length > 0) {
          typesToQuery = typesWithDocs;
          console.log(`[RPETC] Resumen found documents for types: ${typesWithDocs.join(', ')}`);
        }
      }
    } catch (err) {
      console.warn(`[RPETC] getResumen failed, querying all types: ${(err as Error).message}`);
    }

    const estados = ['REGISTRO', 'PENDIENTE', 'NO_INCLUIR', 'RECLAMADO'];
    const allEntries: RpetcEntry[] = [];
    const seen = new Set<string>();

    for (const tipoDte of typesToQuery) {
      for (const estado of estados) {
        try {
          const entries = await this.queryRcvWithEstado(
            client, token,
            rutBody, dv, periodo, estado, tipoDte
          );
          for (const entry of entries) {
            const key = `${entry.tipoDte}-${entry.folio}`;
            if (!seen.has(key)) {
              seen.add(key);
              allEntries.push(entry);
            }
          }
          if (entries.length > 0) {
            console.log(`[RPETC] Found ${entries.length} entries tipo=${tipoDte} estado=${estado} period=${periodo}`);
          }
        } catch (err) {
          console.warn(`[RPETC] Error tipo=${tipoDte} estado=${estado}: ${(err as Error).message}`);
        }
      }
    }

    return allEntries;
  }

  private async callGetResumen(
    client: AxiosInstance,
    token: string,
    rutBody: string,
    dv: string,
    periodo: string,
  ): Promise<any> {
    const requestBody = {
      metaData: {
        conversationId: token,
        namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getResumen',
        page: null,
        transactionId: '0',
      },
      data: {
        rutEmisor: rutBody,
        dvEmisor: dv,
        ptributario: periodo,
        operacion: 'COMPRA',
        accionRecaptcha: 'RCV_DDETC',
        tokenRecaptcha: 'c3',
      },
    };

    const resp = await client.post(
      `${RCV_BASE_URL}/getResumen`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json, text/plain, */*',
        },
        validateStatus: () => true,
      },
    );
    return resp.data;
  }

  private async queryRcvWithEstado(
    client: AxiosInstance,
    token: string,
    rutBody: string,
    dv: string,
    periodo: string,
    estadoContab: string,
    codTipoDoc: number = 33,
  ): Promise<RpetcEntry[]> {
    try {
      const requestBody = {
        metaData: {
          conversationId: token,
          namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getDetalleCompra',
          page: null,
          transactionId: '0',
        },
        data: {
          rutEmisor: rutBody,
          dvEmisor: dv,
          ptributario: periodo,
          estadoContab,
          codTipoDoc,
          operacion: 'COMPRA',
          accionRecaptcha: 'RCV_DDETC',
          tokenRecaptcha: 'c3',
        },
      };

      const response = await client.post(
        `${RCV_BASE_URL}/getDetalleCompra`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json, text/plain, */*',
          },
          validateStatus: () => true,
        }
      );

      const data = response.data;

      if (response.status !== 200 || !data) return [];

      // Check for API errors
      if (data.metaData?.errors?.length > 0) {
        console.log(`[RPETC] API error [tipo=${codTipoDoc} estado=${estadoContab}]: ${data.metaData.errors[0].descripcion}`);
        return [];
      }

      const items = data.data;
      if (!items || !Array.isArray(items)) return [];

      console.log(`[RPETC] Got ${items.length} items for tipo=${codTipoDoc} estado=${estadoContab}`);
      return this.parseRcvResponse(items);
    } catch (error) {
      throw new RpetcError(`Failed to query RCV: ${(error as Error).message}`);
    }
  }

  /**
   * Raw query for debugging - returns the full API response
   */
  async rawQuery(
    periodo: string,
    estadoContab: string,
    codTipoDoc: number,
  ): Promise<{ status: number; data: any }> {
    const { client, token } = await this.getClient();

    const requestBody = {
      metaData: {
        conversationId: token,
        namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getDetalleCompra',
        page: null,
        transactionId: '0',
      },
      data: {
        rutEmisor: '',
        dvEmisor: '',
        ptributario: periodo,
        estadoContab,
        codTipoDoc,
        operacion: 'COMPRA',
        accionRecaptcha: 'RCV_DDETC',
        tokenRecaptcha: 'c3',
      },
    };

    const resp = await client.post(
      `${RCV_BASE_URL}/getDetalleCompra`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json, text/plain, */*',
        },
        validateStatus: () => true,
      },
    );
    return { status: resp.status, data: resp.data };
  }

  /**
   * Raw getResumen for debugging
   */
  async rawResumen(
    rutBody: string,
    dv: string,
    periodo: string,
  ): Promise<{ status: number; data: any }> {
    const { client, token } = await this.getClient();

    const resp = await this.callGetResumen(client, token, rutBody, dv, periodo);
    return { status: 200, data: resp };
  }

  /**
   * Raw detalle query for debugging
   */
  async rawDetalle(
    rutBody: string,
    dv: string,
    periodo: string,
    estadoContab: string,
    codTipoDoc: number,
  ): Promise<{ status: number; count: number; error: string | null; sample: any[] | null; rawKeys: string[] }> {
    const { client, token } = await this.getClient();

    const requestBody = {
      metaData: {
        conversationId: token,
        namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getDetalleCompra',
        page: null,
        transactionId: '0',
      },
      data: {
        rutEmisor: rutBody,
        dvEmisor: dv,
        ptributario: periodo,
        estadoContab,
        codTipoDoc,
        operacion: 'COMPRA',
        accionRecaptcha: 'RCV_DDETC',
        tokenRecaptcha: 'c3',
      },
    };

    const resp = await client.post(
      `${RCV_BASE_URL}/getDetalleCompra`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json, text/plain, */*',
        },
        validateStatus: () => true,
      },
    );

    const dataArr = Array.isArray(resp.data?.data) ? resp.data.data : [];
    const error = resp.data?.metaData?.errors?.[0]?.descripcion || null;
    const rawKeys = dataArr.length > 0 ? Object.keys(dataArr[0]) : [];
    return {
      status: resp.status,
      count: dataArr.length,
      error,
      sample: dataArr.slice(0, 2),
      rawKeys,
    };
  }

  /**
   * Get received DTEs for a specific month
   */
  async getMonthlyDtes(rutReceptor: string, year: number, month: number): Promise<RpetcEntry[]> {
    const periodo = `${year}${String(month).padStart(2, '0')}`;
    return this.queryReceivedDtes({
      rutReceptor,
      periodoDesde: periodo,
      periodoHasta: periodo,
    });
  }

  /**
   * Get received DTEs for current month
   */
  async getCurrentMonthDtes(rutReceptor: string): Promise<RpetcEntry[]> {
    const now = new Date();
    return this.getMonthlyDtes(rutReceptor, now.getFullYear(), now.getMonth() + 1);
  }

  private parseRcvResponse(data: any[]): RpetcEntry[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      tipoDte: parseInt(item.dhdrTipoDte || item.detTipoDte || item.tipo_dte || '0'),
      folio: parseInt(item.detNroDoc || item.detFolio || item.folio || '0'),
      fechaEmision: item.detFchDoc || item.fecha_emision || '',
      rutEmisor: this.formatRut(item.detRutDoc, item.detDvDoc),
      razonSocialEmisor: item.detRznSoc || item.razon_social || '',
      montoExento: parseInt(item.detMntExe || '0'),
      montoNeto: parseInt(item.detMntNeto || item.monto_neto || '0'),
      montoIva: parseInt(item.detMntIVA || item.monto_iva || '0'),
      montoTotal: parseInt(item.detMntTotal || item.monto_total || '0'),
      fechaRecepcion: item.detFchRecep || item.fecha_recepcion || '',
      estado: item.detEstado || item.estado || '',
    }));
  }

  private formatRut(rut?: string, dv?: string): string {
    if (!rut || !dv) return '';
    return `${rut}-${dv}`;
  }
}

export class RpetcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpetcError';
  }
}
