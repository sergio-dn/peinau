import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { siiSyncService } from '../modules/sii-sync/sii-sync.service.js';
import { db } from '../config/database.js';
import { companies } from '../db/schema.js';

const QUEUE_NAME = 'sii-sync';

export const siiSyncQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export function startSiiSyncWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { companyId } = job.data;
      console.log(`[SII Sync] Starting sync for company ${companyId}`);
      const result = await siiSyncService.syncCompany(companyId);
      console.log(`[SII Sync] Completed: ${result.invoicesNew} new invoices`);
      return result;
    },
    {
      connection: redis as any,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[SII Sync] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * Schedule recurring SII sync for all active companies
 */
export async function scheduleSiiSync() {
  // Sync every 4 hours
  const allCompanies = await db.select({ id: companies.id })
    .from(companies);

  for (const company of allCompanies) {
    await siiSyncQueue.add(
      'sync',
      { companyId: company.id },
      {
        repeat: {
          pattern: '0 7 * * *', // Daily at 7:00 AM
        },
        jobId: `sii-sync-${company.id}`,
      }
    );
  }
}
