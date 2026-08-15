import { logger } from '../lib/logger.js';
import { embedQuery } from './embedding.service.js';
import { searchRepoChunks, type RetrievedChunk } from './qdrant-index.service.js';

export type RagQueryInput = {
  repoId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
};

/**
 * Core RAG retrieval: embed natural-language / diff query, vector-search Qdrant.
 */
export async function retrieveRelevantChunks(input: RagQueryInput): Promise<RetrievedChunk[]> {
  const topK = input.topK ?? 8;
  const started = Date.now();
  const vector = await embedQuery(input.query);
  const hits = await searchRepoChunks(input.repoId, vector, topK, input.scoreThreshold ?? 0.2);
  logger.info('rag retrieve', {
    repoId: input.repoId,
    topK,
    hits: hits.length,
    durationMs: Date.now() - started,
    queryPreview: input.query.slice(0, 120),
  });
  return hits;
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No related codebase context was retrieved.';
  }
  return chunks
    .map((c, i) => {
      const header = `[${i + 1}] ${c.filePath}${c.symbolName ? ` :: ${c.symbolName}` : ''} (lines ${c.startLine}-${c.endLine}, score=${c.score.toFixed(3)})`;
      return `${header}\n\`\`\`\n${c.content.slice(0, 2500)}\n\`\`\``;
    })
    .join('\n\n');
}
