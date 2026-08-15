import type { Job } from 'bullmq';
import { UserModel } from '../../../api/src/models/user.model.js';
import { PullRequestModel } from '../../../api/src/models/pull-request.model.js';
import { ReviewModel } from '../../../api/src/models/review.model.js';
import { DebtScoreModel } from '../../../api/src/models/debt-score.model.js';
import { CommentModel } from '../../../api/src/models/comment.model.js';
import { RepositoryModel } from '../../../api/src/models/repository.model.js';
import { fetchPullRequest } from '../../../api/src/services/github.service.js';
import { generateReviewWithRag } from '../../../api/src/services/review.service.js';
import { recordReviewCompleted } from '../../../api/src/lib/metrics.js';
import { logger } from '../lib/logger.js';
import { emitRealtime, SOCKET_EVENTS } from '../lib/redis.js';

export type ReviewJobData = {
  reviewId: string;
  pullRequestId: string;
  repositoryId: string;
  userId: string;
  diffHash: string;
};

export async function processReviewJob(job: Job<ReviewJobData>): Promise<void> {
  const { reviewId, pullRequestId, repositoryId, userId, diffHash } = job.data;
  const review = await ReviewModel.findById(reviewId);
  const pr = await PullRequestModel.findById(pullRequestId);
  const repo = await RepositoryModel.findById(repositoryId);
  const user = await UserModel.findById(userId);
  if (!review || !pr || !repo || !user) {
    throw new Error('review_context_missing');
  }

  review.status = 'running';
  review.startedAt = new Date();
  await review.save();
  pr.reviewStatus = 'running';
  await pr.save();

  await emitRealtime(`pr:${pullRequestId}`, SOCKET_EVENTS.reviewStatus, {
    reviewId,
    status: 'running',
    cacheHit: false,
  });

  try {
    const prData = await fetchPullRequest(
      user.accessToken,
      repo.ownerLogin,
      repo.name,
      pr.githubPrNumber,
    );

    const { result, chunks, cacheHit, model } = await generateReviewWithRag({
      repoId: repositoryId,
      diffHash,
      patchText: prData.patchText,
    });

    review.status = 'completed';
    review.cacheHit = cacheHit;
    review.summary = result.summary;
    review.debtScore = result.debtScore;
    review.set('findings', result.findings);
    review.ragChunkIds = chunks.map((c) => c.id);
    review.set('model', model);
    review.completedAt = new Date();
    await review.save();

    pr.reviewStatus = 'completed';
    pr.debtScore = result.debtScore;
    pr.diffHash = prData.diffHash;
    pr.lastReviewId = review._id;
    await pr.save();

    await DebtScoreModel.create({
      repositoryId,
      pullRequestId,
      reviewId,
      scope: 'pr',
      score: result.debtScore,
      findingsCount: result.findings.length,
      recordedAt: new Date(),
    });

    for (const finding of result.findings) {
      await CommentModel.create({
        pullRequestId,
        reviewId,
        authorId: userId,
        filePath: finding.filePath,
        line: finding.startLine,
        body: `**[${finding.severity}] ${finding.title}**\n\n${finding.body}${
          finding.suggestion ? `\n\nSuggestion: ${finding.suggestion}` : ''
        }${
          finding.relatedContext?.length
            ? `\n\nRelated: ${finding.relatedContext
                .map((r) => `${r.filePath}${r.symbolName ? `::${r.symbolName}` : ''} (${r.reason})`)
                .join('; ')}`
            : ''
        }`,
        source: 'ai',
      });
    }

    await emitRealtime(`pr:${pullRequestId}`, SOCKET_EVENTS.reviewStatus, {
      reviewId,
      status: 'completed',
      cacheHit,
      debtScore: result.debtScore,
      findingsCount: result.findings.length,
    });
    await emitRealtime(`repo:${repositoryId}`, SOCKET_EVENTS.debtUpdated, {
      repositoryId,
      pullRequestId,
      score: result.debtScore,
    });

    logger.info('review job complete', {
      reviewId,
      cacheHit,
      findings: result.findings.length,
      debtScore: result.debtScore,
    });
    recordReviewCompleted(cacheHit);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    review.status = 'failed';
    review.error = message;
    review.completedAt = new Date();
    await review.save();
    pr.reviewStatus = 'failed';
    await pr.save();
    await emitRealtime(`pr:${pullRequestId}`, SOCKET_EVENTS.reviewStatus, {
      reviewId,
      status: 'failed',
      error: message,
    });
    throw err;
  }
}
