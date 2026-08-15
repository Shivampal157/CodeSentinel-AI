import { Queue } from 'bullmq';
import { QUEUES } from '@codesentinel/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

function connectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null as null,
  };
}

const connection = connectionFromUrl(env.REDIS_URL);

export const embeddingQueue = new Queue(QUEUES.embedding, { connection });
export const reviewQueue = new Queue(QUEUES.review, { connection });

export type EmbeddingJobData = {
  repositoryId: string;
  userId: string;
  mode: 'full' | 'incremental';
  changedPaths?: string[];
  commitSha?: string;
};

export type ReviewJobData = {
  reviewId: string;
  pullRequestId: string;
  repositoryId: string;
  userId: string;
  diffHash: string;
};

export async function enqueueEmbeddingJob(data: EmbeddingJobData) {
  const job = await embeddingQueue.add('index-repo', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  logger.info('embedding job enqueued', { jobId: job.id, repositoryId: data.repositoryId, mode: data.mode });
  return job;
}

export async function enqueueReviewJob(data: ReviewJobData) {
  const job = await reviewQueue.add('ai-review', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 8000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  logger.info('review job enqueued', { jobId: job.id, reviewId: data.reviewId, diffHash: data.diffHash });
  return job;
}
