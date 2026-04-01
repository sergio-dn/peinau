import { db } from '../../config/database.js';
import { companies, siiSyncLogs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { invoiceService } from '../invoices/invoice.service.js';
import { decrypt } from '../../lib/encryption.js';
import { siiApiClient, mapApiInvoiceToUpsert } from '../../lib/sii-api-client.js';

const SYNC_START_PERIOD = '202601';

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

      // 1. Register company on external API (idempotent)
      try {
        await siiApiClient.registerCompany(company.rut, password, company.razonSocial || undefined);
        console.log(`[SII Sync] Company registered on external API`);
      } catch (err: any) {
        // 409 or similar = already registered, that's fine
        if (err.statusCode !== 409 && err.statusCode !== 422) {
          throw err;
        }
        console.log(`[SII Sync] Company already registered on external API`);
      }

      // 2. Build period range
      const now = new Date();
      const hasta = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 3. Trigger sync on external API
      console.log(`[SII Sync] Triggering external sync from ${SYNC_START_PERIOD} to ${hasta}`);
      await siiApiClient.triggerSync(company.rut, password, SYNC_START_PERIOD, hasta);

      // 4. Wait for sync to complete
      console.log(`[SII Sync] Waiting for external sync to complete...`);
      const syncStatus = await siiApiClient.waitForSync(company.rut);
      console.log(`[SII Sync] External sync finished. Logs: ${syncStatus.logs.length}`);

      // 5. Get available periods
      const periodos = await siiApiClient.getPeriodos(company.rut);
      const relevantPeriodos = periodos.filter(p => p.codigo >= SYNC_START_PERIOD);
      console.log(`[SII Sync] Found ${relevantPeriodos.length} periods from ${SYNC_START_PERIOD}`);

      // 6. Fetch and upsert compras from each period
      let totalFound = 0;
      let newCount = 0;

      for (const periodo of relevantPeriodos) {
        try {
          const compras = await siiApiClient.getAllCompras(company.rut, periodo.codigo);
          totalFound += compras.length;

          for (const item of compras) {
            try {
              const data = mapApiInvoiceToUpsert(item);
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
