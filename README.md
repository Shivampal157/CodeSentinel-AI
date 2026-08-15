# CodeSentinel AI

GitHub-connected code review that actually reads your codebase.

Most AI review tools only see the diff. CodeSentinel indexes the repo into a vector store, retrieves related symbols at review time, and grounds Claude findings in that context — so comments can say “this pattern also appears in `auth.service.ts`,” not just “looks wrong.”

**Repo:** [github.com/Shivampal157/CodeSentinel-AI](https://github.com/Shivampal157/CodeSentinel-AI)

---

## What it does

1. Sign in with GitHub OAuth  
2. Import a repository and index it (AST chunks → embeddings → Qdrant)  
3. Pull in a PR by number and open the Monaco diff view  
4. Run an AI review — BullMQ job, RAG retrieval, Claude, Redis cache  
5. Get findings, debt score, and live status over Socket.io  
6. Search the indexed codebase in natural language  

No mock databases. MongoDB, Redis, and Qdrant are real services (Docker locally, or Atlas / Upstash / Qdrant Cloud for deploy).

---

## Architecture

```
┌─────────────┐     REST + WS      ┌──────────────┐
│  React app  │ ◄────────────────► │  Express API │
│  + Monaco   │                    │  + Socket.io │
└─────────────┘                    └──────┬───────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
         ┌─────────┐                ┌─────────┐                 ┌─────────┐
         │ MongoDB │                │  Redis  │                 │ Qdrant  │
         │ users,  │                │ cache,  │                 │ vectors │
         │ PRs,    │                │ BullMQ, │                 │  RAG    │
         │ reviews │                │ pub/sub │                 └────▲────┘
         └─────────┘                └────┬────┘                      │
                                         │                    embeddings
                                         ▼                      (Gemini /
                                   ┌───────────┐               OpenAI / Voyage)
                                   │  Worker   │
                                   │ embed +   │──────► Claude review
                                   │ ai-review │
                                   └───────────┘
```

Deeper tradeoffs (why Qdrant over Mongo vectors, Socket.io Redis adapter, chunking): [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

---

## Stack

| Area | Choices |
|------|---------|
| Frontend | React 18, TypeScript, Vite, Tailwind, Zustand, Monaco |
| API | Express, Zod, Winston, Helmet, rate limiting |
| Jobs | BullMQ workers (`embedding`, `ai-review`) |
| Realtime | Socket.io + Redis adapter |
| Data | MongoDB · Redis · Qdrant |
| AI | Gemini / OpenAI / Voyage embeddings · Anthropic Claude |
| Ops | Docker Compose, Prometheus `/api/metrics`, GitHub Actions CI |

Monorepo: `apps/web` · `apps/api` · `apps/worker` · `packages/shared`

---

## Quick start

**Needs:** Node 20+, Docker Desktop, and the API keys below.

```bash
git clone https://github.com/Shivampal157/CodeSentinel-AI.git
cd CodeSentinel-AI
cp .env.example .env
npm install
```

Fill `.env` (minimum):

| Variable | Where |
|----------|--------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | [OAuth Apps](https://github.com/settings/developers) — callback `http://localhost:4000/api/auth/github/callback` |
| `GEMINI_API_KEY` *(or OpenAI / Voyage)* | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |

```bash
npm run infra:up      # Mongo + Redis + Qdrant
npm run infra:verify  # optional sanity check
npm run dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API health | http://localhost:4000/api/health |
| Metrics | http://localhost:4000/api/metrics |

**Tip:** set `EMBEDDING_PROVIDER=gemini` and `INDEX_MAX_CHUNKS=80` if you’re on free-tier embedding quotas.

---

## Demo flow

1. Open the app → **Continue with GitHub**  
2. Import a repo you own (or a fork with at least one PR)  
3. Wait until index status is **ready**  
4. Enter a real PR number → **Import and open**  
5. **Run AI Review** — watch status events, then findings + debt score  
6. Try semantic search on the repo page  

Re-run the same review on an unchanged diff and check API logs for `redis cache HIT`.

---

## Project layout

```
apps/
  api/       Express API, auth, RAG, review orchestration
  worker/    BullMQ processors (index + AI review)
  web/       React UI (dashboard, PR view, search)
packages/
  shared/    Zod schemas, queue names, socket events
docker/      Production Dockerfiles + nginx
scripts/     Infra verify, smoke test
```

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run infra:up` | Start Mongo, Redis, Qdrant |
| `npm run infra:verify` | Ping infra from the host |
| `npm run dev` | API + web + worker together |
| `npm test` | Jest (chunking, metrics, GitHub errors, RAG helpers) |
| `npm run smoke` | Hit `/health`, `/ready`, `/metrics` |
| `npm run docker:prod` | Full production Compose stack |

---

## Observability

- `GET /api/health` — Mongo / Redis / Qdrant checks  
- `GET /api/ready` — readiness probe  
- `GET /api/metrics` — Prometheus text (request latency, review cache hits)  
- `GET /api/stats` — authenticated platform stats + recent audit events  

CI runs typecheck, lint, tests, and Docker image builds on every push ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).

Production notes: [DEPLOY.md](./DEPLOY.md)

---

## Design notes (short)

- **Vectors live in Qdrant**, not Mongo — keeps ANN search separate from PR/auth state  
- **Workers never own Socket.io** — they publish on Redis; the API bridges into rooms  
- **Review cache key** = `sha256(headSha + patch)` so identical diffs skip Claude  
- **Chunking** prefers AST/symbol boundaries for JS/TS; definition-span heuristics for other languages  

Full write-up: [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)

---

## License

MIT — use it, fork it, break it, improve it.
