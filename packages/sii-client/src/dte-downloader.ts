/**
 * DTE XML Downloader
 *
 * Downloads the full XML of a DTE document from the SII.
 * The XML contains the complete invoice data including line items.
 *
 * Endpoints used:
 * - https://palena.sii.cl/cgi_dte/UPL/DTEConsultaRV (for production)
 * - Alternative: direct XML download via the SII portal
 */

import type { SiiAuth } from './auth.js';

const DTE_DOWNLOAD_URL = 'https://www4.sii.cl/registrocompaboraborUI/services/data/facadeService/getDteXML';

export class DteDownloader {
  constructor(private auth: SiiAuth) {}

  /**
   * Download the XML of a specific DTE
   */
  async downloadDteXml(params: {
    rutEmisor: string;
    tipoDte: number;
    folio: number;
    rutReceptor: string;
  }): Promise<string> {
    const session = await this.auth.getSession();
    const client = this.auth.getClient();

    const rutEmisorClean = params.rutEmisor.replace(/\./g, '').replace('-', '');
    const rutReceptorClean = params.rutReceptor.replace(/\./g, '').replace('-', '');

    try {
      const response = await client.get(DTE_DOWNLOAD_URL, {
        params: {
          rutEmisor: rutEmisorClean.slice(0, -1),
          dvEmisor: rutEmisorClean.slice(-1),
          tipoDte: params.tipoDte,
          folio: params.folio,
          rutReceptor: rutReceptorClean.slice(0, -1),
          dvReceptor: rutReceptorClean.slice(-1),
        },
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Cookie': session.cookies.join('; '),
        },
        responseType: 'text',
      });

      return response.data;
    } catch (error) {
      throw new DteDownloadError(
        `Failed to download DTE XML (${params.tipoDte}-${params.folio}): ${(error as Error).message}`
      );
    }
  }
}

export class DteDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DteDownloadError';
  }
}
