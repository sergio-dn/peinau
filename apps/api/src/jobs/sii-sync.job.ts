import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { siiSyncService } from '../modules/sii-sync/sii-sync.service.js';
import { db } from '../config/database.js';
import { companies } from '../db/schema.js';

const QUEUE_NAME = 'sii-sync';

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedis() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _queue;
}

export { getQueue as siiSyncQueue };

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
      connection: getRedis() as any,
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
  const allCompanies = await db.select({ id: companies.id })
    .from(companies);

  const queue = getQueue();
  for (const company of allCompanies) {
    await queue.add(
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
