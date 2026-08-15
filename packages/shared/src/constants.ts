export const QDRANT_COLLECTION = 'code_chunks';

export const REDIS_KEYS = {
  reviewCache: (diffHash: string) => `review:result:${diffHash}`,
  rateLimit: (scope: string, id: string) => `rl:${scope}:${id}`,
  oauthState: (state: string) => `oauth:github:${state}`,
  refreshSession: (jti: string) => `auth:refresh:${jti}`,
} as const;

export const QUEUES = {
  embedding: 'embedding',
  review: 'ai-review',
} as const;

export const SOCKET_EVENTS = {
  reviewStatus: 'review:status',
  commentCreated: 'comment:created',
  commentUpdated: 'comment:updated',
  jobProgress: 'job:progress',
  debtUpdated: 'debt:updated',
} as const;

export const EMBEDDING_MODELS = {
  openai: 'text-embedding-3-small',
  voyage: 'voyage-code-3',
  gemini: 'gemini-embedding-001',
} as const;

export const OPENAI_EMBEDDING_DIMS = 1536;
export const VOYAGE_EMBEDDING_DIMS = 1024;
export const GEMINI_EMBEDDING_DIMS = 768;

export const REVIEW_CACHE_TTL_SEC = 60 * 60 * 24;
export const OAUTH_STATE_TTL_SEC = 60 * 10;
