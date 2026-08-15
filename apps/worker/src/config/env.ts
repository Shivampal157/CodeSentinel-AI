import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const envFiles = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];
for (const file of envFiles) {
  loadEnv({ path: file, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional().default(''),
  QDRANT_COLLECTION: z.string().min(1).default('code_chunks'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'voyage', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional().default(''),
  VOYAGE_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  INDEX_MAX_CHUNKS: z.coerce.number().int().positive().default(600),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment:\n${issues}`);
}

export const env = parsed.data;
