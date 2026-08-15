import type { ServiceCheck, ServiceName } from '@codesentinel/shared';
import { logger } from '../lib/logger.js';
import { pingMongo } from '../lib/mongo.js';
import { pingQdrant, qdrantVersion } from '../lib/qdrant.js';
import { pingRedis } from '../lib/redis.js';

async function timed(
  name: ServiceName,
  fn: () => Promise<number>,
  extra?: () => Promise<string | undefined>,
): Promise<ServiceCheck> {
  try {
    const latencyMs = await fn();
    const detail = extra ? await extra() : undefined;
    logger.info('health check ok', { service: name, latencyMs, detail });
    return { ok: true, latencyMs, detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('health check failed', { service: name, message });
    return { ok: false, latencyMs: 0, detail: message };
  }
}

export async function collectHealth() {
  const checks = {
    mongo: await timed('mongo', pingMongo),
    redis: await timed('redis', pingRedis),
    qdrant: await timed('qdrant', pingQdrant, qdrantVersion),
  };

  const status = Object.values(checks).every((c) => c.ok) ? 'ok' : 'degraded';

  return {
    status,
    service: 'codesentinel-api',
    uptimeSec: Math.round(process.uptime()),
    checks,
  } as const;
}
