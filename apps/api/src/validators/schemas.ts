import { z } from 'zod';

export const importRepoSchema = z.object({
  fullName: z.string().min(3).regex(/^[\w.-]+\/[\w.-]+$/),
});

export const semanticSearchSchema = z.object({
  query: z.string().min(2).max(2000),
  topK: z.number().int().min(1).max(20).optional(),
});

export const importPrSchema = z.object({
  number: z.number().int().positive(),
});

export const createCommentSchema = z.object({
  filePath: z.string().min(1),
  line: z.number().int().positive(),
  body: z.string().min(1).max(8000),
  parentId: z.string().optional(),
  side: z.enum(['LEFT', 'RIGHT']).optional(),
});

export const resolveCommentSchema = z.object({
  resolved: z.boolean(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
