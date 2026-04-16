import { db } from '../../config/database.js';
import { companies, siiSyncLogs, invoices } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { invoiceService } from '../invoices/invoice.service.js';
import { decrypt } from '../../lib/encryption.js';
import { siiApiClient, mapApiInvoiceToUpsert } from '../../lib/sii-api-client.js';

// ─── Chilean holidays (2025–2026) ────────────────────────────────────────────

const FERIADOS_CL = new Set([
  '2025-01-01','2025-04-18','2025-04-19','2025-05-01','2025-05-21',
  '2025-06-20','2025-06-29','2025-07-16','2025-08-15','2025-09-18',
  '2025-09-19','2025-10-12','2025-10-31','2025-11-01','2025-12-08','2025-12-25',
  '2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21',
  '2026-06-19','2026-06-29','2026-07-16','2026-08-15','2026-09-18',
  '2026-09-19','2026-10-12','2026-10-31','2026-11-01','2026-12-08','2026-12-25',
]);

function addBusinessDays(start: Date, days: number): Date {
  let count = 0;
  const d = new Date(start);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    const ds = d.toISOString().slice(0, 10);
    if (dow > 0 && dow < 6 && !FERIADOS_CL.has(ds)) count++;
  }
  return d;
}

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
      let updatedCount = 0;

      for (const periodo of relevantPeriodos) {
        try {
          const compras = await siiApiClient.getAllCompras(periodo.codigo);
          totalFound += compras.length;

          for (const item of compras) {
            try {
              const data = mapApiInvoiceToUpsert(item);
              if (!data) continue; // skip corrupted entries (tipo_doc=0 or folio=0)
              const result = await invoiceService.upsertFromSii(companyId, data);
              if (result.isNew) {
                newCount++;
                // Calculate sii_rejection_deadline (8 business days from reception)
                try {
                  const fechaBase = data.fechaRecepcionSii ?? new Date();
                  const deadline = addBusinessDays(fechaBase, 8);
                  await db.update(invoices)
                    .set({ siiRejectionDeadline: deadline })
                    .where(eq(invoices.id, result.invoice.id));
                } catch {
                  /* siiRejectionDeadline column may not exist yet in DB */
                }
              } else {
                updatedCount++;
              }
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
          invoicesUpdated: updatedCount,
        })
        .where(eq(siiSyncLogs.id, syncLog.id));

      // Track records fetched/created/updated if columns exist
      try {
        await db.update(siiSyncLogs).set({
          recordsFetched: totalFound,
          recordsCreated: newCount,
          recordsUpdated: updatedCount,
        } as any).where(eq(siiSyncLogs.id, syncLog.id));
      } catch { /* columns may not exist yet */ }

      return { invoicesFound: totalFound, invoicesNew: newCount, invoicesUpdated: updatedCount };
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
