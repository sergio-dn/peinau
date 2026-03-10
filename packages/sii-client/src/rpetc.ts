/**
 * RPETC (Registro de Compras) Query Module
 *
 * Queries the SII Registro de Compras (Purchase Registry) to get
 * a list of all DTEs (electronic tax documents) received by the company.
 *
 * The RPETC endpoint is at:
 * https://www4.sii.cl/registrocompaboraborUI/services/data/facadeService/getDetalleRPTCE
 *
 * It returns JSON with the list of received DTEs including:
 * - Document type (tipo_dte)
 * - Folio number
 * - Issuer RUT and name
 * - Amounts (neto, exento, iva, total)
 * - Reception date
 * - Status
 */

import type { SiiAuth } from './auth.js';
import type { RpetcQuery, RpetcEntry } from './types.js';

const RPETC_BASE_URL = 'https://www4.sii.cl/registrocompaboraborUI/services/data/facadeService';

export class RpetcClient {
  constructor(private auth: SiiAuth) {}

  /**
   * Query the Registro de Compras for received DTEs in a period
   */
  async queryReceivedDtes(query: RpetcQuery): Promise<RpetcEntry[]> {
    const session = await this.auth.getSession();
    const client = this.auth.getClient();

    const rutClean = query.rutReceptor.replace(/\./g, '').replace('-', '');
    const rutBody = rutClean.slice(0, -1);
    const dv = rutClean.slice(-1);

    try {
      // Get the RPETC data - the SII returns JSON for this endpoint
      const response = await client.get(
        `${RPETC_BASE_URL}/getDetalleRPTCE`,
        {
          params: {
            rutEmpresa: rutBody,
            dvEmpresa: dv,
            periodoDesde: query.periodoDesde,
            periodoHasta: query.periodoHasta,
            estado: query.estado || 'REGISTRO',
          },
          headers: {
            'Accept': 'application/json',
            'Cookie': session.cookies.join('; '),
          },
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return [];
      }

      return this.parseRpetcResponse(data.data);
    } catch (error) {
      throw new RpetcError(`Failed to query RPETC: ${(error as Error).message}`);
    }
  }

  /**
   * Get received DTEs for a specific month
   */
  async getMonthlyDtes(rutReceptor: string, year: number, month: number): Promise<RpetcEntry[]> {
    const periodo = `${year}-${String(month).padStart(2, '0')}`;
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

  private parseRpetcResponse(data: any[]): RpetcEntry[] {
    return data.map((item: any) => ({
      tipoDte: parseInt(item.dhdrTipoDte || item.tipo_dte || '0'),
      folio: parseInt(item.detFolio || item.folio || '0'),
      fechaEmision: item.detFchDoc || item.fecha_emision || '',
      rutEmisor: this.formatRutFromParts(item.detRutDoc, item.detDvDoc),
      razonSocialEmisor: item.detRznSoc || item.razon_social || '',
      montoExento: parseInt(item.detMntExe || '0'),
      montoNeto: parseInt(item.detMntNeto || item.monto_neto || '0'),
      montoIva: parseInt(item.detMntIVA || item.monto_iva || '0'),
      montoTotal: parseInt(item.detMntTotal || item.monto_total || '0'),
      fechaRecepcion: item.detFchRecep || item.fecha_recepcion || '',
      estado: item.detEstado || item.estado || '',
    }));
  }

  private formatRutFromParts(rut?: string, dv?: string): string {
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
