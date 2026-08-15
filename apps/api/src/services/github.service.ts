import { Octokit } from '@octokit/rest';
import { createHash } from 'node:crypto';
import { mapGithubError } from '../lib/github-errors.js';
import { logger } from '../lib/logger.js';

export function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'CodeSentinel-AI',
    request: {
      timeout: 30_000,
    },
  });
}

export type RepoFile = {
  path: string;
  content: string;
  sha: string;
  size: number;
};

export type PrDiffFile = {
  filename: string;
  status: string;
  patch?: string;
  additions: number;
  deletions: number;
};

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  'vendor',
  '__pycache__',
]);

const CODE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.java',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.kt',
  '.swift',
]);

function isCodePath(path: string): boolean {
  const parts = path.split('/');
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  const ext = path.slice(path.lastIndexOf('.'));
  return CODE_EXT.has(ext);
}

export async function listUserRepos(token: string) {
  const octokit = createOctokit(token);
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: 'updated',
    affiliation: 'owner,collaborator,organization_member',
  });
  return repos.map((r) => ({
    githubId: r.id,
    fullName: r.full_name,
    name: r.name,
    ownerLogin: r.owner.login,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    private: r.private,
  }));
}

export async function fetchRepoTreeFiles(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<{ commitSha: string; files: RepoFile[] }> {
  const octokit = createOctokit(token);
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${ref}` }).catch(async () => {
    return octokit.git.getRef({ owner, repo, ref });
  });

  const commitSha = refData.object.sha;
  const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
  const treeSha = commit.tree.sha;

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: 'true',
  });

  const blobs = (tree.tree ?? []).filter(
    (item) => item.type === 'blob' && item.path && item.sha && isCodePath(item.path) && (item.size ?? 0) < 200_000,
  );

  logger.info('github tree listed', { owner, repo, ref, commitSha, candidates: blobs.length });

  const files: RepoFile[] = [];
  const concurrency = 8;
  for (let i = 0; i < blobs.length; i += concurrency) {
    const batch = blobs.slice(i, i + concurrency);
    const fetched = await Promise.all(
      batch.map(async (blob) => {
        const { data } = await octokit.git.getBlob({ owner, repo, file_sha: blob.sha! });
        const content =
          data.encoding === 'base64'
            ? Buffer.from(data.content, 'base64').toString('utf8')
            : data.content;
        return {
          path: blob.path!,
          content,
          sha: blob.sha!,
          size: blob.size ?? content.length,
        } satisfies RepoFile;
      }),
    );
    files.push(...fetched);
  }

  return { commitSha, files };
}

export async function fetchPullRequest(
  token: string,
  owner: string,
  repo: string,
  number: number,
) {
  const octokit = createOctokit(token);
  try {
    const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: number });
    const files = await octokit.paginate(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });

    const diffFiles: PrDiffFile[] = files.map((f) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch,
      additions: f.additions,
      deletions: f.deletions,
    }));

    const patchText = diffFiles.map((f) => `--- ${f.filename}\n${f.patch ?? ''}`).join('\n');
    const diffHash = createHash('sha256').update(`${pr.head.sha}:${patchText}`).digest('hex');

    return {
      githubPrId: pr.id,
      githubPrNumber: pr.number,
      title: pr.title,
      body: pr.body ?? '',
      authorLogin: pr.user?.login ?? 'unknown',
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      baseSha: pr.base.sha,
      headSha: pr.head.sha,
      status: pr.merged_at ? 'merged' : pr.state,
      diffHash,
      files: diffFiles,
      patchText,
    };
  } catch (err) {
    mapGithubError(err, 'pull_request');
  }
}

export async function fetchFileAtRef(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const octokit = createOctokit(token);
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null;
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch {
    return null;
  }
}
