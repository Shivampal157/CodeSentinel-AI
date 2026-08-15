import { createHash } from 'node:crypto';
import { QDRANT_COLLECTION } from '@codesentinel/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { qdrant } from '../lib/qdrant.js';
import type { CodeChunk } from './chunking.service.js';
import { embeddingDimensions } from './embedding.service.js';

export type IndexedChunk = CodeChunk & {
  repoId: string;
  commitSha?: string;
  pointId: string;
};

function pointIdFor(repoId: string, chunk: CodeChunk): string {
  // Qdrant accepts UUID or unsigned int; use deterministic UUID-like hex folded to UUID format
  const hex = createHash('sha256')
    .update(`${repoId}:${chunk.filePath}:${chunk.contentHash}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function ensureCollection(): Promise<void> {
  const collection = env.QDRANT_COLLECTION || QDRANT_COLLECTION;
  const size = embeddingDimensions();
  const existing = await qdrant.getCollections();
  const found = existing.collections?.some((c) => c.name === collection);

  if (found) {
    const info = await qdrant.getCollection(collection);
    const currentSize =
      typeof info.config?.params?.vectors === 'object' &&
      info.config.params.vectors &&
      'size' in info.config.params.vectors
        ? Number(info.config.params.vectors.size)
        : undefined;

    if (currentSize && currentSize !== size) {
      logger.warn('qdrant collection vector size mismatch — recreating', {
        collection,
        currentSize,
        expectedSize: size,
      });
      await qdrant.deleteCollection(collection);
    } else {
      logger.info('qdrant collection exists', { collection, vectorSize: currentSize ?? size });
      return;
    }
  }

  try {
    await qdrant.createCollection(collection, {
      vectors: {
        size,
        distance: 'Cosine',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists') || message.includes('Conflict')) {
      logger.info('qdrant collection create raced — already exists', { collection });
      return;
    }
    throw err;
  }

  try {
    await qdrant.createPayloadIndex(collection, {
      field_name: 'repoId',
      field_schema: 'keyword',
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: 'filePath',
      field_schema: 'keyword',
    });
    await qdrant.createPayloadIndex(collection, {
      field_name: 'contentHash',
      field_schema: 'keyword',
    });
  } catch {
    // indexes may already exist after a race
  }

  logger.info('qdrant collection created', { collection, vectorSize: size });
}

export async function upsertChunks(
  repoId: string,
  chunks: CodeChunk[],
  vectors: number[][],
  commitSha?: string,
): Promise<string[]> {
  if (chunks.length !== vectors.length) {
    throw new Error('chunks/vectors length mismatch');
  }
  const collection = env.QDRANT_COLLECTION || QDRANT_COLLECTION;
  await ensureCollection();

  const points = chunks.map((chunk, i) => {
    const id = pointIdFor(repoId, chunk);
    return {
      id,
      vector: vectors[i]!,
      payload: {
        repoId,
        filePath: chunk.filePath,
        symbolName: chunk.symbolName,
        symbolKind: chunk.symbolKind,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        contentHash: chunk.contentHash,
        content: chunk.content.slice(0, 12000),
        commitSha,
      },
    };
  });

  const batchSize = 64;
  const ids: string[] = [];
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(collection, { wait: true, points: batch });
    ids.push(...batch.map((p) => String(p.id)));
    logger.info('qdrant upsert batch', {
      collection,
      repoId,
      batch: Math.floor(i / batchSize) + 1,
      count: batch.length,
    });
  }
  return ids;
}

export async function deleteChunksForFiles(repoId: string, filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) return;
  const collection = env.QDRANT_COLLECTION || QDRANT_COLLECTION;
  await qdrant.delete(collection, {
    wait: true,
    filter: {
      must: [
        { key: 'repoId', match: { value: repoId } },
        { key: 'filePath', match: { any: filePaths } },
      ],
    },
  });
  logger.info('qdrant deleted file chunks', { repoId, files: filePaths.length });
}

export async function countRepoPoints(repoId: string): Promise<number> {
  const collection = env.QDRANT_COLLECTION || QDRANT_COLLECTION;
  const result = await qdrant.count(collection, {
    filter: { must: [{ key: 'repoId', match: { value: repoId } }] },
    exact: true,
  });
  return result.count;
}

export type RetrievedChunk = {
  id: string;
  score: number;
  filePath: string;
  symbolName?: string;
  symbolKind?: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
};

export async function searchRepoChunks(
  repoId: string,
  queryVector: number[],
  topK = 8,
  scoreThreshold = 0.25,
): Promise<RetrievedChunk[]> {
  const collection = env.QDRANT_COLLECTION || QDRANT_COLLECTION;
  logger.info('qdrant search', { collection, repoId, topK, dims: queryVector.length });

  const results = await qdrant.search(collection, {
    vector: queryVector,
    limit: topK,
    score_threshold: scoreThreshold,
    with_payload: true,
    filter: {
      must: [{ key: 'repoId', match: { value: repoId } }],
    },
  });

  logger.info('qdrant search results', {
    repoId,
    hits: results.length,
    topScore: results[0]?.score,
  });

  return results.map((hit) => {
    const payload = (hit.payload ?? {}) as Record<string, unknown>;
    return {
      id: String(hit.id),
      score: hit.score,
      filePath: String(payload.filePath ?? ''),
      symbolName: payload.symbolName ? String(payload.symbolName) : undefined,
      symbolKind: payload.symbolKind ? String(payload.symbolKind) : undefined,
      language: String(payload.language ?? ''),
      startLine: Number(payload.startLine ?? 1),
      endLine: Number(payload.endLine ?? 1),
      content: String(payload.content ?? ''),
      contentHash: String(payload.contentHash ?? ''),
    };
  });
}
