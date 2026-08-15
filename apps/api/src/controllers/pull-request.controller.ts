import type { Request, Response } from 'express';
import {
  getDebtTrend,
  getPullRequest,
  getPullRequestDiff,
  getReview,
  importPullRequest,
  listPullRequests,
  startAiReview,
} from '../services/pull-request.service.js';
import { writeAuditLog } from '../services/audit.service.js';

export async function importPr(req: Request, res: Response): Promise<void> {
  const repositoryId = req.params.id!;
  const number = Number(req.body.number);
  const { pr, files } = await importPullRequest(req.user!.id, repositoryId, number);
  void writeAuditLog({
    userId: req.user!.id,
    action: 'pr.import',
    resourceType: 'pull_request',
    resourceId: pr._id.toString(),
    metadata: { number, repositoryId },
    req,
  });
  res.status(201).json({
    id: pr._id.toString(),
    number: pr.githubPrNumber,
    title: pr.title,
    diffHash: pr.diffHash,
    headSha: pr.headSha,
    files,
  });
}

export async function listPrs(req: Request, res: Response): Promise<void> {
  const prs = await listPullRequests(req.user!.id, req.params.id!);
  res.json({
    pullRequests: prs.map((pr) => ({
      id: pr._id.toString(),
      number: pr.githubPrNumber,
      title: pr.title,
      authorLogin: pr.authorLogin,
      reviewStatus: pr.reviewStatus,
      debtScore: pr.debtScore,
      headSha: pr.headSha,
      updatedAt: pr.updatedAt,
    })),
  });
}

export async function getPr(req: Request, res: Response): Promise<void> {
  const pr = await getPullRequest(req.user!.id, req.params.id!);
  res.json({
    id: pr._id.toString(),
    repositoryId: pr.repositoryId.toString(),
    number: pr.githubPrNumber,
    title: pr.title,
    body: pr.body,
    authorLogin: pr.authorLogin,
    baseBranch: pr.baseBranch,
    headBranch: pr.headBranch,
    baseSha: pr.baseSha,
    headSha: pr.headSha,
    diffHash: pr.diffHash,
    reviewStatus: pr.reviewStatus,
    debtScore: pr.debtScore,
    lastReviewId: pr.lastReviewId?.toString(),
  });
}

export async function getPrDiff(req: Request, res: Response): Promise<void> {
  const data = await getPullRequestDiff(req.user!.id, req.params.id!);
  res.json(data);
}

export async function triggerReview(req: Request, res: Response): Promise<void> {
  const review = await startAiReview(req.user!.id, req.params.id!);
  void writeAuditLog({
    userId: req.user!.id,
    action: 'review.start',
    resourceType: 'review',
    resourceId: review._id.toString(),
    metadata: { pullRequestId: req.params.id },
    req,
  });
  res.status(202).json({
    id: review._id.toString(),
    status: review.status,
    diffHash: review.diffHash,
  });
}

export async function getReviewById(req: Request, res: Response): Promise<void> {
  const review = await getReview(req.user!.id, req.params.id!);
  res.json({
    id: review._id.toString(),
    status: review.status,
    cacheHit: review.cacheHit,
    summary: review.summary,
    debtScore: review.debtScore,
    findings: review.findings,
    model: review.model,
    error: review.error,
    ragChunkIds: review.ragChunkIds,
    completedAt: review.completedAt,
  });
}

export async function debtTrend(req: Request, res: Response): Promise<void> {
  const points = await getDebtTrend(req.user!.id, req.params.id!);
  res.json({
    points: points.map((p) => ({
      id: p._id.toString(),
      score: p.score,
      findingsCount: p.findingsCount,
      pullRequestId: p.pullRequestId?.toString(),
      recordedAt: p.recordedAt,
    })),
  });
}
