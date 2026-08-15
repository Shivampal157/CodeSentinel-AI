export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_ERROR_MESSAGES: Record<string, string> = {
  internal_error: 'Something went wrong on the server. Check API logs and retry.',
  pull_request_not_found:
    'Pull request not found on this repository. Use a PR number that exists on your fork (open GitHub → Pull requests tab).',
  github_timeout: 'GitHub timed out — check internet/VPN and retry.',
  github_forbidden: 'GitHub denied access — log in again or check repo permissions.',
  github_unauthorized: 'GitHub session expired — log in again.',
};

export function formatApiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Request failed';
  const key = raw.split(' — ')[0]?.split(':')[0]?.trim() ?? raw;
  return API_ERROR_MESSAGES[key] ?? raw.replaceAll('_', ' ');
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...options,
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data: unknown = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String(data.error)
        : `Request failed (${response.status})`;
    throw new ApiError(response.status, message, data);
  }
  return data as T;
}

export type User = {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

export type IndexStatus = 'pending' | 'indexing' | 'ready' | 'failed';
export type ReviewStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export type Repository = {
  id: string;
  fullName: string;
  defaultBranch?: string;
  indexStatus: IndexStatus;
  chunkCount?: number;
  lastIndexedAt?: string;
  indexedCommitSha?: string;
  indexError?: string | null;
  htmlUrl?: string;
};

export type GithubRepository = {
  githubId: number;
  fullName: string;
  name: string;
  ownerLogin: string;
  defaultBranch: string;
  htmlUrl: string;
  private: boolean;
};

export type PullRequest = {
  id: string;
  repositoryId?: string;
  number: number;
  title: string;
  body?: string;
  authorLogin: string;
  baseBranch?: string;
  headBranch?: string;
  baseSha?: string;
  headSha: string;
  diffHash?: string;
  reviewStatus: ReviewStatus;
  debtScore?: number;
  lastReviewId?: string;
  updatedAt?: string;
};

export type DiffFile = {
  filename: string;
  status: string;
  patch?: string;
  additions: number;
  deletions: number;
};

export type PullRequestDiff = {
  githubPrId: number;
  githubPrNumber: number;
  title: string;
  body: string;
  authorLogin: string;
  baseBranch: string;
  headBranch: string;
  baseSha: string;
  headSha: string;
  status: string;
  diffHash: string;
  files: DiffFile[];
  patchText: string;
};

export type Finding = {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  filePath: string;
  startLine: number;
  endLine?: number;
  title: string;
  body: string;
  suggestion?: string;
  relatedContext?: Array<{
    filePath: string;
    symbolName?: string;
    reason: string;
    score?: number;
  }>;
};

export type Review = {
  id: string;
  status: Exclude<ReviewStatus, 'idle'>;
  cacheHit: boolean;
  summary?: string;
  debtScore?: number;
  findings: Finding[];
  model?: string;
  error?: string;
  completedAt?: string;
};

export type ReviewStatusEvent = {
  reviewId: string;
  status: Exclude<ReviewStatus, 'idle'>;
  cacheHit?: boolean;
  debtScore?: number;
  findingsCount?: number;
  error?: string;
};

export type Comment = {
  id: string;
  authorId?: string;
  parentId: string | null;
  filePath: string;
  line: number;
  side?: 'LEFT' | 'RIGHT';
  body: string;
  resolved: boolean;
  source?: 'human' | 'ai';
  createdAt?: string;
};

export type DebtPoint = {
  id: string;
  score: number;
  findingsCount: number;
  pullRequestId?: string;
  recordedAt: string;
};

export type SearchChunk = {
  id: string;
  filePath: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  score: number;
  content: string;
};
