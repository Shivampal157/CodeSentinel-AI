import { UserModel } from '../models/user.model.js';
import { RepositoryModel } from '../models/repository.model.js';
import { HttpError } from '../middleware/error-handler.js';
import { listUserRepos, fetchRepoTreeFiles } from './github.service.js';
import { enqueueEmbeddingJob } from '../lib/queues.js';
import { logger } from '../lib/logger.js';

export async function listGithubReposForUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'user_not_found');
  return listUserRepos(user.accessToken);
}

export async function importRepository(userId: string, fullName: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'user_not_found');

  const repos = await listUserRepos(user.accessToken);
  const match = repos.find((r) => r.fullName.toLowerCase() === fullName.toLowerCase());
  if (!match) {
    throw new HttpError(404, 'github_repo_not_found_or_inaccessible');
  }

  const repo = await RepositoryModel.findOneAndUpdate(
    { githubId: match.githubId },
    {
      $set: {
        ownerId: user._id,
        fullName: match.fullName,
        name: match.name,
        ownerLogin: match.ownerLogin,
        defaultBranch: match.defaultBranch,
        htmlUrl: match.htmlUrl,
        private: match.private,
        indexStatus: 'pending',
      },
    },
    { upsert: true, new: true },
  );

  await enqueueEmbeddingJob({
    repositoryId: repo._id.toString(),
    userId,
    mode: 'full',
  });

  repo.indexStatus = 'indexing';
  await repo.save();

  logger.info('repository imported', { repositoryId: repo._id.toString(), fullName: repo.fullName });
  return repo;
}

export async function listImportedRepos(userId: string) {
  return RepositoryModel.find({ ownerId: userId }).sort({ updatedAt: -1 });
}

export async function getRepository(userId: string, repositoryId: string) {
  const repo = await RepositoryModel.findOne({ _id: repositoryId, ownerId: userId });
  if (!repo) throw new HttpError(404, 'repository_not_found');
  return repo;
}

export async function reindexRepository(userId: string, repositoryId: string) {
  const repo = await getRepository(userId, repositoryId);
  repo.indexStatus = 'indexing';
  repo.indexError = undefined;
  await repo.save();
  await enqueueEmbeddingJob({
    repositoryId: repo._id.toString(),
    userId,
    mode: 'full',
  });
  return repo;
}

export async function previewRepoFileCount(userId: string, repositoryId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'user_not_found');
  const repo = await getRepository(userId, repositoryId);
  const { commitSha, files } = await fetchRepoTreeFiles(
    user.accessToken,
    repo.ownerLogin,
    repo.name,
    repo.defaultBranch,
  );
  return { commitSha, fileCount: files.length };
}
