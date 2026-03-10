import { SiiAuth, RpetcClient, DteDownloader, DteParser } from '@wildlama/sii-client';
import { db } from '../../config/database.js';
import { companies, siiSyncLogs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { invoiceService } from '../invoices/invoice.service.js';
import { decrypt } from '../../lib/encryption.js';

export class SiiSyncService {
  async syncCompany(companyId: string) {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company || !company.siiUsername || !company.siiPasswordEncrypted) {
      throw new Error('Company SII credentials not configured');
    }

    const [syncLog] = await db.insert(siiSyncLogs).values({
      companyId,
      startedAt: new Date(),
      status: 'running',
    }).returning();

    try {
      const password = decrypt(company.siiPasswordEncrypted);
      const auth = new SiiAuth({ rut: company.siiUsername, password });
      await auth.authenticate();

      const rpetc = new RpetcClient(auth);
      const downloader = new DteDownloader(auth);
      const parser = new DteParser();

      // Query current and previous month
      const now = new Date();
      const currentMonth = await rpetc.getMonthlyDtes(company.rut, now.getFullYear(), now.getMonth() + 1);

      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = await rpetc.getMonthlyDtes(company.rut, prevDate.getFullYear(), prevDate.getMonth() + 1);

      const allDtes = [...currentMonth, ...prevMonth];
      let newCount = 0;

      for (const dte of allDtes) {
        try {
          // Try to download full XML for line items
          let dteDoc = null;
          try {
            const xml = await downloader.downloadDteXml({
              rutEmisor: dte.rutEmisor,
              tipoDte: dte.tipoDte,
              folio: dte.folio,
              rutReceptor: company.rut,
            });
            dteDoc = parser.parse(xml);
          } catch {
            // XML download may fail for some DTEs, continue with RPETC data
          }

          const result = await invoiceService.upsertFromSii(companyId, {
            tipoDte: dte.tipoDte,
            folio: dte.folio,
            fechaEmision: dte.fechaEmision,
            fechaRecepcionSii: dte.fechaRecepcion ? new Date(dte.fechaRecepcion) : undefined,
            rutEmisor: dte.rutEmisor,
            razonSocialEmisor: dte.razonSocialEmisor,
            montoExento: dte.montoExento,
            montoNeto: dte.montoNeto,
            montoIva: dte.montoIva,
            tasaIva: 19,
            montoTotal: dte.montoTotal,
            dteXml: dteDoc?.xmlRaw,
            lines: dteDoc?.detalle?.map((d: any) => ({
              lineNumber: d.nroLinDet,
              nombreItem: d.nombreItem,
              descripcion: d.descripcion,
              cantidad: d.cantidad,
              unidadMedida: d.unidadMedida,
              precioUnitario: d.precioUnitario,
              descuentoPct: d.descuentoPct,
              montoItem: d.montoItem,
              indicadorExencion: d.indicadorExencion,
            })),
          });

          if (result.isNew) newCount++;
        } catch (err) {
          console.error(`Error processing DTE ${dte.tipoDte}-${dte.folio}:`, err);
        }
      }

      await db.update(siiSyncLogs)
        .set({
          finishedAt: new Date(),
          status: 'success',
          invoicesFound: allDtes.length,
          invoicesNew: newCount,
        })
        .where(eq(siiSyncLogs.id, syncLog.id));

      return { invoicesFound: allDtes.length, invoicesNew: newCount };
    } catch (error) {
      await db.update(siiSyncLogs)
        .set({
          finishedAt: new Date(),
          status: 'error',
          errorMessage: (error as Error).message,
        })
        .where(eq(siiSyncLogs.id, syncLog.id));

      throw error;
    }
  }
}

export const siiSyncService = new SiiSyncService();
