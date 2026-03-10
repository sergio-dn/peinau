/**
 * Registro de Compras y Ventas (RCV) Query Module
 *
 * Queries the SII Registro de Compras to get received DTEs.
 *
 * Endpoint: POST https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getDetalleCompra
 *
 * Requires TOKEN cookie from authenticated SII session.
 * Request body is JSON with metaData (conversationId = TOKEN) and data params.
 */

import type { SiiAuth } from './auth.js';
import type { RpetcQuery, RpetcEntry } from './types.js';

const RCV_BASE_URL = 'https://www4.sii.cl/consdcvinternetui/services/data/facadeService';

export class RpetcClient {
  constructor(private auth: SiiAuth) {}

  // Common DTE types for purchases
  private static readonly DTE_TYPES = [33, 34, 46, 56, 61];

  /**
   * Query the Registro de Compras for received DTEs in a period
   */
  async queryReceivedDtes(query: RpetcQuery): Promise<RpetcEntry[]> {
    const session = await this.auth.getSession();
    const client = this.auth.getClient();

    // RUT receptor: strip dots, split rut-dv
    const rutClean = query.rutReceptor.replace(/\./g, '');
    const rutRaw = rutClean.replace(/[^0-9kK]/g, '');
    const rutBody = rutRaw.slice(0, -1);
    const dv = rutRaw.slice(-1).toUpperCase();

    // Period format: YYYYMM (no separator)
    const periodo = query.periodoDesde.replace(/-/g, '');

    // Build cookie string with both TOKEN and CSESSIONID
    const fullCookieStr = `TOKEN=${session.token}; CSESSIONID=${session.token}`;

    const estados = ['REGISTRO', 'PENDIENTE', 'NO_INCLUIR', 'RECLAMADO'];
    const allEntries: RpetcEntry[] = [];
    const seen = new Set<string>();

    for (const tipoDte of RpetcClient.DTE_TYPES) {
      for (const estado of estados) {
        try {
          const entries = await this.queryRcvWithEstado(
            client, session.token, fullCookieStr,
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

  private async queryRcvWithEstado(
    client: any,
    token: string,
    cookieStr: string,
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

      console.log(`[RPETC] Querying COMPRA RUT ${rutBody}-${dv}, period ${periodo}, tipo=${codTipoDoc}, estado=${estadoContab}`);

      const response = await client.post(
        `${RCV_BASE_URL}/getDetalleCompra`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json, text/plain, */*',
            'Cookie': cookieStr,
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
