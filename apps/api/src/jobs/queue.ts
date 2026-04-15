import { qstash } from '../config/upstash.js';
import { env } from '../config/env.js';

const API_BASE_URL = env.API_BASE_URL ?? `http://localhost:${env.PORT}`;

export async function enqueueSiiSync(companyId: string, period: string) {
  await qstash.publishJSON({
    url: `${API_BASE_URL}/api/jobs/sii-sync`,
    body: { companyId, period },
    retries: 3,
  });
}

export async function enqueueRejectionAlerts() {
  await qstash.publishJSON({
    url: `${API_BASE_URL}/api/jobs/rejection-alerts`,
    body: {},
    retries: 2,
  });
}

export async function scheduleDaily(cronExpression: string, jobUrl: string) {
  // QStash schedules are managed via the Upstash console or API
  // This is a helper for reference
  console.log(`[QStash] Schedule ${jobUrl} with cron: ${cronExpression}`);
}
