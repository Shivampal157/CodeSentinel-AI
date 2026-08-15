import type { Request, Response } from 'express';
import {
  getRepository,
  importRepository,
  listGithubReposForUser,
  listImportedRepos,
  reindexRepository,
} from '../services/repository.service.js';
import { retrieveRelevantChunks } from '../services/rag.service.js';
import { writeAuditLog } from '../services/audit.service.js';

export async function listGithubRepos(req: Request, res: Response): Promise<void> {
  const repos = await listGithubReposForUser(req.user!.id);
  res.json({ repos });
}

export async function listRepos(req: Request, res: Response): Promise<void> {
  const repos = await listImportedRepos(req.user!.id);
  res.json({
    repos: repos.map((r) => ({
      id: r._id.toString(),
      fullName: r.fullName,
      defaultBranch: r.defaultBranch,
      indexStatus: r.indexStatus,
      chunkCount: r.chunkCount,
      lastIndexedAt: r.lastIndexedAt,
      htmlUrl: r.htmlUrl,
      indexError: r.indexError,
    })),
  });
}

export async function importRepo(req: Request, res: Response): Promise<void> {
  const fullName = String(req.body.fullName);
  const repo = await importRepository(req.user!.id, fullName);
  void writeAuditLog({
    userId: req.user!.id,
    action: 'repo.import',
    resourceType: 'repository',
    resourceId: repo._id.toString(),
    metadata: { fullName },
    req,
  });
  res.status(201).json({
    id: repo._id.toString(),
    fullName: repo.fullName,
    indexStatus: repo.indexStatus,
  });
}

export async function getRepo(req: Request, res: Response): Promise<void> {
  const repo = await getRepository(req.user!.id, req.params.id!);
  res.json({
    id: repo._id.toString(),
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    indexStatus: repo.indexStatus,
    chunkCount: repo.chunkCount,
    indexedCommitSha: repo.indexedCommitSha,
    lastIndexedAt: repo.lastIndexedAt,
    indexError: repo.indexError,
    htmlUrl: repo.htmlUrl,
  });
}

export async function reindexRepo(req: Request, res: Response): Promise<void> {
  const repo = await reindexRepository(req.user!.id, req.params.id!);
  void writeAuditLog({
    userId: req.user!.id,
    action: 'repo.reindex',
    resourceType: 'repository',
    resourceId: repo._id.toString(),
    req,
  });
  res.json({ id: repo._id.toString(), indexStatus: repo.indexStatus });
}

export async function semanticSearch(req: Request, res: Response): Promise<void> {
  const repoId = req.params.id!;
  await getRepository(req.user!.id, repoId);
  const query = String(req.body.query ?? '');
  const topK = Number(req.body.topK ?? 8);
  const chunks = await retrieveRelevantChunks({ repoId, query, topK });
  void writeAuditLog({
    userId: req.user!.id,
    action: 'search.semantic',
    resourceType: 'repository',
    resourceId: repoId,
    metadata: { queryLength: query.length, topK, results: chunks.length },
    req,
  });
  res.json({ chunks });
}
