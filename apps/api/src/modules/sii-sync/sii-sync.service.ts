import { db } from '../../config/database.js';
import { companies, siiSyncLogs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { invoiceService } from '../invoices/invoice.service.js';
import { decrypt } from '../../lib/encryption.js';
import { siiApiClient, mapApiInvoiceToUpsert } from '../../lib/sii-api-client.js';

function getCurrentAndPreviousPeriods(): { desde: string; hasta: string; periodos: string[] } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  const hasta = `${year}${String(month).padStart(2, '0')}`;

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  const desde = `${prevYear}${String(prevMonth).padStart(2, '0')}`;

  return { desde, hasta, periodos: [desde, hasta] };
}

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

      console.log(`[SII Sync] Company RUT: ${company.rut}, SII User: ${company.siiUsername}`);

      // Only sync current month + previous month
      const { desde, hasta, periodos: targetPeriodos } = getCurrentAndPreviousPeriods();

      // 1. Trigger sync on external API
      console.log(`[SII Sync] Triggering external sync from ${desde} to ${hasta}`);
      await siiApiClient.triggerSync(password, desde, hasta);

      // 2. Wait for sync to complete
      console.log(`[SII Sync] Waiting for external sync to complete...`);
      const syncStatus = await siiApiClient.waitForSync();
      console.log(`[SII Sync] External sync finished. Logs: ${syncStatus.logs.length}`);

      // 3. Get available periods, filter to target months only
      const periodos = await siiApiClient.getPeriodos();
      const relevantPeriodos = periodos.filter(p => targetPeriodos.includes(p.codigo));
      console.log(`[SII Sync] Fetching ${relevantPeriodos.length} periods: ${targetPeriodos.join(', ')}`);

      // 4. Fetch and upsert compras from each period
      let totalFound = 0;
      let newCount = 0;

      for (const periodo of relevantPeriodos) {
        try {
          const compras = await siiApiClient.getAllCompras(periodo.codigo);
          totalFound += compras.length;

          for (const item of compras) {
            try {
              const data = mapApiInvoiceToUpsert(item);
              if (!data) continue; // skip corrupted entries (tipo_doc=0 or folio=0)
              const result = await invoiceService.upsertFromSii(companyId, data);
              if (result.isNew) newCount++;
            } catch (err) {
              console.error(`[SII Sync] Error upserting invoice from period ${periodo.codigo}:`, err);
            }
          }

          if (compras.length > 0) {
            console.log(`[SII Sync] Period ${periodo.codigo}: ${compras.length} documents`);
          }
        } catch (err) {
          console.warn(`[SII Sync] Error fetching compras for ${periodo.codigo}:`, (err as Error).message);
        }
      }

      await db.update(siiSyncLogs)
        .set({
          finishedAt: new Date(),
          status: 'success',
          invoicesFound: totalFound,
          invoicesNew: newCount,
        })
        .where(eq(siiSyncLogs.id, syncLog.id));

      return { invoicesFound: totalFound, invoicesNew: newCount };
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
