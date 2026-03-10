import IORedis from 'ioredis';
import { env } from './env.js';

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return _redis;
}

// Backwards compat – lazy getter
export const redis = new Proxy({} as IORedis, {
  get(_target, prop) {
    return (getRedis() as any)[prop];
  },
});
