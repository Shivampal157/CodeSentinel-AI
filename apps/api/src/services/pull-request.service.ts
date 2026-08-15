import { UserModel } from '../models/user.model.js';
import { PullRequestModel } from '../models/pull-request.model.js';
import { ReviewModel } from '../models/review.model.js';
import { DebtScoreModel } from '../models/debt-score.model.js';
import { HttpError } from '../middleware/error-handler.js';
import { fetchPullRequest } from './github.service.js';
import { getRepository } from './repository.service.js';
import { enqueueEmbeddingJob, enqueueReviewJob } from '../lib/queues.js';
import { logger } from '../lib/logger.js';

export async function importPullRequest(
  userId: string,
  repositoryId: string,
  prNumber: number,
) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'user_not_found');
  const repo = await getRepository(userId, repositoryId);

  const prData = await fetchPullRequest(
    user.accessToken,
    repo.ownerLogin,
    repo.name,
    prNumber,
  );

  const pr = await PullRequestModel.findOneAndUpdate(
    { repositoryId: repo._id, githubPrNumber: prData.githubPrNumber },
    {
      $set: {
        githubPrId: prData.githubPrId,
        title: prData.title,
        body: prData.body,
        authorLogin: prData.authorLogin,
        baseBranch: prData.baseBranch,
        headBranch: prData.headBranch,
        baseSha: prData.baseSha,
        headSha: prData.headSha,
        diffHash: prData.diffHash,
        status: prData.status === 'closed' || prData.status === 'merged' ? prData.status : 'open',
      },
    },
    { upsert: true, new: true },
  );

  const changedPaths = prData.files.map((f) => f.filename);
  await enqueueEmbeddingJob({
    repositoryId: repo._id.toString(),
    userId,
    mode: 'incremental',
    changedPaths,
    commitSha: prData.headSha,
  });

  logger.info('pull request imported', {
    pullRequestId: pr._id.toString(),
    number: pr.githubPrNumber,
    diffHash: pr.diffHash,
  });

  return { pr, files: prData.files, patchText: prData.patchText };
}

export async function listPullRequests(userId: string, repositoryId: string) {
  await getRepository(userId, repositoryId);
  return PullRequestModel.find({ repositoryId }).sort({ updatedAt: -1 });
}

export async function getPullRequest(userId: string, pullRequestId: string) {
  const pr = await PullRequestModel.findById(pullRequestId);
  if (!pr) throw new HttpError(404, 'pull_request_not_found');
  await getRepository(userId, pr.repositoryId.toString());
  return pr;
}

export async function getPullRequestDiff(userId: string, pullRequestId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'user_not_found');
  const pr = await getPullRequest(userId, pullRequestId);
  const repo = await getRepository(userId, pr.repositoryId.toString());
  const data = await fetchPullRequest(
    user.accessToken,
    repo.ownerLogin,
    repo.name,
    pr.githubPrNumber,
  );
  return data;
}

export async function startAiReview(userId: string, pullRequestId: string) {
  const pr = await getPullRequest(userId, pullRequestId);
  if (!pr.diffHash) {
    throw new HttpError(400, 'pull_request_missing_diff_hash');
  }

  const review = await ReviewModel.create({
    pullRequestId: pr._id,
    repositoryId: pr.repositoryId,
    requestedBy: userId,
    diffHash: pr.diffHash,
    headSha: pr.headSha,
    status: 'queued',
  });

  pr.reviewStatus = 'queued';
  pr.lastReviewId = review._id;
  await pr.save();

  await enqueueReviewJob({
    reviewId: review._id.toString(),
    pullRequestId: pr._id.toString(),
    repositoryId: pr.repositoryId.toString(),
    userId,
    diffHash: pr.diffHash,
  });

  return review;
}

export async function getReview(userId: string, reviewId: string) {
  const review = await ReviewModel.findById(reviewId);
  if (!review) throw new HttpError(404, 'review_not_found');
  await getRepository(userId, review.repositoryId.toString());
  return review;
}

export async function getDebtTrend(userId: string, repositoryId: string) {
  await getRepository(userId, repositoryId);
  return DebtScoreModel.find({ repositoryId, scope: 'pr' })
    .sort({ recordedAt: 1 })
    .limit(100);
}
