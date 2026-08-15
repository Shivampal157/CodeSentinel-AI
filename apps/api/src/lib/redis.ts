import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  logger.error('redis error', { message: err.message });
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready' || redis.status === 'connecting') {
    return;
  }
  await redis.connect();
  logger.info('redis connected', { status: redis.status });
}

export async function pingRedis(): Promise<number> {
  const started = Date.now();
  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error(`Unexpected Redis ping response: ${pong}`);
  }
  return Date.now() - started;
}
