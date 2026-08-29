import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

function redisClientOptions(url: string): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  };
  if (url.startsWith('rediss://')) {
    options.tls = {};
  }
  return options;
}

export const redis = new Redis(env.REDIS_URL, redisClientOptions(env.REDIS_URL));

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
