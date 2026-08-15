import { ArrowUpRight, Box, GitBranch, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { IndexStatus, Repository } from '../lib/api';
import clsx from 'clsx';

const statusStyles: Record<IndexStatus, string> = {
  ready: 'border-signal-green/25 bg-signal-green/10 text-signal-green',
  indexing: 'border-signal-amber/25 bg-signal-amber/10 text-signal-amber',
  pending: 'border-slate-600 bg-slate-800 text-slate-300',
  failed: 'border-signal-red/25 bg-signal-red/10 text-signal-red',
};

export function StatusBadge({ status }: { status: IndexStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', statusStyles[status])}>
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
        'group w-full border-b border-white/[0.07] px-4 py-3 text-left transition',
        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]',
      )}
    >
      <div className="flex items-start gap-3">
        <Box className={clsx('mt-0.5 h-4 w-4', selected ? 'text-signal-green' : 'text-slate-500')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-100">{name ?? repository.fullName}</span>
            <StatusBadge status={repository.indexStatus} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{owner}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600">
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
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-signal-red/90">{repository.indexError}</p>
          )}
        </div>
        <Link
          to={`/app/repos/${repository.id}`}
          onClick={(event) => event.stopPropagation()}
          className="rounded p-1 text-slate-600 opacity-0 transition hover:bg-white/5 hover:text-white group-hover:opacity-100"
          aria-label={`Open ${repository.fullName}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </button>
  );
}
