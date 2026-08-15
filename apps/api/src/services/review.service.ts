import Anthropic from '@anthropic-ai/sdk';
import { REVIEW_CACHE_TTL_SEC, REDIS_KEYS, reviewResultSchema, type ReviewResult } from '@codesentinel/shared';
import { env, requireAnthropic } from '../config/env.js';
import { recordReviewCache, recordReviewCompleted } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { formatChunksForPrompt, retrieveRelevantChunks } from './rag.service.js';
import type { RetrievedChunk } from './qdrant-index.service.js';

export async function getCachedReview(diffHash: string): Promise<ReviewResult | null> {
  const key = REDIS_KEYS.reviewCache(diffHash);
  const raw = await redis.get(key);
  if (!raw) {
    recordReviewCache(false);
    logger.info('redis cache MISS', { key, diffHash });
    return null;
  }
  recordReviewCache(true);
  logger.info('redis cache HIT', { key, diffHash });
  try {
    return reviewResultSchema.parse(JSON.parse(raw));
  } catch {
    await redis.del(key);
    logger.warn('redis cache corrupt, deleted', { key });
    return null;
  }
}

export async function setCachedReview(diffHash: string, result: ReviewResult): Promise<void> {
  const key = REDIS_KEYS.reviewCache(diffHash);
  await redis.set(key, JSON.stringify(result), 'EX', REVIEW_CACHE_TTL_SEC);
  logger.info('redis cache SET', { key, ttlSec: REVIEW_CACHE_TTL_SEC });
}

function buildPrompt(diff: string, context: string): string {
  return `You are CodeSentinel, a senior staff engineer reviewing a pull request.
Use the retrieved codebase context to ground your findings. Reference related files/symbols when relevant
(e.g. "this pattern was also flagged in auth.service.ts").

Return ONLY valid JSON matching:
{
  "summary": string,
  "debtScore": number (0-100, higher = more debt),
  "findings": [
    {
      "severity": "critical"|"high"|"medium"|"low"|"info",
      "filePath": string,
      "startLine": number,
      "endLine"?: number,
      "title": string,
      "body": string,
      "suggestion"?: string,
      "relatedContext": [{ "filePath": string, "symbolName"?: string, "reason": string, "score"?: number }]
    }
  ]
}

## Retrieved codebase context
${context}

## PR diff
${diff.slice(0, 80000)}
`;
}

export async function generateReviewWithRag(params: {
  repoId: string;
  diffHash: string;
  patchText: string;
}): Promise<{ result: ReviewResult; chunks: RetrievedChunk[]; cacheHit: boolean; model: string }> {
  const cached = await getCachedReview(params.diffHash);
  if (cached) {
    return { result: cached, chunks: [], cacheHit: true, model: 'cache' };
  }

  const query = params.patchText.slice(0, 6000);
  const chunks = await retrieveRelevantChunks({
    repoId: params.repoId,
    query,
    topK: 10,
  });
  const context = formatChunksForPrompt(chunks);

  const apiKey = requireAnthropic();
  const client = new Anthropic({ apiKey });
  const model = env.ANTHROPIC_MODEL;

  logger.info('claude review request', { model, repoId: params.repoId, ragChunks: chunks.length });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(params.patchText, context) }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return JSON');
  }

  const parsed = reviewResultSchema.parse(JSON.parse(jsonMatch[0]));
  await setCachedReview(params.diffHash, parsed);

  return { result: parsed, chunks, cacheHit: false, model };
}
