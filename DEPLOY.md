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

## Option B — Split deploy (Railway / Render / Fly)

| Component | Suggested host |
|---|---|
| API + Worker | Railway or Render (Node 20) |
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
