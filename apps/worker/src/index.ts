import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { QUEUES } from '@codesentinel/shared';
import { connectRedis as connectApiRedis } from '../../api/src/lib/redis.js';
import { ensureCollection } from '../../api/src/services/qdrant-index.service.js';
import { env } from './config/env.js';
import { connectMongo } from './lib/mongo.js';
import { logger } from './lib/logger.js';
import { connectRedis, redis } from './lib/redis.js';
import { processEmbeddingJob, type EmbeddingJobData } from './jobs/embedding.job.js';
import { processReviewJob, type ReviewJobData } from './jobs/review.job.js';

function connectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null as null,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

/** Render web services must bind PORT; health only, no public routes needed. */
function listenForPlatform(): void {
  const port = process.env.PORT;
  if (!port) return;
  createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'codesentinel-worker' }));
  }).listen(Number(port), '0.0.0.0', () => {
    logger.info('worker health listening', { port });
  });
}

async function start(): Promise<void> {
  listenForPlatform();
  try {
    await connectMongo();
    await connectRedis();
    await connectApiRedis();
    await ensureCollection();
  } catch (err) {
    logger.error('worker dependency connect failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const connection = connectionFromUrl(env.REDIS_URL);

  const embeddingWorker = new Worker<EmbeddingJobData>(
    QUEUES.embedding,
    async (job) => processEmbeddingJob(job),
    { connection, concurrency: 2 },
  );

  const reviewWorker = new Worker<ReviewJobData>(
    QUEUES.review,
    async (job) => processReviewJob(job),
    { connection, concurrency: 1 },
  );

  for (const worker of [embeddingWorker, reviewWorker]) {
    worker.on('completed', (job) => {
      logger.info('job completed', { queue: worker.name, jobId: job.id });
    });
    worker.on('failed', (job, err) => {
      logger.error('job failed', { queue: worker.name, jobId: job?.id, message: err.message });
    });
  }

  logger.info('worker online', {
    env: env.NODE_ENV,
    queues: Object.values(QUEUES),
  });
}

process.on('SIGINT', () => {
  redis.disconnect();
  process.exit(0);
});
process.on('SIGTERM', () => {
  redis.disconnect();
  process.exit(0);
});

start().catch((err) => {
  logger.error('failed to start worker', { err });
  process.exit(1);
});
