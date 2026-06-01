# Anatomy AI Explorer

A lightweight biomedical research prototype — explore regions of the human body,
select a region (body markers ↔ disease cards stay in sync), drill into the brain,
and generate an **asynchronous, simulated AI analysis** with a full
`idle → processing → completed | failed` lifecycle.

**Live demo:** https://anatomy-ai-explorer.onrender.com
&nbsp;·&nbsp; **Stack:** React 19 + TypeScript + Vite (client) · NestJS 11 + Prisma + Postgres (API)

> **Reviewer's note — read this first.** This is a take-home prototype, but it's
> deliberately built to look like a _small slice of a real product_ rather than a
> throwaway. Where I simplified, I did it on purpose and say so below
> ([§ Deliberate scope](#deliberate-scope--what-id-do-for-production)). Where I went
> heavier than a toy needs (a real database, a layered NestJS API, CI/CD, Docker,
> tests, ADRs), it's to show the production shape — not because the feature set
> requires it. The goal was to demonstrate judgment on **async flows, state
> transitions, and frontend/backend communication**, which is what the brief asks
> to be evaluated on.

---

## Table of contents

- [Quick start](#quick-start)
- [What it does](#what-it-does)
- [Project structure](#project-structure-and-why-its-shaped-this-way)
- [How a request flows](#how-a-request-flows)
- [The async AI flow (the core)](#the-async-ai-flow-the-core)
- [Deliberate scope](#deliberate-scope--what-id-do-for-production)
- [Tests & CI/CD](#tests--cicd)
- [Deploy](#deploy-render)
- [Further reading](#further-reading)

---

## Quick start

### Option A — Docker (one command, closest to prod)

Requires Docker. From the repo root:

```bash
docker compose up --build
```

Brings up Postgres + the API, runs migrations, seeds reference data, builds the
React client, and serves **everything on one origin**:

→ **http://localhost:4000** (SPA · API under `/api/v1` · Swagger at `/api/docs`)

### Option B — local dev (two processes, hot reload)

Requires Node 22+ and a reachable Postgres.

```bash
# 1. env
cp .env.example .env                # adjust DATABASE_URL if needed

# 2. backend
npm install
npm run db:migrate:deploy           # create tables
npm run prisma:seed                 # load regions + markers (app is empty without it)
npm run start:dev                   # API on http://localhost:4000

# 3. frontend (separate terminal)
cd client && npm install && npm run dev   # Vite on :5173, proxies /api → :4000
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the API, so
client code uses the same relative URLs in dev and prod.

> **Why the seed step matters:** region/marker data is loaded by a seed, not at app
> runtime ([ADR 0001](docs/adr/0001-seed-strategy.md)). Skip it and the app loads
> but shows no regions. In prod the Docker entrypoint runs migrate + seed
> automatically before the server starts, so a fresh DB is ready on first boot.

---

## What it does

- **Explorer** (`/`) — a faint body illustration with clickable marker anchors and a
  synchronized disease-card list. Selection is **two-way** (marker ↔ card), driven by
  a single `selectedRegionId`; clicking empty space deselects. Selecting **does not
  navigate** — a separate **"Next level"** button (disabled until something is
  selected) enters the drill-down. This separation of _select_ vs _navigate_ is
  intentional and matches the Figma interaction model.
- **Drill-down** (`/region/:id`) — for **Alzheimer's Disease** the body is replaced by
  a brain illustration with markers + an accordion of 7 sub-regions
  (Entorhinal Cortex, Hippocampus, …), highlighted two-way. Other diseases show a
  tidy **"Coming soon"** — the brief only provides the brain, so I don't invent
  medical data for organs that weren't specified.
- **AI analysis** — "Generate AI Analysis" runs a simulated async job:
  `POST /api/v1/analyses` → `202 {processing}`, then the client polls
  `GET /api/v1/analyses/:id` until `completed` (summary, key findings, confidence,
  timestamp) or `failed` (with retry). Completed results are cached per region, so
  revisiting is instant.

---

## Project structure (and why it's shaped this way)

```
anatomy-ai-explorer/
├── src/                              # ── NestJS API (one HTTP entry point, no worker) ──
│   ├── main.ts                       #   bootstrap + global interceptors + Swagger + listen
│   ├── app.module.ts                 #   wiring: Config · Prisma · ErrorHandler · Health · Regions · Analysis
│   ├── core/bootstrap/               #   app assembly split into readable steps
│   │   ├── create-app.ts             #     NestFactory.create
│   │   ├── setup-app.ts              #     helmet · compression · CORS allowlist · ValidationPipe
│   │   │                             #     · /api prefix · URI versioning (v1) · trust proxy
│   │   ├── swagger.bootstrap.ts      #     Swagger at /api/docs
│   │   └── graceful-shutdown.ts      #     SIGTERM/SIGINT → app.close() with a grace timeout
│   ├── shared/contracts/             #   FRAMEWORK-AGNOSTIC API types — the single source of truth
│   │                                 #     for the request/response shape (see "one contract" below)
│   ├── common/                       #   NestJS-bound cross-cutting concerns
│   │   ├── configs/                  #     Zod-validated env schema + typed configuration
│   │   ├── interceptors/             #     SuccessResponseInterceptor (envelope) + HTTP logging
│   │   ├── middlewares/              #     RequestIdMiddleware (request id → logs + error body)
│   │   ├── decorators/ swagger/      #     @ResponseMessage, @SkipResponseTransform, Swagger wrappers
│   │   └── logger/
│   ├── infrastructure/               #   adapters to the outside world
│   │   ├── prisma/                   #     @Global PrismaService (PrismaClient + pg adapter) + seed
│   │   └── health/                   #     Terminus probes: /api/health/live + /api/health/ready (DB)
│   └── modules/                      #   ── feature modules: controller → service → repository ──
│       ├── regions/                  #     read-only regions/markers from Postgres (GET list + by id)
│       └── analysis/                 #     async AI job: in-memory store + setTimeout + mock result
├── client/                           # ── React SPA — isolated toolchain (own package.json/tsconfig) ──
│   ├── src/
│   │   ├── pages/                    #     ExplorerPage · DrillDownPage (brain | ComingSoon)
│   │   ├── components/               #     AppShell, BodyIllustration, BrainIllustration,
│   │   │                             #     RegionMarkers, DiseaseCard, RegionAccordion, AnalysisPanel…
│   │   │                             #       each: Component.tsx + Component.css (global, BEM) + index.ts
│   │   ├── lib/                      #     api.ts (typed client, unwraps .data) · queries.ts (TanStack)
│   │   │                             #       · useAnalysis.ts  ← the async state machine (the core)
│   │   ├── theme/                    #     tokens + global.css (:root CSS variables, runtime-themeable)
│   │   └── types/contract.ts         #     hand-synced COPY of src/shared/contracts (see below)
│   └── public/anatomy/               #     body-outline.png, brain.png (served at /anatomy/*)
├── prisma/schema.prisma              # Region + Marker models (snake_case columns via @map)
├── Dockerfile · docker-compose.yml   # multi-stage build → one image (see "deploy")
├── .github/workflows/ci.yml          # CI gate: backend (on Postgres) + frontend
├── docs/                             # ADRs · Figma design spec · per-milestone retrospectives
├── PLANNING.md                       # milestone roadmap (the build journey, M0–M9)
└── CLAUDE.md                         # project conventions / working agreement
```

**The few decisions a reviewer is most likely to probe — answered up front:**

| You might ask…                                                                    | Answer                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why a layered NestJS API for 2 endpoints?**                                     | To show the production shape: `controller → service → repository`, DTO validation, a typed config boundary, interceptors, health checks. The feature set is small on purpose; the _structure_ is what's being demonstrated.                                                                         |
| **Why one API contract in `src/shared/contracts/`, then _copied_ to the client?** | One canonical, framework-agnostic type definition is the source of truth. The client keeps a hand-synced **copy** rather than importing it, so the two toolchains stay isolated (a real product would extract a shared workspace package — noted, not done, to keep a 2-endpoint prototype simple). |
| **Why `common/` vs `shared/`?**                                                   | `shared/` is framework-agnostic (no Nest imports) — "shaped so a frontend _could_ consume it". `common/` is NestJS-bound cross-cutting. The dependency rule is one-way: `common`/`modules` may use `shared`, never the reverse.                                                                     |
| **Why is the response wrapped in `{ success, data, … }`?**                        | A `SuccessResponseInterceptor` applies one consistent envelope; the client unwraps `.data` centrally, so call sites stay clean and errors share a shape (with a request id for tracing).                                                                                                            |
| **Why co-located global CSS + BEM instead of CSS Modules / Tailwind?**            | All design values are `:root` CSS variables, so themes can switch **at runtime** via `var(--…)`. CSS Modules bake values at build time; Tailwind would duplicate the tokens. BEM avoids collisions without scope.                                                                                   |
| **Why store marker positions as percentages?**                                    | They're anchored as `%` of a fixed-aspect-ratio illustration box, so they stay correct as the layout scales (responsive without JS).                                                                                                                                                                |

---

## How a request flows

```
Browser
  │  relative /api/v1/... (same code in dev & prod)
  ▼
React SPA (Vite)
  │  dev: Vite proxy /api → :4000      prod: same origin (NestJS serves the SPA)
  ▼
NestJS API   setup-app: CORS · helmet · ValidationPipe (whitelist + forbidNonWhitelisted)
  │                     · /api prefix · URI version v1 · RequestId middleware
  ├─▶ SuccessResponseInterceptor → wraps every result in { success, data, … }
  ├─▶ Regions module → Prisma → Postgres        (persisted reference data)
  └─▶ Analysis module → in-memory job store      (ephemeral, mock; ADR 0003)
```

- **Regions** are persisted (Prisma + seed). **Analyses** are ephemeral in-memory
  jobs — a deliberate prototype trade-off ([ADR 0003](docs/adr/0003-in-memory-analysis-job.md)).
- **Prod serves the built client from NestJS** on one origin
  ([ADR 0004](docs/adr/0004-serve-client-via-nestjs.md)) — no second host, no CORS in
  the happy path, one URL to deploy.

---

## The async AI flow (the core)

This is what the brief asks to be judged on, so it's hand-written and unit-tested
rather than hidden inside a library.

- **Backend** (`modules/analysis/`): `POST` creates a job (`202 processing`) held in
  an in-memory `Map`; a `setTimeout` simulates work and resolves to a rule-based mock
  result, with a small injectable-RNG failure rate so the **retry** path is real and
  testable. `GET /:id` is polled until terminal.
- **Frontend** (`client/src/lib/useAnalysis.ts`): a `useAnalysis` state machine —
  `idle → processing → completed | failed` — with:
  - **anti-double-submit** (ignore clicks while processing),
  - **polling cap / timeout** (don't poll forever),
  - **stale-job guard** via a monotonic run-token (a superseded response is ignored —
    correctness independent of the network),
  - **`AbortController`** that cancels the in-flight request on a new run / unmount
    (no wasted round-trip, no setState-after-unmount),
  - **404 → terminal** (an in-memory job lost to a restart is treated as failed),
  - **retry** and a **per-region result cache** (revisiting is instant; "Regenerate"
    forces a fresh run).

> Regions use **TanStack Query** (cache, loading/error, hover-prefetch) because there
> the library just removes boilerplate. The analysis flow is custom **because the
> state machine _is_ the thing being assessed**. In a real product I'd likely drive
> the polling with TanStack Query too; doing it by hand here is a deliberate
> demonstration choice. The reasoning lives in the ADRs under [`docs/`](docs/).

---

## Deliberate scope — what I'd do for production

**Simplified on purpose (it's an MVP):**

- **No authentication / authorization.** There are no users, no per-user data, and
  no mutations beyond creating a throwaway analysis — so auth would add surface
  without exercising anything the brief evaluates. In production this sits behind
  auth (JWT/session) with guards on the controllers; the layered structure already
  has the seam for it.
- **Analyses are in-memory and mock.** No real ML, and jobs don't survive a restart
  (the client handles a lost job as a terminal failure). The realistic version is an
  **outbox + worker queue** so jobs are durable and horizontally scalable
  ([ADR 0003](docs/adr/0003-in-memory-analysis-job.md)).
- **Polling, not streaming.** Simple and robust for this scale; **SSE/WebSocket** is
  the upgrade for instant push ([ADR 0002](docs/adr/0002-async-analysis-polling.md)).
- **Seed instead of an ETL.** The seed (diseases, brain sub-regions, markers) stands
  in for a real pipeline over curated medical ontologies (MONDO / UBERON / ICD-11)
  ([ADR 0001](docs/adr/0001-seed-strategy.md)).

**Heavier than a toy needs — on purpose, to show the production shape:**

- **A real database (Postgres + Prisma).** I could trivially have hard-coded the
  regions in a JSON file — but using a migrated, seeded relational store
  demonstrates schema design, the data-access layer, and the deploy-time
  migrate/seed lifecycle, which is closer to how this would really ship.
- **CI/CD + Docker.** A multi-stage `Dockerfile`, `docker compose`, and a GitHub
  Actions gate that deploys to Render only after checks pass.
- **Secret-leak protection at commit time.** A husky pre-commit hook runs
  **gitleaks** to block any staged secret (API keys, JWTs, AWS creds, a stray
  `.env` value) before it can reach the repo — `.env*` is git-ignored, and this is
  the safety net for when someone pastes a credential into tracked code by mistake.
- **Tests, ADRs, and a visible build history.** Decisions are recorded as ADRs;
  `PLANNING.md` + retrospectives show the plan adapting mid-flight.

**With more time:** outbox/worker durability; SSE push; more organs in the
drill-down; a persistent/versioned analysis cache; deeper accessibility + a
touch-tooltip variant (current tooltips are hover-only); OpenAPI-generated client
types to replace the hand-synced contract copy.

---

## Tests & CI/CD

```bash
# backend
npm run typecheck && npm run lint && npm run knip && npm test && npm run build
# frontend
cd client && npm run typecheck && npm run lint && npm test && npm run build
```

- **Backend:** unit specs live next to source (`*.spec.ts`) — config validation, the
  analysis service (with fake timers), the regions layer, the Prisma lifecycle.
- **Frontend:** Vitest + Testing Library. The highest-value spec is
  `client/src/lib/useAnalysis.test.ts` — the async state machine (transitions,
  anti-double-submit, polling timeout, 404-terminal, retry, cache, abort).
- **CI** (`.github/workflows/ci.yml`): on every push/PR, a **backend job** (spins up
  a Postgres service, then generate → migrate → typecheck → lint → format → knip →
  test → build) and a **frontend job** (typecheck → lint → test → build).
- **CD:** Render is set to **"Wait for CI to pass"**, so a merge to `main` deploys
  only after the gate is green. `main` is the deploy branch; work lands via PR
  (`dev → main`).

### Pre-commit hooks (local guardrails)

Installed via **husky** (`prepare` script). They fail fast on a developer's machine,
before bad content can be pushed or reach CI:

- **`gitleaks`** — scans staged changes for secrets and **blocks the commit** if it
  finds one (config: `.gitleaks.toml`). This is the guarantee that a credential — or
  a leaked `.env` value — never lands in git history. `.env*` files are git-ignored
  to begin with; gitleaks covers the case where a secret is pasted into tracked code.
  Bypass is possible only with an explicit `git commit --no-verify`.
- **`lint-staged`** — runs `eslint --fix` on staged `.ts/.js` and `prettier --write`
  on staged docs/config, so formatting and lint issues are fixed before they exist in
  a commit (CI then re-checks the same gates).
- **`commitlint`** (commit-msg hook) — enforces Conventional Commits, keeping the
  history readable (and the `fix:` / `feat:` prefixes you see throughout meaningful).

> Hooks need the dev dependencies installed (`npm install` runs `prepare`). `gitleaks`
> itself is a separate binary (`brew install gitleaks`); if it's absent the hook warns
> and skips rather than failing the commit — CI is still the backstop.

---

## Deploy (Render)

The multi-stage `Dockerfile` builds the client (`vite build`) and the API
(`nest build`) and produces a lean `node:22-slim` runtime that serves **SPA + API
from one image**.

> **Why `slim`, not `alpine`?** Prisma's binary query engine needs glibc/openssl;
> alpine's musl would break it. A deliberate, non-obvious choice.

**Steps:** create a **Postgres** instance → create a **Web Service** from this repo
(runtime: Docker) → set env `DATABASE_URL` (append `?sslmode=require` for Render's
managed PG), `NODE_ENV=production`, `CORS_ORIGINS=https://<app>.onrender.com` →
enable **"Wait for CI to pass"**.

The container entrypoint (`docker-entrypoint.sh`) runs, **before** the server starts:
`prisma migrate deploy` → idempotent seed → `node dist/main.js`. So a brand-new
database is migrated and populated on first boot, and a redeploy is safe (the seed
is idempotent).

---

## Further reading

- [`docs/adr/`](docs/adr/) — Architecture Decision Records (async strategy,
  in-memory job, seed strategy, single-origin serving).
- [`docs/figma-design-spec.md`](docs/figma-design-spec.md) — design source of truth
  (tokens, screens, interaction model, AI-flow states).
- [`docs/retrospectives/`](docs/retrospectives/) — one short retro per milestone.
- [`docs/ai-usage.md`](docs/ai-usage.md) — how AI tooling was used while building.
- [`PLANNING.md`](PLANNING.md) — milestone roadmap · [`CLAUDE.md`](CLAUDE.md) —
  conventions.
