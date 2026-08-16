import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { connectMongo, disconnectMongo } from './lib/mongo.js';
import { connectQdrant } from './lib/qdrant.js';
import { connectRedis, redis } from './lib/redis.js';
import { startRealtimeBridge } from './lib/realtime.js';
import { ensureCollection } from './services/qdrant-index.service.js';
import { initSocketServer, closeSocketServer } from './sockets/io.js';

const app = createApp();
const server = createServer(app);
let shuttingDown = false;

function listen(): Promise<void> {
  const port = env.PORT ?? env.API_PORT;
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.off('error', reject);
      logger.info('api listening', { port, host: '0.0.0.0', env: env.NODE_ENV });
      resolve();
    });
  });
}

async function start(): Promise<void> {
  // Bind port first so Railway healthchecks succeed while deps connect.
  await listen();

  logger.info('connecting dependencies');
  await connectMongo();
  await connectRedis();
  await connectQdrant();
  try {
    await ensureCollection();
  } catch (err) {
    logger.warn('qdrant collection ensure deferred', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
  await initSocketServer(server);
  await startRealtimeBridge();
  logger.info('api ready');
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down', { signal });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeSocketServer();
  await disconnectMongo();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

start().catch((err) => {
  logger.error('failed to start api', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
