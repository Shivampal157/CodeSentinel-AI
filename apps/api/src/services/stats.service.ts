import { Types } from 'mongoose';
import { RepositoryModel, PullRequestModel, ReviewModel, AuditLogModel } from '../models/index.js';
import { redis } from '../lib/redis.js';

export async function collectPlatformStats(userId: string) {
  const ownerObjectId = new Types.ObjectId(userId);

  const userRepos = await RepositoryModel.find({ ownerId: ownerObjectId }).select('_id chunkCount indexStatus').lean();
  const repoIds = userRepos.map((r) => r._id);

  const [prCount, reviewAgg, recentAudit, cacheKeys] = await Promise.all([
    repoIds.length ? PullRequestModel.countDocuments({ repositoryId: { $in: repoIds } }) : 0,
    ReviewModel.aggregate<{ total: number; cacheHits: number }>([
      { $match: { requestedBy: ownerObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cacheHits: { $sum: { $cond: ['$cacheHit', 1, 0] } },
        },
      },
    ]),
    AuditLogModel.find({ userId: ownerObjectId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    redis.keys('review:result:*').catch(() => [] as string[]),
  ]);

  const repos = {
    repoCount: userRepos.length,
    readyCount: userRepos.filter((r) => r.indexStatus === 'ready').length,
    totalChunks: userRepos.reduce((sum, r) => sum + (r.chunkCount ?? 0), 0),
  };

  const reviews = reviewAgg[0] ?? { total: 0, cacheHits: 0 };
  const cacheHitRate =
    reviews.total > 0 ? Math.round((reviews.cacheHits / reviews.total) * 100) : 0;

  return {
    repositories: {
      total: repos.repoCount,
      ready: repos.readyCount,
      indexedChunks: repos.totalChunks,
    },
    pullRequests: { total: prCount },
    reviews: {
      total: reviews.total,
      cacheHits: reviews.cacheHits,
      cacheHitRatePct: cacheHitRate,
    },
    redis: {
      reviewCacheKeys: cacheKeys.length,
    },
    uptimeSec: Math.round(process.uptime()),
    recentActivity: recentAudit.map((entry) => ({
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata,
      at: entry.createdAt,
    })),
  };
}
