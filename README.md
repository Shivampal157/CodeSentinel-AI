# CodeSentinel AI

Real-time collaborative code review with **RAG over your actual repo** (Qdrant + real embeddings + Claude). MongoDB, Redis, and Qdrant run in Docker — no in-memory fakes.

## Stack

| Layer | Tech |
|---|---|
| Web | React 18, TypeScript, Tailwind, Zustand, Monaco, Socket.io client |
| API | Node, Express, Zod, Winston, Socket.io + Redis adapter |
| Worker | BullMQ (embedding + AI review jobs) |
| Data | MongoDB, Redis, Qdrant |
| AI | Gemini / OpenAI / Voyage embeddings, Anthropic Claude |

## Prerequisites

- Node 20+
- Docker Desktop
- API keys (see below)

## 1. Clone & env

```bash
cp .env.example .env
```

Generate JWT secrets (already done if you used the scaffolded `.env`):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Keys you must provide

| Variable | Where |
|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers). Callback: `http://localhost:4000/api/auth/github/callback`. Scopes used: `read:user user:email repo` |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (optional if using Gemini) |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier friendly) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |

Set `EMBEDDING_PROVIDER=gemini|openai|voyage`. Optional: `INDEX_MAX_CHUNKS=80` for free-tier rate limits.

## 2. Infra

```bash
npm install
npm run infra:up
npm run infra:verify
```

### Prove containers are real

```bash
docker compose ps
curl http://localhost:6333/readyz
curl http://localhost:6333/collections
docker exec codesentinel-redis redis-cli -a <REDIS_PASSWORD> ping
docker exec codesentinel-mongo mongosh -u codesentinel -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin --eval "db.adminCommand({ ping: 1 })"
```

After first repo index:

```bash
curl http://localhost:6333/collections/code_chunks
# expect points_count > 0

docker exec codesentinel-redis redis-cli -a <REDIS_PASSWORD> keys "review:result:*"
# after a review, expect keys; re-run same PR review and check API logs for "redis cache HIT"
```

## 3. Run apps

```bash
npm run dev
```

- Web: http://localhost:5173  
- API health: http://localhost:4000/api/health  
- Worker: processes `embedding` and `ai-review` queues  

## 4. Happy path

1. Open the web app → **Continue with GitHub**
2. Import a repo → wait until index status is `ready` (Qdrant points increase)
3. Import a PR by number → **Run AI Review**
4. Watch Socket.io status events; findings + debt score appear
5. Use semantic search on the repo page (natural language → Qdrant)

## Tests

```bash
npm test
```

Jest covers AST chunking, RAG/review helpers, GitHub error mapping, and Prometheus metrics.

## Production

```bash
npm run docker:prod    # full stack on :8080 (web) and :4000 (api)
npm run smoke          # health + metrics smoke test
```

See [DEPLOY.md](./DEPLOY.md) for Railway/Render split deploy, Prometheus metrics, and CI.

## Observability

| Endpoint | Purpose |
|---|---|
| `/api/health` | Mongo + Redis + Qdrant dependency checks |
| `/api/ready` | Readiness probe |
| `/api/metrics` | Prometheus metrics (latency, cache hits, reviews) |
| `/api/stats` | Authenticated dashboard stats + audit trail |

## Docs

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for Qdrant vs Mongo vectors, Socket.io scaling, chunking tradeoffs, and queue design.

## Scripts

| Script | Purpose |
|---|---|
| `npm run infra:up` | Start Mongo + Redis + Qdrant |
| `npm run infra:verify` | Host-side client checks |
| `npm run dev` | API + web + worker |
| `npm test` | Unit tests |
| `npm run smoke` | Health/metrics smoke test |
| `npm run docker:prod` | Production Docker stack |
