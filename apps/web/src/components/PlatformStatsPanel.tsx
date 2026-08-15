import { Activity, Database, GitPullRequest, Layers, Zap } from 'lucide-react';
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
    return <div className="surface p-4 text-xs text-ink-faint">Loading platform stats…</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Repos indexed', value: stats.repositories.ready, sub: `${stats.repositories.total} total`, icon: Database },
    { label: 'Vector chunks', value: stats.repositories.indexedChunks, sub: 'Qdrant points', icon: Layers },
    { label: 'Pull requests', value: stats.pullRequests.total, sub: 'imported', icon: GitPullRequest },
    { label: 'AI reviews', value: stats.reviews.total, sub: `${stats.reviews.cacheHitRatePct}% cache hit`, icon: Zap },
    { label: 'Redis cache keys', value: stats.redis.reviewCacheKeys, sub: 'review results', icon: Activity },
  ];

  return (
    <section className="surface">
      <div className="border-b border-paper-line px-4 py-3">
        <h2 className="font-display text-sm font-bold text-ink">Platform metrics</h2>
        <p className="mt-1 text-[11px] text-ink-faint">
          Live · uptime {stats.uptimeSec}s · Prometheus at /api/metrics
        </p>
      </div>
      <div className="grid gap-px bg-paper-line sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-white p-4">
            <div className="flex items-center gap-2 text-ink-faint">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-ink">{value}</div>
            <div className="mt-1 text-[11px] text-ink-faint">{sub}</div>
          </div>
        ))}
      </div>
      {stats.recentActivity.length > 0 && (
        <div className="border-t border-paper-line px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Recent activity</div>
          <ul className="mt-2 space-y-1">
            {stats.recentActivity.slice(0, 5).map((entry, i) => (
              <li key={`${entry.action}-${i}`} className="text-[11px] text-ink-muted">
                <span className="font-medium text-mark">{entry.action}</span>
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
