import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  checkCompatibility: false,
  ...(env.QDRANT_API_KEY ? { apiKey: env.QDRANT_API_KEY } : {}),
});

function qdrantHeaders(): Record<string, string> {
  return env.QDRANT_API_KEY ? { 'api-key': env.QDRANT_API_KEY } : {};
}

export async function connectQdrant(): Promise<void> {
  const latency = await pingQdrant();
  logger.info('qdrant reachable', { url: env.QDRANT_URL, latencyMs: latency });
}

export async function pingQdrant(): Promise<number> {
  const started = Date.now();
  const response = await fetch(`${env.QDRANT_URL.replace(/\/$/, '')}/readyz`, {
    headers: qdrantHeaders(),
  });
  const body = (await response.text()).trim();
  if (!response.ok) {
    throw new Error(`Qdrant readyz failed: ${response.status} ${body}`);
  }
  return Date.now() - started;
}

export async function qdrantVersion(): Promise<string | undefined> {
  const response = await fetch(`${env.QDRANT_URL.replace(/\/$/, '')}/`, {
    headers: qdrantHeaders(),
  });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as { version?: string };
  return payload.version;
}
