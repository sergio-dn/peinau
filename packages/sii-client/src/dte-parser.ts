/**
 * DTE XML Parser
 *
 * Parses SII DTE XML documents into structured TypeScript objects.
 *
 * DTE XML Structure (simplified):
 * <DTE>
 *   <Documento>
 *     <Encabezado>
 *       <IdDoc>
 *         <TipoDTE>33</TipoDTE>
 *         <Folio>12345</Folio>
 *         <FchEmis>2024-01-15</FchEmis>
 *       </IdDoc>
 *       <Emisor>
 *         <RUTEmisor>76123456-K</RUTEmisor>
 *         <RznSoc>Proveedor SpA</RznSoc>
 *         <GiroEmis>Servicios</GiroEmis>
 *         <DirOrigen>Av Principal 123</DirOrigen>
 *       </Emisor>
 *       <Receptor>
 *         <RUTRecep>77654321-0</RUTRecep>
 *         <RznSocRecep>Wild Lama SpA</RznSocRecep>
 *       </Receptor>
 *       <Totales>
 *         <MntNeto>100000</MntNeto>
 *         <MntExe>0</MntExe>
 *         <TasaIVA>19</TasaIVA>
 *         <IVA>19000</IVA>
 *         <MntTotal>119000</MntTotal>
 *       </Totales>
 *     </Encabezado>
 *     <Detalle>                    <!-- Can be array or single -->
 *       <NroLinDet>1</NroLinDet>
 *       <NmbItem>Servicio consultoría</NmbItem>
 *       <DscItem>Descripción del servicio</DscItem>
 *       <QtyItem>1</QtyItem>
 *       <UnmdItem>UN</UnmdItem>
 *       <PrcItem>100000</PrcItem>
 *       <MontoItem>100000</MontoItem>
 *     </Detalle>
 *   </Documento>
 * </DTE>
 */

import { XMLParser } from 'fast-xml-parser';
import type { DteDocument, DteDetalleLine } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // Detalle can be a single item or array
    return name === 'Detalle';
  },
  parseTagValue: true,
  trimValues: true,
});

export class DteParser {
  /**
   * Parse a DTE XML string into a structured DteDocument
   */
  parse(xml: string): DteDocument {
    try {
      const parsed = parser.parse(xml);

      // Handle different XML wrappers (EnvioDTE, DTE, etc.)
      const documento = this.extractDocumento(parsed);
      if (!documento) {
        throw new DteParseError('Could not find Documento element in XML');
      }

      const encabezado = documento.Encabezado;
      if (!encabezado) {
        throw new DteParseError('Missing Encabezado in DTE XML');
      }

      const idDoc = encabezado.IdDoc || {};
      const emisor = encabezado.Emisor || {};
      const receptor = encabezado.Receptor || {};
      const totales = encabezado.Totales || {};

      const detalle = this.parseDetalle(documento.Detalle);

      return {
        tipoDte: parseInt(String(idDoc.TipoDTE || '0')),
        folio: parseInt(String(idDoc.Folio || '0')),
        fechaEmision: String(idDoc.FchEmis || ''),
        rutEmisor: String(emisor.RUTEmisor || ''),
        razonSocialEmisor: String(emisor.RznSoc || ''),
        giroEmisor: String(emisor.GiroEmis || ''),
        direccionEmisor: String(emisor.DirOrigen || ''),
        rutReceptor: String(receptor.RUTRecep || ''),
        razonSocialReceptor: String(receptor.RznSocRecep || ''),
        montoExento: parseInt(String(totales.MntExe || '0')),
        montoNeto: parseInt(String(totales.MntNeto || '0')),
        montoIva: parseInt(String(totales.IVA || '0')),
        tasaIva: parseFloat(String(totales.TasaIVA || '19')),
        montoTotal: parseInt(String(totales.MntTotal || '0')),
        detalle,
        xmlRaw: xml,
      };
    } catch (error) {
      if (error instanceof DteParseError) throw error;
      throw new DteParseError(`Failed to parse DTE XML: ${(error as Error).message}`);
    }
  }

  /**
   * Parse multiple DTEs from an EnvioDTE XML
   */
  parseEnvioDte(xml: string): DteDocument[] {
    const parsed = parser.parse(xml);
    const envio = parsed.EnvioDTE || parsed;
    const setDte = envio.SetDTE || {};
    const dtes = Array.isArray(setDte.DTE) ? setDte.DTE : setDte.DTE ? [setDte.DTE] : [];

    return dtes.map((dte: any) => {
      const doc = dte.Documento || dte;
      return this.parseFromDocumento(doc, xml);
    });
  }

  private extractDocumento(parsed: any): any {
    // Try different XML wrapper structures
    if (parsed.DTE?.Documento) return parsed.DTE.Documento;
    if (parsed.Documento) return parsed.Documento;
    if (parsed.EnvioDTE?.SetDTE?.DTE?.Documento) return parsed.EnvioDTE.SetDTE.DTE.Documento;

    // Try to find Documento recursively in first level
    for (const key of Object.keys(parsed)) {
      if (parsed[key]?.Documento) return parsed[key].Documento;
      if (parsed[key]?.DTE?.Documento) return parsed[key].DTE.Documento;
    }

    return null;
  }

  private parseFromDocumento(documento: any, xml: string): DteDocument {
    const encabezado = documento.Encabezado || {};
    const idDoc = encabezado.IdDoc || {};
    const emisor = encabezado.Emisor || {};
    const receptor = encabezado.Receptor || {};
    const totales = encabezado.Totales || {};

    return {
      tipoDte: parseInt(String(idDoc.TipoDTE || '0')),
      folio: parseInt(String(idDoc.Folio || '0')),
      fechaEmision: String(idDoc.FchEmis || ''),
      rutEmisor: String(emisor.RUTEmisor || ''),
      razonSocialEmisor: String(emisor.RznSoc || ''),
      giroEmisor: String(emisor.GiroEmis || ''),
      direccionEmisor: String(emisor.DirOrigen || ''),
      rutReceptor: String(receptor.RUTRecep || ''),
      razonSocialReceptor: String(receptor.RznSocRecep || ''),
      montoExento: parseInt(String(totales.MntExe || '0')),
      montoNeto: parseInt(String(totales.MntNeto || '0')),
      montoIva: parseInt(String(totales.IVA || '0')),
      tasaIva: parseFloat(String(totales.TasaIVA || '19')),
      montoTotal: parseInt(String(totales.MntTotal || '0')),
      detalle: this.parseDetalle(documento.Detalle),
      xmlRaw: xml,
    };
  }

  private parseDetalle(detalle: any): DteDetalleLine[] {
    if (!detalle) return [];
    const items = Array.isArray(detalle) ? detalle : [detalle];

    return items.map((item: any) => ({
      nroLinDet: parseInt(String(item.NroLinDet || '0')),
      nombreItem: String(item.NmbItem || ''),
      descripcion: item.DscItem ? String(item.DscItem) : undefined,
      cantidad: item.QtyItem ? parseFloat(String(item.QtyItem)) : undefined,
      unidadMedida: item.UnmdItem ? String(item.UnmdItem) : undefined,
      precioUnitario: item.PrcItem ? parseInt(String(item.PrcItem)) : undefined,
      descuentoPct: item.DescuentoPct ? parseFloat(String(item.DescuentoPct)) : undefined,
      montoItem: parseInt(String(item.MontoItem || '0')),
      indicadorExencion: item.IndExe ? parseInt(String(item.IndExe)) : undefined,
    }));
  }
}

export class DteParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DteParseError';
  }
}
