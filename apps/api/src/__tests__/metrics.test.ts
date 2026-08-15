import {
  incCounter,
  observeHistogram,
  recordHttpRequest,
  recordReviewCache,
  renderPrometheusMetrics,
  resetMetricsForTests,
} from '../lib/metrics.js';

describe('metrics', () => {
  beforeEach(() => {
    resetMetricsForTests();
  });

  it('renders prometheus counters', () => {
    incCounter('http_requests_total', { method: 'GET', route: '/api/health', status: '200' });
    const body = renderPrometheusMetrics();
    expect(body).toContain('codesentinel_up 1');
    expect(body).toContain('http_requests_total{method="GET",route="/api/health",status="200"} 1');
  });

  it('records http latency summaries', () => {
    recordHttpRequest('POST', '/api/repos/:id/pull-requests', 201, 42);
    recordHttpRequest('POST', '/api/repos/:id/pull-requests', 201, 58);
    const body = renderPrometheusMetrics();
    expect(body).toContain('_count 2');
    expect(body).toContain('quantile="0.95"');
  });

  it('tracks review cache hits and misses', () => {
    recordReviewCache(true);
    recordReviewCache(false);
    const body = renderPrometheusMetrics();
    expect(body).toContain('review_cache_total{result="hit"} 1');
    expect(body).toContain('review_cache_total{result="miss"} 1');
  });

  it('observes histogram values', () => {
    observeHistogram('http_request_duration_ms', 10, { method: 'GET', route: '/api/stats' });
    const body = renderPrometheusMetrics();
    expect(body).toContain('http_request_duration_ms{method="GET",route="/api/stats"}_sum 10');
  });
});
