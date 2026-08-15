import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { getIo } from '../sockets/io.js';

export type RealtimeEvent = {
  room: string;
  event: string;
  payload: unknown;
};

const CHANNEL = 'codesentinel:realtime';

let subscriber: Redis | null = null;

export async function startRealtimeBridge(): Promise<void> {
  subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  await subscriber.connect();
  await subscriber.subscribe(CHANNEL);
  subscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return;
    try {
      const parsed = JSON.parse(message) as RealtimeEvent;
      getIo()?.to(parsed.room).emit(parsed.event, parsed.payload);
      logger.debug('realtime bridge emit', { room: parsed.room, event: parsed.event });
    } catch (err) {
      logger.warn('realtime bridge parse failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
  logger.info('realtime redis bridge subscribed', { channel: CHANNEL });
}

export async function publishRealtime(event: RealtimeEvent, publisher: Redis): Promise<void> {
  await publisher.publish(CHANNEL, JSON.stringify(event));
}
