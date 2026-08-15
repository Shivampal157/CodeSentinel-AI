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
  API_PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional().default(''),
  QDRANT_COLLECTION: z.string().min(1).default('code_chunks'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:4000/api/auth/github/callback'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'voyage', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional().default(''),
  VOYAGE_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  INDEX_MAX_CHUNKS: z.coerce.number().int().positive().default(600),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  TRUST_PROXY: z
    .string()
    .optional()
    .default('false')
    .transform((v) => ['true', '1', 'yes'].includes(v.toLowerCase())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment:\n${issues}`);
}

export const env = parsed.data;

export function requireGitHubOAuth(): { clientId: string; clientSecret: string } {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error(
      'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env',
    );
  }
  return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
}

export function requireOpenAI(): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Get one at https://platform.openai.com/api-keys');
  }
  return env.OPENAI_API_KEY;
}

export function requireAnthropic(): string {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is missing. Get one at https://console.anthropic.com/settings/keys',
    );
  }
  return env.ANTHROPIC_API_KEY;
}
