import { ArrowLeft, Bot, GitBranch, GitPullRequest, RefreshCw } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api, formatApiError, type PullRequest, type Repository } from '../lib/api';
import { StatusBadge } from '../components/RepoCard';

export function RepositoryPage() {
  const { repoId = '' } = useParams();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [repo, prs] = await Promise.all([
        api<Repository>(`/repos/${repoId}`),
        api<{ pullRequests: PullRequest[] }>(`/repos/${repoId}/pull-requests`),
      ]);
      setRepository(repo);
      setPullRequests(prs.pullRequests);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [repoId]);

  const importPr = async (event: FormEvent) => {
    event.preventDefault();
    if (!number) return;
    setImporting(true);
    setError(null);
    try {
      const imported = await api<PullRequest>(`/repos/${repoId}/pull-requests`, {
        method: 'POST',
        body: { number: Number(number) },
      });
      navigate(`/app/pull-requests/${imported.id}`);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setImporting(false);
    }
  };

  const reindex = async () => {
    setReindexing(true);
    try {
      const result = await api<{ id: string; indexStatus: Repository['indexStatus'] }>(`/repos/${repoId}/reindex`, {
        method: 'POST',
      });
      setRepository((current) => (current ? { ...current, indexStatus: result.indexStatus } : current));
    } finally {
      setReindexing(false);
    }
  };

  if (loading) return <div className="p-8 text-xs text-ink-faint">Loading repository…</div>;

  return (
    <div className="p-5 lg:p-7">
      <Link to="/app" className="inline-flex items-center gap-2 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        Repositories
      </Link>
      <div className="mt-5 flex flex-wrap items-end gap-4 border-b border-paper-line pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{repository?.fullName}</h1>
            {repository && <StatusBadge status={repository.indexStatus} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              {repository?.defaultBranch}
            </span>
            <span>{repository?.chunkCount ?? 0} indexed chunks</span>
            {repository?.lastIndexedAt && (
              <span>Indexed {formatDistanceToNow(new Date(repository.lastIndexedAt), { addSuffix: true })}</span>
            )}
          </div>
        </div>
        <button type="button" onClick={() => void reindex()} disabled={reindexing} className="btn-ghost ml-auto disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${reindexing ? 'animate-spin' : ''}`} />
          {reindexing ? 'Queueing…' : 'Reindex codebase'}
        </button>
      </div>

      {error && <div className="mt-4 border border-signal-red/20 bg-red-50 p-3 text-xs text-signal-red">{error}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="surface">
          <div className="flex h-11 items-center border-b border-paper-line px-4">
            <GitPullRequest className="mr-2 h-4 w-4 text-ink-faint" />
            <h2 className="text-sm font-semibold text-ink">Imported pull requests</h2>
            <span className="ml-auto font-mono text-[10px] text-ink-faint">{pullRequests.length}</span>
          </div>
          {pullRequests.map((pullRequest) => (
            <Link
              key={pullRequest.id}
              to={`/app/pull-requests/${pullRequest.id}`}
              className="flex items-center gap-4 border-b border-paper-line px-4 py-3 transition hover:bg-paper-soft"
            >
              <span className="font-mono text-xs text-ink-faint">#{pullRequest.number}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{pullRequest.title}</p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  {pullRequest.authorLogin} ·{' '}
                  {pullRequest.updatedAt
                    ? formatDistanceToNow(new Date(pullRequest.updatedAt), { addSuffix: true })
                    : pullRequest.headSha.slice(0, 7)}
                </p>
              </div>
              <ReviewBadge status={pullRequest.reviewStatus} />
              {pullRequest.debtScore !== undefined && (
                <span className="w-8 text-right font-mono text-xs text-signal-amber">{pullRequest.debtScore}</span>
              )}
            </Link>
          ))}
          {pullRequests.length === 0 && (
            <div className="p-10 text-center">
              <GitPullRequest className="mx-auto h-6 w-6 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-muted">No pull requests imported</p>
              <p className="mt-1 text-xs text-ink-faint">Enter a GitHub pull request number to begin.</p>
            </div>
          )}
        </section>

        <aside className="surface p-4">
          <Bot className="h-5 w-5 text-mark" />
          <h2 className="mt-3 text-sm font-semibold text-ink">Import pull request</h2>
          <p className="mt-1 text-xs leading-5 text-ink-faint">
            Fetch the latest diff from GitHub and prepare it for contextual review.
          </p>
          <form onSubmit={(event) => void importPr(event)} className="mt-5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Pull request number
            </label>
            <div className="mt-1.5 flex">
              <span className="grid h-9 w-9 place-items-center border border-r-0 border-paper-line bg-paper-soft font-mono text-xs text-ink-faint">
                #
              </span>
              <input
                type="number"
                min="1"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="h-9 min-w-0 flex-1 border border-paper-line bg-white px-2 font-mono text-xs outline-none focus:border-mark"
                placeholder="1"
              />
            </div>
            <button type="submit" disabled={!number || importing} className="btn-primary mt-3 h-9 w-full text-xs disabled:opacity-40">
              {importing ? 'Importing diff…' : 'Import and open'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function ReviewBadge({ status }: { status: PullRequest['reviewStatus'] }) {
  const tone =
    status === 'completed'
      ? 'text-mark'
      : status === 'failed'
        ? 'text-signal-red'
        : status === 'running' || status === 'queued'
          ? 'text-signal-amber'
          : 'text-ink-faint';
  return <span className={`text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{status}</span>;
}
