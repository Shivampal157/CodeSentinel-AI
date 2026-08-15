import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

const qdrantUrl = (process.env.QDRANT_URL ?? 'http://localhost:6333').replace(/\/$/, '');
const collection = process.env.QDRANT_COLLECTION ?? 'code_chunks';

async function main() {
  const cols = await fetch(`${qdrantUrl}/collections`);
  const colsJson = await cols.json();
  console.log('collections:', JSON.stringify(colsJson, null, 2));

  const one = await fetch(`${qdrantUrl}/collections/${collection}`);
  if (one.status === 404) {
    console.log(`collection "${collection}" not created yet — import a repo first`);
    return;
  }
  const body = await one.json();
  console.log(`collection ${collection}:`, JSON.stringify(body, null, 2));

  const count = await fetch(`${qdrantUrl}/collections/${collection}/points/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exact: true }),
  });
  console.log('points count:', await count.text());
}

void main();
