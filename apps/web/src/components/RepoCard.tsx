import { ArrowUpRight, Box, GitBranch, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { IndexStatus, Repository } from '../lib/api';
import clsx from 'clsx';

const statusStyles: Record<IndexStatus, string> = {
  ready: 'border-mark/30 bg-mark-soft text-mark-deep',
  indexing: 'border-signal-amber/30 bg-amber-50 text-signal-amber',
  pending: 'border-paper-line bg-paper-soft text-ink-muted',
  failed: 'border-signal-red/30 bg-red-50 text-signal-red',
};

export function StatusBadge({ status }: { status: IndexStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        statusStyles[status],
      )}
    >
      {status === 'indexing' && <LoaderCircle className="h-3 w-3 animate-spin" />}
      {status}
    </span>
  );
}

export function RepoCard({
  repository,
  selected,
  onSelect,
}: {
  repository: Repository;
  selected: boolean;
  onSelect: () => void;
}) {
  const [owner, name] = repository.fullName.split('/');
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'group w-full border-b border-paper-line px-4 py-3 text-left transition',
        selected ? 'bg-mark-soft/60' : 'hover:bg-paper-soft',
      )}
    >
      <div className="flex items-start gap-3">
        <Box className={clsx('mt-0.5 h-4 w-4', selected ? 'text-mark' : 'text-ink-faint')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{name ?? repository.fullName}</span>
            <StatusBadge status={repository.indexStatus} />
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-faint">{owner}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {repository.defaultBranch ?? 'main'}
            </span>
            <span>{repository.chunkCount ?? 0} chunks</span>
            {repository.lastIndexedAt && (
              <span>{formatDistanceToNow(new Date(repository.lastIndexedAt), { addSuffix: true })}</span>
            )}
          </div>
          {repository.indexStatus === 'failed' && repository.indexError && (
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-signal-red">{repository.indexError}</p>
          )}
        </div>
        <Link
          to={`/app/repos/${repository.id}`}
          onClick={(event) => event.stopPropagation()}
          className="p-1 text-ink-faint opacity-0 transition hover:text-ink group-hover:opacity-100"
          aria-label={`Open ${repository.fullName}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </button>
  );
}
