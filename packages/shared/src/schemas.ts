import { z } from 'zod';

export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof severitySchema>;

export const reviewFindingSchema = z.object({
  severity: severitySchema,
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  suggestion: z.string().optional(),
  relatedContext: z
    .array(
      z.object({
        filePath: z.string(),
        symbolName: z.string().optional(),
        reason: z.string(),
        score: z.number().optional(),
      }),
    )
    .default([]),
});
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;

export const reviewResultSchema = z.object({
  summary: z.string(),
  debtScore: z.number().min(0).max(100),
  findings: z.array(reviewFindingSchema),
});
export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const codeChunkMetadataSchema = z.object({
  repoId: z.string(),
  filePath: z.string(),
  symbolName: z.string().optional(),
  symbolKind: z.string().optional(),
  language: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  contentHash: z.string(),
  commitSha: z.string().optional(),
});
export type CodeChunkMetadata = z.infer<typeof codeChunkMetadataSchema>;
