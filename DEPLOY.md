# Deployment Guide

Production deployment for CodeSentinel AI — Docker Compose stack with API, worker, web, MongoDB, Redis, and Qdrant.

## Option A — Full Docker stack (recommended)

### 1. Configure environment

Copy `.env.example` to `.env` and set production values:

```bash
cp .env.example .env
```

Required for production:

| Variable | Notes |
|---|---|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 48+ char random hex |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth callback must match public URL |
| `GITHUB_CALLBACK_URL` | e.g. `https://api.yourdomain.com/api/auth/github/callback` |
| `CLIENT_ORIGIN` | e.g. `https://yourdomain.com` |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | Embeddings provider |
| `ANTHROPIC_API_KEY` | AI reviews |
| `TRUST_PROXY=true` | Set when behind nginx/load balancer |

### 2. Start production stack

```bash
npm run docker:prod
```

Services:

| Service | Port | Purpose |
|---|---|---|
| web | 8080 | React SPA (nginx) |
| api | 4000 | Express + Socket.io |
| worker | — | BullMQ jobs |
| mongo | internal | MongoDB |
| redis | internal | Cache + queues |
| qdrant | internal | Vector search |

### 3. Verify

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/metrics
npm run smoke
```

### 4. GitHub OAuth in production

Create OAuth app with:

- Homepage: `https://yourdomain.com`
- Callback: `https://yourdomain.com/api/auth/github/callback` (if nginx proxies `/api`)

Or expose API on subdomain: `https://api.yourdomain.com/api/auth/github/callback`

---

## Option B — Render (recommended for free tier)

Deploy API, worker, and web on [Render](https://render.com) using MongoDB Atlas, Upstash Redis, and Qdrant Cloud.

### Quick deploy (Blueprint)

1. Push `render.yaml` to GitHub (`main`).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect repo `Shivampal157/CodeSentinel-AI`.
4. Paste secrets when prompted (see env table below).
5. After API is live, set `VITE_API_URL`, `CLIENT_ORIGIN`, and `GITHUB_CALLBACK_URL`, then **Redeploy** web + API.

### Manual deploy (3 services)

| Service | Type | Build | Start / Publish |
|---|---|---|---|
| `codesentinel-api` | Web Service (Node 20) | `npm ci && npm run build:api` | `npm run start:api` |
| `codesentinel-worker` | Web Service (Node 20) | `npm ci && npm run build:worker` | `npm run start:worker` |
| `codesentinel-web` | Static Site | `npm ci && npm run build:web` | Publish `apps/web/dist` |

**API settings:** Health check path `/api/health` · Region Oregon (free) · Do **not** set `PORT` manually.

**Web settings:** Add rewrite `/*` → `/index.html` (SPA). Set `VITE_API_URL` **before** build.

**Worker:** Runs as a free web service; binds `PORT` with a minimal health endpoint (Render requirement).

### Env vars (API + worker)

| Variable | Example / notes |
|---|---|
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` (API only) |
| `MONGODB_URI` | `mongodb+srv://...@cluster.../codesentinel?...` |
| `REDIS_URL` | `rediss://...` (Upstash) |
| `QDRANT_URL` / `QDRANT_API_KEY` | Qdrant Cloud |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 48+ char random hex |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | AI keys |
| `EMBEDDING_PROVIDER` | `gemini` |

**API only (after URLs known):**

| Variable | Value |
|---|---|
| `CLIENT_ORIGIN` | `https://codesentinel-web.onrender.com` |
| `GITHUB_CALLBACK_URL` | `https://codesentinel-api.onrender.com/api/auth/github/callback` |

**Web only:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://codesentinel-api.onrender.com` (no trailing slash) |

### Deploy order

1. Deploy **API** → wait for Live → open `https://<api>/api/health`
2. Deploy **worker** with same DB/Redis/Qdrant keys
3. Set API `CLIENT_ORIGIN` + `GITHUB_CALLBACK_URL` → redeploy API
4. Set web `VITE_API_URL` → deploy **web**
5. Update GitHub OAuth app callback URL to match API

### GitHub OAuth (production)

- Homepage: your Render web URL
- Callback: `https://<api-host>/api/auth/github/callback`

---

## Option C — Split deploy (Railway / Fly + Vercel)

| Component | Suggested host |
|---|---|
| API + Worker | Railway or Fly (Node 20) |
| Web | Vercel or Cloudflare Pages |
| MongoDB | MongoDB Atlas |
| Redis | Upstash or Redis Cloud |
| Qdrant | Qdrant Cloud or self-hosted |

Set env vars on each service. Point `CLIENT_ORIGIN` to web URL and `GITHUB_CALLBACK_URL` to API URL.

Build commands:

```bash
npm ci
npm run build
# API: node apps/api/dist/index.js
# Worker: npx tsx apps/worker/src/index.ts
# Web: serve apps/web/dist
```

---

## Observability

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Dependency checks (mongo, redis, qdrant) |
| `GET /api/ready` | Kubernetes-style readiness |
| `GET /api/metrics` | Prometheus text format |
| `GET /api/stats` | Authenticated platform stats (auth required) |

Wire Prometheus/Grafana to scrape `/api/metrics`. Key metrics:

- `http_requests_total`
- `http_request_duration_ms` (p50/p95)
- `review_cache_total{result="hit|miss"}`
- `reviews_completed_total`

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. Docker image builds (api, worker, web)

---

## Smoke test

```bash
npm run smoke
# or
API_URL=https://yourdomain.com npm run smoke
```

---

## Security checklist

- [ ] Strong JWT secrets (never commit `.env`)
- [ ] `TRUST_PROXY=true` behind reverse proxy
- [ ] Rate limiting enabled (120 req/min per user/IP)
- [ ] Helmet security headers
- [ ] GitHub OAuth callback URL locked to production domain
- [ ] MongoDB/Redis not exposed publicly in production
