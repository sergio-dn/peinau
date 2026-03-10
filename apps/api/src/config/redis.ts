import IORedis from 'ioredis';
import { env } from './env.js';

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    _redis.on('error', (err) => {
      console.warn('[Redis] Connection error (suppressed):', err.message);
    });
  }
  return _redis;
}
