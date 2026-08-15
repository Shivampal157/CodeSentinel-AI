import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { Redis } from 'ioredis';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

type CheckResult = { name: string; ok: boolean; detail: string };

const mongoUri = process.env.MONGODB_URI;
const redisUrl = process.env.REDIS_URL;
const qdrantUrl = process.env.QDRANT_URL?.replace(/\/$/, '');

if (!mongoUri || !redisUrl || !qdrantUrl) {
  console.error('Missing MONGODB_URI, REDIS_URL, or QDRANT_URL in .env');
  process.exit(1);
}

async function checkMongo(): Promise<CheckResult> {
  const client = new MongoClient(mongoUri!, { serverSelectionTimeoutMS: 5000 });
  const started = Date.now();
  try {
    await client.connect();
    const ping = await client.db('admin').command({ ping: 1 });
    const dbs = await client.db().admin().listDatabases();
    return {
      name: 'mongo',
      ok: ping.ok === 1,
      detail: `ping ok in ${Date.now() - started}ms; databases: ${dbs.databases.map((d) => d.name).join(', ')}`,
    };
  } catch (err) {
    return { name: 'mongo', ok: false, detail: err instanceof Error ? err.message : String(err) };
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function checkRedis(): Promise<CheckResult> {
  const redis = new Redis(redisUrl!, { maxRetriesPerRequest: 1, connectTimeout: 5000, lazyConnect: true });
  const started = Date.now();
  try {
    await redis.connect();
    const pong = await redis.ping();
    const info = await redis.info('server');
    const version = /redis_version:([^\r\n]+)/.exec(info)?.[1] ?? 'unknown';
    return {
      name: 'redis',
      ok: pong === 'PONG',
      detail: `PONG in ${Date.now() - started}ms; version ${version}`,
    };
  } catch (err) {
    return { name: 'redis', ok: false, detail: err instanceof Error ? err.message : String(err) };
  } finally {
    redis.disconnect();
  }
}

async function checkQdrant(): Promise<CheckResult> {
  const started = Date.now();
  try {
    const ready = await fetch(`${qdrantUrl}/readyz`);
    const readyText = (await ready.text()).trim();
    const root = await fetch(`${qdrantUrl}/`);
    const body = (await root.json()) as { title?: string; version?: string };
    const collectionsRes = await fetch(`${qdrantUrl}/collections`);
    const collections = (await collectionsRes.json()) as {
      result?: { collections?: { name: string }[] };
    };
    const names = collections.result?.collections?.map((c) => c.name) ?? [];
    return {
      name: 'qdrant',
      ok: ready.ok,
      detail: `readyz="${readyText}" in ${Date.now() - started}ms; ${body.title ?? 'qdrant'} ${body.version ?? '?'}; collections=[${names.join(', ') || 'none yet'}]`,
    };
  } catch (err) {
    return { name: 'qdrant', ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function main(): Promise<void> {
  const results = await Promise.all([checkMongo(), checkRedis(), checkQdrant()]);
  const failed = results.filter((r) => !r.ok);

  for (const result of results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${result.name} — ${result.detail}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} service(s) failed. Is docker compose up? npm run infra:up`);
    process.exit(1);
  }

  console.log('\nAll infra checks passed. Mongo, Redis, and Qdrant are reachable from the host.');
  console.log('CLI equivalents:');
  console.log('  docker compose ps');
  console.log('  curl http://localhost:6333/readyz');
  console.log('  curl http://localhost:6333/collections');
  console.log('  docker exec codesentinel-redis redis-cli ping');
  console.log(
    '  docker exec codesentinel-mongo mongosh -u codesentinel -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin --eval "db.adminCommand({ ping: 1 })"',
  );
}

void main();
