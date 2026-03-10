/**
 * SiiDocumentsService — Unified facade for SII document retrieval.
 *
 * The API layer should consume this service instead of using portal/official
 * clients directly. This ensures the rest of the app doesn't need to know
 * which connector produced the data.
 *
 * Currently only uses the portal connector (RUT/clave + RCV API).
 * When certificate-based auth is implemented, this facade will transparently
 * add the official connector as a data source.
 */

import { SiiAuth } from './auth.js';
import { RpetcClient } from './rpetc.js';
import type { SiiCredentials, NormalizedDocument, RpetcEntry } from './shared/types.js';

export class SiiDocumentsService {
  private auth: SiiAuth;
  private rpetc: RpetcClient;

  constructor(credentials: SiiCredentials) {
    this.auth = new SiiAuth(credentials);
    this.rpetc = new RpetcClient(this.auth);
  }

  /**
   * Authenticate with the SII. Must be called before fetching documents.
   */
  async authenticate(): Promise<void> {
    await this.auth.authenticate();
  }

  /**
   * Fetch received documents (compras) for a company in a date range.
   * Returns normalized documents regardless of the underlying data source.
   *
   * @param companyRut - The RUT of the receiving company
   * @param yearMonth - Period in YYYYMM format (e.g., "202603")
   */
  async fetchReceivedDocuments(
    companyRut: string,
    yearMonth: string,
  ): Promise<NormalizedDocument[]> {
    const entries = await this.rpetc.queryReceivedDtes({
      rutReceptor: companyRut,
      periodoDesde: yearMonth,
      periodoHasta: yearMonth,
    });

    return entries.map(entry => this.normalizeEntry(companyRut, entry));
  }

  /**
   * Fetch received documents for a specific month.
   */
  async fetchMonthlyDocuments(
    companyRut: string,
    year: number,
    month: number,
  ): Promise<NormalizedDocument[]> {
    const yearMonth = `${year}${String(month).padStart(2, '0')}`;
    return this.fetchReceivedDocuments(companyRut, yearMonth);
  }

  /**
   * Get the underlying auth instance (for debug endpoints or DTE download).
   */
  getAuth(): SiiAuth {
    return this.auth;
  }

  /**
   * Get the underlying RCV client (for debug endpoints).
   */
  getRpetcClient(): RpetcClient {
    return this.rpetc;
  }

  /**
   * Normalize an RpetcEntry into the stable NormalizedDocument contract.
   */
  private normalizeEntry(companyRut: string, entry: RpetcEntry): NormalizedDocument {
    const cleanCompanyRut = companyRut.replace(/\./g, '');
    return {
      externalId: `sii:${cleanCompanyRut}:${entry.tipoDte}:${entry.folio}:${entry.rutEmisor}`,
      source: 'portal',
      sourceMode: 'rcv_detalle',
      documentType: entry.tipoDte,
      folio: entry.folio,
      issuerRut: entry.rutEmisor,
      issuerName: entry.razonSocialEmisor,
      issuedAt: entry.fechaEmision,
      receivedAt: entry.fechaRecepcion,
      exemptAmount: entry.montoExento,
      netAmount: entry.montoNeto,
      vatAmount: entry.montoIva,
      totalAmount: entry.montoTotal,
      status: entry.estado,
    };
  }
}
