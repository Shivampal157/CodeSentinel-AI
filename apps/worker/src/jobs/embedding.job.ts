import type { Job } from 'bullmq';
import { UserModel } from '../../../api/src/models/user.model.js';
import { RepositoryModel } from '../../../api/src/models/repository.model.js';
import { fetchRepoTreeFiles, fetchFileAtRef } from '../../../api/src/services/github.service.js';
import { chunkFiles } from '../../../api/src/services/chunking.service.js';
import { embedTexts } from '../../../api/src/services/embedding.service.js';
import {
  countRepoPoints,
  deleteChunksForFiles,
  upsertChunks,
} from '../../../api/src/services/qdrant-index.service.js';
import { logger } from '../lib/logger.js';
import { emitRealtime, SOCKET_EVENTS } from '../lib/redis.js';

export type EmbeddingJobData = {
  repositoryId: string;
  userId: string;
  mode: 'full' | 'incremental';
  changedPaths?: string[];
  commitSha?: string;
};

export async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { repositoryId, userId, mode, changedPaths, commitSha } = job.data;
  const repo = await RepositoryModel.findById(repositoryId);
  const user = await UserModel.findById(userId);
  if (!repo || !user) {
    throw new Error('repository_or_user_missing');
  }

  repo.indexStatus = 'indexing';
  await repo.save();
  await emitRealtime(`repo:${repositoryId}`, SOCKET_EVENTS.jobProgress, {
    type: 'embedding',
    status: 'indexing',
    repositoryId,
    progress: 5,
  });

  try {
    let files: { path: string; content: string }[] = [];
    let sha = commitSha;

    if (mode === 'incremental' && changedPaths && changedPaths.length > 0) {
      sha = commitSha ?? repo.indexedCommitSha ?? repo.defaultBranch;
      const loaded = await Promise.all(
        changedPaths.map(async (path) => {
          const content = await fetchFileAtRef(
            user.accessToken,
            repo.ownerLogin,
            repo.name,
            path,
            sha!,
          );
          return content ? { path, content } : null;
        }),
      );
      files = loaded.filter((f): f is { path: string; content: string } => Boolean(f));
      await deleteChunksForFiles(repositoryId, changedPaths);
      logger.info('incremental index file load', {
        repositoryId,
        requested: changedPaths.length,
        loaded: files.length,
      });
    } else {
      const tree = await fetchRepoTreeFiles(
        user.accessToken,
        repo.ownerLogin,
        repo.name,
        repo.defaultBranch,
      );
      sha = tree.commitSha;
      files = tree.files.map((f) => ({ path: f.path, content: f.content }));
    }

    await job.updateProgress(30);
    let chunks = chunkFiles(files);
    const maxChunks = Number(process.env.INDEX_MAX_CHUNKS ?? 600);
    if (chunks.length > maxChunks) {
      logger.warn('truncating chunks for free-tier indexing', {
        repositoryId,
        total: chunks.length,
        keeping: maxChunks,
      });
      chunks = chunks.slice(0, maxChunks);
    }
    await emitRealtime(`repo:${repositoryId}`, SOCKET_EVENTS.jobProgress, {
      type: 'embedding',
      status: 'embedding',
      repositoryId,
      progress: 40,
      chunks: chunks.length,
    });

    const vectors = await embedTexts(
      chunks.map(
        (c) =>
          `${c.filePath}\n${c.symbolName ?? ''}\n${c.symbolKind ?? ''}\n${c.content}`.slice(0, 8000),
      ),
    );

    await job.updateProgress(75);
    await upsertChunks(repositoryId, chunks, vectors, sha);
    const count = await countRepoPoints(repositoryId);

    repo.indexStatus = 'ready';
    repo.chunkCount = count;
    repo.indexedCommitSha = sha;
    repo.lastIndexedAt = new Date();
    repo.indexError = undefined;
    await repo.save();

    await emitRealtime(`repo:${repositoryId}`, SOCKET_EVENTS.jobProgress, {
      type: 'embedding',
      status: 'ready',
      repositoryId,
      progress: 100,
      chunkCount: count,
    });

    logger.info('embedding job complete', { repositoryId, mode, chunkCount: count });
  } catch (err) {
    repo.indexStatus = 'failed';
    repo.indexError = err instanceof Error ? err.message : String(err);
    await repo.save();
    await emitRealtime(`repo:${repositoryId}`, SOCKET_EVENTS.jobProgress, {
      type: 'embedding',
      status: 'failed',
      repositoryId,
      error: repo.indexError,
    });
    throw err;
  }
}
