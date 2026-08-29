import { Redis, type RedisOptions } from 'ioredis';
import { SOCKET_EVENTS } from '@codesentinel/shared';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const CHANNEL = 'codesentinel:realtime';

function redisClientOptions(url: string): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
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
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
  logger.info('worker redis connected', { status: redis.status });
}

export async function emitRealtime(room: string, event: string, payload: unknown): Promise<void> {
  await redis.publish(CHANNEL, JSON.stringify({ room, event, payload }));
  logger.debug('worker published realtime', { room, event });
}

export { SOCKET_EVENTS };
