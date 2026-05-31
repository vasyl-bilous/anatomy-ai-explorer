# Anatomy AI Explorer

A lightweight biomedical research prototype — explore regions of the human body,
select a region (synchronized body markers ↔ disease cards), drill into the brain,
and generate an **asynchronous, simulated AI analysis** with a full
`idle → processing → completed | failed` lifecycle.

Built with **React 19 + TypeScript + Vite** (frontend) and **Node.js + NestJS 11 +
Prisma + Postgres** (backend).

---

## Quick start

### Option A — Docker (one command)

Requires Docker. From the repo root:

```bash
docker compose up --build
```

This brings up Postgres + the API, runs migrations, seeds reference data, builds
the React client, and serves everything on a single origin:

→ **http://localhost:4000** (SPA, API under `/api/v1`, Swagger at `/api/docs`)

### Option B — local dev (two processes, hot reload)

Requires Node 22+ and a Postgres reachable via `DATABASE_URL`.

```bash
# 1. env
cp .env.example .env            # adjust DATABASE_URL if needed

# 2. backend
npm install
npm run db:migrate:deploy       # create tables
npm run prisma:seed             # load regions + markers (app is empty without this)
npm run start:dev               # API on http://localhost:4000

# 3. frontend (separate terminal)
cd client
npm install
npm run dev                     # Vite on http://localhost:5173 (proxies /api → :4000)
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the API, so
the client code is identical in dev and prod (same-origin relative URLs).

> **Why seed matters:** region/marker data is loaded by a seed step, not at app
> runtime (see [ADR 0001](docs/adr/0001-seed-strategy.md)). Without it the app
> loads but shows no regions. In prod the Docker entrypoint runs migrate + seed
> automatically before the server starts.

---

## What it does

- **Explorer** (`/`) — a faint body illustration with clickable marker anchors and
  a synchronized disease-card list. Selection is two-way (marker ↔ card), driven by
  one `selectedRegionId`; clicking empty space deselects. Selecting **doesn't**
  navigate — a separate **"Next level"** button (disabled until something is
  selected) enters the drill-down.
- **Drill-down** (`/region/:id`) — for **Alzheimer's Disease**, the body is replaced
  by a brain illustration with markers + an accordion of 7 sub-regions
  (Entorhinal Cortex, Hippocampus, …), two-way highlighted. Other diseases show a
  tidy "Coming soon" (the assignment provides only the brain — we don't invent data).
- **AI analysis** — "Generate AI Analysis" runs a simulated async job:
  `POST /api/v1/analyses` → `202 {processing}`, then the client polls
  `GET /api/v1/analyses/:id` until `completed` (summary, key findings, confidence,
  timestamp) or `failed` (with retry). Completed results are cached per region, so
  revisiting is instant.

---

## Architecture (short)

```
Browser ─▶ React SPA (Vite) ─▶ /api proxy (dev) | same origin (prod)
                                   │
                                   ▼
                               NestJS API ──▶ Prisma ──▶ Postgres   (regions, markers)
                                   │
                                   └── in-memory analysis jobs (mock; ADR 0003)
```

- **Single source of truth for the API contract** in `src/shared/contracts/`
  (framework-agnostic types), copied to `client/src/types/contract.ts`.
- **Response envelope** `{ success, data, … }` applied by an interceptor; the client
  unwraps `.data` centrally.
- **Regions** are persisted reference data (Prisma + seed). **Analyses** are
  ephemeral in-memory jobs — a deliberate prototype trade-off
  ([ADR 0003](docs/adr/0003-in-memory-analysis-job.md)).
- **Async** is POST + polling, not SSE
  ([ADR 0002](docs/adr/0002-async-analysis-polling.md)); the polling state machine
  is a hand-written, unit-tested `useAnalysis` hook (anti-double-submit, timeout
  cap, stale-job guard via a run-token, **`AbortController`** that cancels the
  in-flight request on a new run / unmount, 404→terminal, retry).
- **Prod** serves the built client from NestJS (same origin,
  [ADR 0004](docs/adr/0004-serve-client-via-nestjs.md)).

More detail: [`docs/`](docs/) — ADRs, the Figma design spec, and per-milestone
retrospectives. The build journey is in [`PLANNING.md`](PLANNING.md);
project conventions in [`CLAUDE.md`](CLAUDE.md).

---

## Tests & CI

```bash
# backend
npm run typecheck && npm run lint && npm run knip && npm test && npm run build
# frontend
cd client && npm run typecheck && npm run lint && npm test && npm run build
```

`.github/workflows/ci.yml` runs the full gate (backend on a Postgres service +
frontend) on every push/PR. The most valuable test is
`client/src/lib/useAnalysis.test.ts` — the async state machine (transitions,
anti-double-submit, timeout, 404-terminal, retry, cache) with fake timers.

---

## Deploy (Render)

The multi-stage `Dockerfile` produces one image that serves SPA + API. On Render:

1. Create a **Postgres** instance; copy its connection string.
2. Create a **Web Service** from this repo, environment **Docker**.
3. Set env: `DATABASE_URL` (from step 1), `NODE_ENV=production`,
   `CORS_ORIGINS=https://<your-app>.onrender.com`.
4. Enable **"Wait for CI to pass"** so deploys only happen after the GitHub Actions
   gate is green.

The container entrypoint runs `prisma migrate deploy` + seed (idempotent) before
starting, so a fresh database is ready on first boot.

---

## Notes / with more time

- **Data provenance:** the seed (10 diseases, brain sub-regions, markers) stands in
  for a production ETL over curated medical ontologies (MONDO / UBERON / ICD-11) —
  see ADR 0001. Marker positions are stored as percentages of the illustration box
  (responsive); brain markers come from the Figma layout, body markers are placed
  at sensible anatomical percentages.
- **What I'd do with more time:** persist analyses via an outbox + worker (survive
  restart, ADR 0003); push status over SSE instead of polling (ADR 0002); extend
  drill-down to more organs; a persistent/versioned analysis cache; deeper
  accessibility + touch-tooltip polish; OpenAPI-generated client types.
- **AI-tool usage** is documented in [`docs/ai-usage.md`](docs/ai-usage.md).
