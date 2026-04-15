import { Redis } from '@upstash/redis';
import { Client as QStash } from '@upstash/qstash';
import { env } from './env.js';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const qstash = new QStash({ token: env.QSTASH_TOKEN });
