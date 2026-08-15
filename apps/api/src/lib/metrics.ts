type Labels = Record<string, string>;

const counters = new Map<string, number>();
const histograms = new Map<string, number[]>();

function labelKey(name: string, labels: Labels = {}): string {
  const pairs = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`);
  return pairs.length ? `${name}{${pairs.join(',')}}` : name;
}

export function incCounter(name: string, labels?: Labels, by = 1): void {
  const key = labelKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + by);
}

export function observeHistogram(name: string, value: number, labels?: Labels): void {
  const key = labelKey(name, labels);
  const bucket = histograms.get(key) ?? [];
  bucket.push(value);
  histograms.set(key, bucket);
}

export function recordHttpRequest(method: string, route: string, status: number, durationMs: number): void {
  incCounter('http_requests_total', { method, route, status: String(status) });
  observeHistogram('http_request_duration_ms', durationMs, { method, route });
}

export function recordReviewCache(hit: boolean): void {
  incCounter('review_cache_total', { result: hit ? 'hit' : 'miss' });
}

export function recordReviewCompleted(cacheHit: boolean): void {
  incCounter('reviews_completed_total', { cache: cacheHit ? 'hit' : 'miss' });
}

export function resetMetricsForTests(): void {
  counters.clear();
  histograms.clear();
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx] ?? 0;
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  lines.push('# HELP codesentinel_up API process is running');
  lines.push('# TYPE codesentinel_up gauge');
  lines.push('codesentinel_up 1');

  lines.push('# HELP process_uptime_seconds Process uptime');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.round(process.uptime())}`);

  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, value] of counters.entries()) {
    if (key.startsWith('http_requests_total')) lines.push(`${key} ${value}`);
  }

  lines.push('# HELP http_request_duration_ms HTTP request latency');
  lines.push('# TYPE http_request_duration_ms summary');
  for (const [key, values] of histograms.entries()) {
    if (!key.startsWith('http_request_duration_ms')) continue;
    const baseLabels = key.replace(/^http_request_duration_ms/, '');
    const sum = values.reduce((a, b) => a + b, 0);
    lines.push(`http_request_duration_ms${baseLabels}_count ${values.length}`);
    lines.push(`http_request_duration_ms${baseLabels}_sum ${sum}`);
    lines.push(`http_request_duration_ms${baseLabels.replace('}', ',quantile="0.5"}')} ${quantile(values, 0.5)}`);
    lines.push(`http_request_duration_ms${baseLabels.replace('}', ',quantile="0.95"}')} ${quantile(values, 0.95)}`);
  }

  lines.push('# HELP review_cache_total Review cache lookups');
  lines.push('# TYPE review_cache_total counter');
  for (const [key, value] of counters.entries()) {
    if (key.startsWith('review_cache_total')) lines.push(`${key} ${value}`);
  }

  lines.push('# HELP reviews_completed_total Completed AI reviews');
  lines.push('# TYPE reviews_completed_total counter');
  for (const [key, value] of counters.entries()) {
    if (key.startsWith('reviews_completed_total')) lines.push(`${key} ${value}`);
  }

  return `${lines.join('\n')}\n`;
}
