import { Activity, Database, GitPullRequest, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type PlatformStats = {
  repositories: { total: number; ready: number; indexedChunks: number };
  pullRequests: { total: number };
  reviews: { total: number; cacheHits: number; cacheHitRatePct: number };
  redis: { reviewCacheKeys: number };
  uptimeSec: number;
  recentActivity: Array<{
    action: string;
    resourceType: string;
    resourceId?: string;
    at: string;
  }>;
};

export function PlatformStatsPanel() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api<PlatformStats>('/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-white/10 bg-ink-900 p-4 text-xs text-slate-500">
        Loading platform stats…
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Repos indexed', value: stats.repositories.ready, sub: `${stats.repositories.total} total`, icon: Database },
    { label: 'Vector chunks', value: stats.repositories.indexedChunks, sub: 'Qdrant points', icon: Sparkles },
    { label: 'Pull requests', value: stats.pullRequests.total, sub: 'imported', icon: GitPullRequest },
    { label: 'AI reviews', value: stats.reviews.total, sub: `${stats.reviews.cacheHitRatePct}% cache hit`, icon: Zap },
    { label: 'Redis cache keys', value: stats.redis.reviewCacheKeys, sub: 'review results', icon: Activity },
  ];

  return (
    <section className="border border-white/10 bg-ink-900">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform metrics</h2>
        <p className="mt-1 text-[11px] text-slate-500">Live stats · API uptime {stats.uptimeSec}s · Prometheus at /api/metrics</p>
      </div>
      <div className="grid gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-ink-900 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      {stats.recentActivity.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recent activity</div>
          <ul className="mt-2 space-y-1">
            {stats.recentActivity.slice(0, 5).map((entry, i) => (
              <li key={`${entry.action}-${i}`} className="text-[11px] text-slate-400">
                <span className="text-signal-green">{entry.action}</span>
                {' · '}
                {entry.resourceType}
                {entry.resourceId ? ` #${entry.resourceId.slice(-6)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
