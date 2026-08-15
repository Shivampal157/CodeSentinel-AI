import { MongoClient, ObjectId } from 'mongodb';
import { Queue } from 'bullmq';

const mongoUri =
  'mongodb://codesentinel:cs_mongo_dev_k7p2n@localhost:27017/codesentinel?authSource=admin';
const redisUrl = 'redis://:cs_redis_dev_m4q8w@localhost:6379/0';

function connectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null as null,
  };
}

async function main() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const repos = client.db('codesentinel').collection('repositories');
  const repo = await repos.findOne({ fullName: 'Shivampal157/kubescape' });
  if (!repo) {
    throw new Error('kubescape repo not found');
  }

  await repos.updateOne(
    { _id: repo._id },
    { $set: { indexStatus: 'indexing', indexError: null, chunkCount: 0 } },
  );

  const queue = new Queue('embedding', { connection: connectionFromUrl(redisUrl) });
  const job = await queue.add(
    'index-repo',
    {
      repositoryId: repo._id.toString(),
      userId: (repo.ownerId as ObjectId).toString(),
      mode: 'full',
    },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  );

  console.log(
    JSON.stringify({
      repositoryId: repo._id.toString(),
      jobId: job.id,
      status: 'reindex enqueued',
    }),
  );

  await queue.close();
  await client.close();
}

void main();
