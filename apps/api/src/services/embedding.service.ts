import OpenAI from 'openai';
import {
  EMBEDDING_MODELS,
  GEMINI_EMBEDDING_DIMS,
  OPENAI_EMBEDDING_DIMS,
  VOYAGE_EMBEDDING_DIMS,
} from '@codesentinel/shared';
import { env, requireOpenAI } from '../config/env.js';
import { logger } from '../lib/logger.js';

export function embeddingDimensions(): number {
  switch (env.EMBEDDING_PROVIDER) {
    case 'voyage':
      return VOYAGE_EMBEDDING_DIMS;
    case 'gemini':
      return GEMINI_EMBEDDING_DIMS;
    default:
      return OPENAI_EMBEDDING_DIMS;
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (env.EMBEDDING_PROVIDER === 'voyage') return embedWithVoyage(texts);
  if (env.EMBEDDING_PROVIDER === 'gemini') return embedWithGemini(texts, 'RETRIEVAL_DOCUMENT');
  return embedWithOpenAI(texts);
}

async function embedWithOpenAI(texts: string[]): Promise<number[][]> {
  const apiKey = requireOpenAI();
  const client = new OpenAI({ apiKey });
  const model = EMBEDDING_MODELS.openai;
  const batches: number[][] = [];
  const size = 64;
  for (let i = 0; i < texts.length; i += size) {
    const slice = texts.slice(i, i + size);
    const response = await client.embeddings.create({
      model,
      input: slice,
    });
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      batches.push(item.embedding);
    }
    logger.info('openai embeddings generated', {
      count: slice.length,
      model,
      dims: sorted[0]?.embedding.length,
    });
  }
  return batches;
}

async function embedWithVoyage(texts: string[]): Promise<number[][]> {
  if (!env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is missing. Get one at https://dash.voyageai.com');
  }
  const batches: number[][] = [];
  const size = 64;
  for (let i = 0; i < texts.length; i += size) {
    const slice = texts.slice(i, i + size);
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODELS.voyage,
        input: slice,
        input_type: 'document',
      }),
    });
    if (!response.ok) {
      throw new Error(`Voyage embeddings failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    const sorted = [...body.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      batches.push(item.embedding);
    }
    logger.info('voyage embeddings generated', { count: slice.length, model: EMBEDDING_MODELS.voyage });
  }
  return batches;
}

function requireGemini(): string {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is missing. Get a free key at https://aistudio.google.com/apikey',
    );
  }
  return env.GEMINI_API_KEY;
}

async function embedWithGemini(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[][]> {
  const apiKey = requireGemini();
  const model = EMBEDDING_MODELS.gemini;
  const batches: number[][] = [];
  const size = 8; // free-tier friendly
  for (let i = 0; i < texts.length; i += size) {
    const slice = texts.slice(i, i + size);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: slice.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text: text.slice(0, 8000) }] },
            taskType,
            outputDimensionality: GEMINI_EMBEDDING_DIMS,
          })),
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          embeddings?: { values: number[] }[];
        };
        if (!body.embeddings?.length) {
          throw new Error('Gemini embeddings response missing vectors');
        }
        for (const item of body.embeddings) {
          batches.push(item.values);
        }
        logger.info('gemini embeddings generated', {
          count: slice.length,
          model,
          dims: body.embeddings[0]?.values.length,
          progress: `${Math.min(i + size, texts.length)}/${texts.length}`,
        });
        break;
      }

      const errText = await response.text();
      if (response.status === 429 && attempt < 6) {
        const waitMs = Math.min(30_000, 2000 * 2 ** (attempt - 1));
        logger.warn('gemini rate limited — backing off', { attempt, waitMs });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw new Error(`Gemini embeddings failed: ${response.status} ${errText}`);
    }

    // pacing for free tier RPM limits
    await new Promise((r) => setTimeout(r, 1500));
  }
  return batches;
}

export async function embedQuery(text: string): Promise<number[]> {
  if (env.EMBEDDING_PROVIDER === 'voyage') {
    if (!env.VOYAGE_API_KEY) {
      throw new Error('VOYAGE_API_KEY is missing');
    }
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODELS.voyage,
        input: [text],
        input_type: 'query',
      }),
    });
    if (!response.ok) {
      throw new Error(`Voyage query embedding failed: ${response.status}`);
    }
    const body = (await response.json()) as { data: { embedding: number[] }[] };
    return body.data[0]!.embedding;
  }

  if (env.EMBEDDING_PROVIDER === 'gemini') {
    const [vector] = await embedWithGemini([text], 'RETRIEVAL_QUERY');
    return vector!;
  }

  const vectors = await embedWithOpenAI([text]);
  return vectors[0]!;
}
