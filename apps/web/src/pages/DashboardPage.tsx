import { Download, Lock, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type DebtPoint, type GithubRepository, type Repository } from '../lib/api';
import { DebtChart } from '../components/DebtChart';
import { PlatformStatsPanel } from '../components/PlatformStatsPanel';
import { RepoCard, StatusBadge } from '../components/RepoCard';
import { SearchBar } from '../components/SearchBar';
import { useAppStore } from '../stores/app-store';

export function DashboardPage() {
  const repositories = useAppStore((state) => state.repositories);
  const selectedRepoId = useAppStore((state) => state.selectedRepoId);
  const loadingRepos = useAppStore((state) => state.loadingRepos);
  const error = useAppStore((state) => state.error);
  const loadRepositories = useAppStore((state) => state.loadRepositories);
  const selectRepository = useAppStore((state) => state.selectRepository);
  const addRepository = useAppStore((state) => state.addRepository);
  const [debtPoints, setDebtPoints] = useState<DebtPoint[]>([]);
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const selected = repositories.find((repo) => repo.id === selectedRepoId) ?? null;

  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  useEffect(() => {
    const busy = repositories.some(
      (repo) => repo.indexStatus === 'indexing' || repo.indexStatus === 'pending',
    );
    if (!busy) return;
    const id = window.setInterval(() => {
      void loadRepositories();
    }, 4000);
    return () => window.clearInterval(id);
  }, [repositories, loadRepositories]);

  useEffect(() => {
    if (!selectedRepoId) {
      setDebtPoints([]);
      return;
    }
    setLoadingDebt(true);
    void api<{ points: DebtPoint[] }>(`/repos/${selectedRepoId}/debt-trend`)
      .then((response) => setDebtPoints(response.points))
      .catch(() => setDebtPoints([]))
      .finally(() => setLoadingDebt(false));
  }, [selectedRepoId]);

  const openImport = async () => {
    setImportOpen(true);
    setLoadingGithub(true);
    try {
      const { repos } = await api<{ repos: GithubRepository[] }>('/repos/github');
      setGithubRepos(repos);
    } finally {
      setLoadingGithub(false);
    }
  };

  const importedNames = useMemo(() => new Set(repositories.map((repo) => repo.fullName)), [repositories]);

  const importRepository = async (githubRepo: GithubRepository) => {
    setImporting(githubRepo.fullName);
    try {
      const imported = await api<Pick<Repository, 'id' | 'fullName' | 'indexStatus'>>('/repos', {
        method: 'POST',
        body: { fullName: githubRepo.fullName },
      });
      addRepository({
        ...imported,
        defaultBranch: githubRepo.defaultBranch,
        htmlUrl: githubRepo.htmlUrl,
        chunkCount: 0,
      });
      setImportOpen(false);
      void loadRepositories();
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end gap-4 border-b border-paper-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Repositories</h1>
          <p className="mt-1 text-sm text-ink-muted">Index health, search, and debt for the repos you import.</p>
        </div>
        <button type="button" onClick={() => void openImport()} className="btn-primary ml-auto h-9 text-xs">
          <Plus className="h-4 w-4" />
          Import repository
        </button>
      </div>

      <div className="mt-5">
        <PlatformStatsPanel />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="surface">
          <div className="flex h-10 items-center border-b border-paper-line px-4">
            <span className="text-xs font-semibold text-ink">Imported</span>
            <span className="ml-auto font-mono text-[10px] text-ink-faint">{repositories.length}</span>
          </div>
          <div className="max-h-[650px] overflow-y-auto">
            {loadingRepos && <p className="p-5 text-xs text-ink-faint">Loading repositories…</p>}
            {!loadingRepos && repositories.length === 0 && (
              <div className="p-8 text-center">
                <Download className="mx-auto h-5 w-5 text-ink-faint" />
                <p className="mt-3 text-sm font-medium text-ink">No repositories yet</p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">Import a GitHub repo to start indexing.</p>
              </div>
            )}
            {repositories.map((repository) => (
              <RepoCard
                key={repository.id}
                repository={repository}
                selected={repository.id === selectedRepoId}
                onSelect={() => selectRepository(repository.id)}
              />
            ))}
          </div>
          {error && <p className="border-t border-signal-red/20 p-3 text-xs text-signal-red">{error}</p>}
        </section>

        <div className="min-w-0 space-y-5">
          <section className="surface p-4">
            <div className="mb-3 flex items-center">
              <div>
                <h2 className="text-sm font-semibold text-ink">Semantic search</h2>
                <p className="mt-0.5 text-xs text-ink-faint">Query indexed code by intent or symbol.</p>
              </div>
              {selected && (
                <div className="ml-auto">
                  <StatusBadge status={selected.indexStatus} />
                </div>
              )}
            </div>
            <SearchBar repositoryId={selectedRepoId} disabled={selected?.indexStatus !== 'ready'} />
          </section>

          <section className="surface p-4">
            <div className="mb-3 flex items-end">
              <div>
                <h2 className="text-sm font-semibold text-ink">Technical debt</h2>
                <p className="mt-0.5 text-xs text-ink-faint">{selected?.fullName ?? 'Select a repository'}</p>
              </div>
              {debtPoints.length > 0 && (
                <div className="ml-auto text-right">
                  <p className="font-mono text-xl font-semibold text-signal-amber">{debtPoints.at(-1)?.score}</p>
                  <p className="text-[9px] uppercase tracking-wider text-ink-faint">Current score</p>
                </div>
              )}
            </div>
            <DebtChart points={debtPoints} loading={loadingDebt} />
          </section>
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onMouseDown={() => setImportOpen(false)}>
          <aside
            className="h-full w-full max-w-lg border-l border-paper-line bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-16 items-center border-b border-paper-line px-5">
              <div>
                <h2 className="text-sm font-semibold text-ink">Import from GitHub</h2>
                <p className="mt-0.5 text-[11px] text-ink-faint">Prefer small repos for a fast first index.</p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="ml-auto p-2 text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)] overflow-y-auto">
              {loadingGithub && <p className="p-5 text-xs text-ink-faint">Loading GitHub repositories…</p>}
              {githubRepos.map((repo) => {
                const imported = importedNames.has(repo.fullName);
                return (
                  <div key={repo.githubId} className="flex items-center gap-3 border-b border-paper-line px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{repo.fullName}</p>
                        {repo.private && <Lock className="h-3 w-3 text-ink-faint" />}
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-ink-faint">{repo.defaultBranch}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void importRepository(repo)}
                      disabled={imported || importing !== null}
                      className="btn-ghost disabled:opacity-40"
                    >
                      {imported ? 'Imported' : importing === repo.fullName ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
