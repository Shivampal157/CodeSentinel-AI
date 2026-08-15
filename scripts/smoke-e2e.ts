/**
 * Smoke test for local/dev stack — no auth required for health/metrics.
 * Usage: npm run smoke
 */
const API = process.env.API_URL ?? 'http://localhost:4000';

async function check(path: string, expectStatus = 200): Promise<void> {
  const res = await fetch(`${API}${path}`);
  if (res.status !== expectStatus) {
    const body = await res.text();
    throw new Error(`${path} expected ${expectStatus}, got ${res.status}: ${body.slice(0, 200)}`);
  }
  console.log(`✓ ${path} → ${res.status}`);
}

async function main(): Promise<void> {
  console.log(`Smoke testing ${API}\n`);
  await check('/api/health');
  await check('/api/ready');
  await check('/api/metrics');

  const health = await (await fetch(`${API}/api/health`)).json() as {
    status: string;
    checks: Record<string, { ok: boolean }>;
  };
  const failed = Object.entries(health.checks).filter(([, c]) => !c.ok);
  if (failed.length) {
    throw new Error(`Unhealthy dependencies: ${failed.map(([k]) => k).join(', ')}`);
  }
  console.log('\nAll smoke checks passed.');
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
