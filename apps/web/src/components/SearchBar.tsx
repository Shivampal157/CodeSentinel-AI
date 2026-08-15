import { FileCode2, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, type SearchChunk } from '../lib/api';

export function SearchBar({ repositoryId, disabled }: { repositoryId: string | null; disabled?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!repositoryId || query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api<{ chunks: SearchChunk[] }>(`/repos/${repositoryId}/search`, {
        method: 'POST',
        body: { query: query.trim(), topK: 8 },
      });
      setResults(response.chunks);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={(event) => void submit(event)} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={!repositoryId || disabled}
          placeholder={repositoryId ? 'Search symbols, patterns, or behavior…' : 'Select a repository to search'}
          className="h-10 w-full border border-white/10 bg-ink-950 pl-10 pr-24 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-signal-green/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          disabled={!repositoryId || disabled || loading || query.trim().length < 2}
          className="absolute right-1.5 top-1.5 h-7 border border-white/10 bg-ink-800 px-3 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-signal-red">{error}</p>}
      {results.length > 0 && (
        <div className="mt-3 max-h-80 overflow-y-auto border border-white/10 bg-ink-950">
          {results.map((result) => (
            <div key={result.id} className="border-b border-white/[0.07] p-3 last:border-0">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <FileCode2 className="h-3.5 w-3.5 text-signal-green" />
                {result.filePath}
                <span className="text-slate-600">L{result.startLine}–{result.endLine}</span>
                <span className="ml-auto text-[10px] text-slate-600">{Math.round(result.score * 100)}% match</span>
              </div>
              <pre className="mt-2 overflow-hidden whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-500">
                {result.content.slice(0, 420)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
