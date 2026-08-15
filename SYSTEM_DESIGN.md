# CodeSentinel AI — System Design

## Overview

CodeSentinel is a MERN-stack collaborative code review product. MongoDB stores users, repos, PRs, reviews, and comments. Redis backs caching, rate limits, BullMQ, and Socket.io fan-out. Qdrant stores code-chunk embeddings for RAG. Claude generates grounded review findings; OpenAI (or Voyage) produces embeddings.

```
Browser (React + Monaco)
    │  REST + Socket.io
API (Express) ── Redis adapter ── Redis ── BullMQ workers
    │                │
    ├─ MongoDB       ├─ review cache (diffHash TTL)
    └─ Qdrant ←── embeddings ←── OpenAI / Voyage
```

## Why Qdrant (not MongoDB vector search)

- **Workload split**: Mongo owns transactional review/auth state; Qdrant owns ANN search with payload filters (`repoId`, `filePath`).
- **Indexing model**: HNSW + Cosine is first-class; filtering by `repoId` during search is cheap and predictable.
- **Ops clarity**: vector collection lifecycle (create, payload indexes, count, delete-by-filter) is explicit and verifiable via HTTP (`/collections`, `/points/count`).
- **Cost of coupling**: putting 1536-d vectors beside PR documents would bloat working sets and mix backup/restore concerns.

Mongo Atlas Vector Search is fine for some apps; here we want a **dedicated** vector engine you can curl and prove is real.

## Why Redis pub/sub for Socket.io

`@socket.io/redis-adapter` publishes connection events across API instances. Without it, `io.to('pr:123').emit(...)` only hits sockets on the same Node process. Horizontal scale (two API replicas behind a load balancer) requires a shared bus — Redis is already required for BullMQ and cache, so we reuse it.

Workers do **not** hold Socket.io connections. They `PUBLISH` to `codesentinel:realtime`; the API bridge `SUBSCRIBE`s and emits into rooms. That keeps workers thin and avoids opening duplicate Socket.io servers.

## Chunking strategy

| Language | Strategy | Tradeoff |
|---|---|---|
| JS/TS | `@babel/parser` + traverse — functions, classes, methods, interfaces | Accurate symbol boundaries; fails soft to file chunk on parse errors |
| Python/Go/Java/Rust/Ruby | Definition-line regex + span until next definition | Not full tree-sitter WASM in v1 (Windows-friendly); still **not** naive N-line windows |
| Other / binary-skipped | Skipped by extension denylist | Keeps embedding cost bounded |

Chunks store `contentHash` so incremental PR updates can delete-by-`filePath` and re-upsert only changed files.

## Queue design

Two BullMQ queues on Redis:

1. **`embedding`** — full repo index or incremental file re-index. Concurrency 2.
2. **`ai-review`** — RAG retrieve → Claude → cache → persist findings/comments/debt. Concurrency 1 (protect Anthropic rate limits).

API enqueues; worker processes. Progress and completion go through the Redis realtime channel → Socket.io rooms `repo:{id}` / `pr:{id}`.

## Review cache

Key: `review:result:{diffHash}` (SHA-256 of head SHA + patch text). TTL 24h. Winston logs **HIT** / **MISS** / **SET** so you can prove Redis is in the path — not an in-process Map.

## Auth

GitHub OAuth authorization-code flow → store GitHub user access token (repo scope) on the user document → issue JWT access (15m) + refresh (7d). Refresh tokens are hashed in Redis (`auth:refresh:{jti}`) for revocation.

## Security notes

- Rate limiting via `rate-limiter-flexible` + Redis (not memory).
- Zod validation on mutating routes.
- Cookies `httpOnly` + Bearer access token for Socket.io handshake.
