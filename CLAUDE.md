# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**Anatomy AI Explorer** — a lightweight biomedical research prototype. Users
explore parts of the human body, drill into a region (the brain), and trigger an
**asynchronous AI analysis** that returns simulated insights. Built as a home
assignment; the spec lives in [PROJECT.md](PROJECT.md) and the design extracted
from Figma lives in [docs/figma-design-spec.md](docs/figma-design-spec.md).

This repo currently contains a **NestJS backend skeleton** only. The React
frontend and the two feature modules (`regions`, `analysis`) are not built yet —
they will be planned in PLANNING.md.

> The skeleton was adapted from a larger template and then trimmed. Many
> template features (mailer, S3 files, outbox/worker, auth, admin, audit,
> metrics) were **removed** and are intentionally not part of this project.
> Describe only what is actually on disk.

## Commands

```bash
# Dev / build
npm run start:dev        # API in watch mode
npm run build            # nest build -> dist/
npm run start:prod       # node dist/main.js (serves client/dist if built)

# Quality gates
npm run typecheck        # tsc --noEmit (whole project incl. specs)
npm run lint             # eslint
npm run lint:fix
npm run format           # prettier --write
npm run format:check

# Tests
npm test                 # unit (*.spec.ts)
npm run test:cov         # with coverage thresholds

# Prisma
npm run db:generate      # generate client (after schema changes)
npm run db:migrate:dev   # create + apply dev migration
npm run db:migrate:deploy
npm run db:push          # push schema without migration (dev only)
npm run db:reset
npm run prisma:seed      # dev seed (tsx src/.../seed.ts)
npm run prisma:seed:prod # prod seed (node dist/.../seed.js — no tsx)
npm run db:setup         # migrate deploy + seed (dev)
npm run db:setup:prod    # migrate deploy + seed (prod, compiled)

# Docker (one-command full stack)
docker compose up --build   # db + api (migrate+seed+serve) on http://localhost:4000
```

Local DB: Postgres. Connect via `DATABASE_URL`.

## Docker / deploy

A multi-stage `Dockerfile` builds the client (`vite build`) and API (`nest build`)
and produces a lean `node:22-slim` runtime (slim, **not** alpine — Prisma's binary
engine needs glibc). `docker-entrypoint.sh` is the release phase:
`prisma migrate deploy` → `prisma:seed:prod` (idempotent) → `node dist/main.js`.
`docker compose up --build` brings up Postgres + the API and serves the SPA + API
on one origin (`:4000`). The same image deploys to Render (Docker web service +
managed Postgres, `DATABASE_URL` from env). See ADR 0004 (static serving) + 0001
(seed as release phase).

## Architecture (current skeleton)

Single **NestJS HTTP API** — one entry point `src/main.ts` (no worker runtime).

Bootstrap order (`src/core/bootstrap/`): `create-app` → `setup-app`
(helmet, compression, CORS allowlist from `cors.origins`, global `ValidationPipe`
with `transform`/`whitelist`/`forbidNonWhitelisted`, `RequestIdMiddleware`,
shutdown hooks, global prefix `/api`, URI versioning default `v1`,
`trust proxy`) → `swagger` → `graceful-shutdown`.

Global interceptors (wired in `src/main.ts`):

- **`SuccessResponseInterceptor`** — wraps every controller return into
  `{ success: true, data, message?, meta? }`. Opt out per-route with
  `@SkipResponseTransform()` (used by `/health`). Attach a message with
  `@ResponseMessage('...')`. Already-shaped envelopes pass through unchanged.
- **`HttpLoggingInterceptor`** — structured request/response logs.

Errors come from `@geren32/nestjs-error-handler` (registered in `AppModule`);
request IDs flow middleware → error envelope → logs.

### Layout

- `src/shared/` — **framework-agnostic** code (pure types / pure functions, no
  NestJS imports): `contracts/` holds the front/back API contract types (the
  canonical `ApiSuccessResponse` lives here too). **Dependency rule:** `shared`
  depends on nothing internal; `common` and `modules` may depend on `shared`,
  never the reverse. **When does something go in `shared/`?** Two gates, both
  required: (1) it's framework-agnostic (no `@Injectable`/Nest imports), and
  (2) it has ≥2 consumers (or is genuinely cross-cutting). A NestJS-bound provider
  used by a single module (e.g. `analysis`'s `RandomSource` testing seam) stays in
  that module until both gates are met — don't pre-extract.
  - **"FE can use it" is conceptual, not a physical import.** The client does
    **not** import from `src/shared/` (that would couple the two toolchains and
    break the backend/client isolation set up in M4). Instead the contract is
    **copied** to `client/src/types/contract.ts` and kept in sync by hand — a
    deliberate trade-off for a 2-endpoint prototype (a real product would extract
    a shared workspace package). `shared/` means "shaped so a frontend _could_
    consume it", and it's the single source the copy is mirrored from.
- `src/common/` — **NestJS-bound** cross-cutting: `configs/` (Zod `env.schema.ts` +
  `configuration.ts`), `dto/` (pagination, api-success — the latter re-exports the
  envelope from `shared`), `interceptors/`, `middlewares/`, `logger/`,
  `decorators/`, `swagger/` (response wrappers).
- `src/core/bootstrap/` — app assembly (above).
- `src/infrastructure/` — adapters to external systems:
  - `prisma/` — `@Global() PrismaService` (extends `PrismaClient`, `@prisma/adapter-pg`
    - `pg.Pool`), `TransactionManager`, empty `seed/seed.ts`.
  - `health/` — `@nestjs/terminus` probes at `/api/health/live` + `/api/health/ready`
    (the latter checks Prisma/DB), version-neutral, `@SkipResponseTransform()`.
- `src/app.module.ts` — registers `ConfigModule` (global, Zod-validated),
  `PrismaModule`, `ErrorHandlerModule`, `HealthModule`.

### Planned (not yet built)

- **`src/modules/regions/`** — read-only: serves anatomy regions + markers from
  Postgres (Prisma) via `GET /api/v1/regions`, `GET /api/v1/regions/:id`. Seeded
  data.
- **`src/modules/analysis/`** — async AI analysis. `POST /api/v1/analyses` →
  `202` `{ id, status: 'processing' }`; `GET /api/v1/analyses/:id` polled until
  `completed | failed`. In-memory job store + `setTimeout` simulation;
  rule-based mock result; small random failure rate to demo retry. (An ADR will
  document why in-memory now and how this maps to a real outbox/worker queue.)
- **`client/`** — Vite + React + TypeScript SPA. Dev: `vite` (5173) with `/api`
  proxy to Nest (4000). Prod: `vite build` → `dist/`, served statically by
  NestJS (`ServeStaticModule`, excluding `/api`).
  - **Styling:** plain **global CSS files co-located** with each component
    (`Component/Component.css`), **BEM** class names to avoid collisions —
    **no CSS Modules / no scope** (deliberate: scoped styles bake values at build
    time and block runtime theming). All design values come from **CSS custom
    properties** declared on `:root` (sourced from `theme/tokens.ts`), so themes
    (light/dark, accent) can be switched at runtime via `var(--…)`. No Tailwind
    (overkill for the custom anatomy components; would duplicate the tokens).

## Project Structure

```
anatomy-ai-explorer/
├── prisma/
│   ├── schema.prisma                # DB schema — Region + Marker models (snake_case @map)
│   ├── migrations/                  # single baseline: init_regions_markers
│   └── migration_lock.toml
├── src/
│   ├── main.ts                      # API entry — createApp + global interceptors + Swagger + listen
│   ├── app.module.ts                # Module wiring: Config, Prisma, ErrorHandler, Health (+ Regions/Analysis to come)
│   ├── core/bootstrap/              # App assembly
│   │   ├── create-app.ts            #   NestFactory.create
│   │   ├── setup-app.ts             #   helmet, compression, CORS, ValidationPipe, /api prefix, URI versioning v1, trust proxy
│   │   ├── swagger.bootstrap.ts     #   Swagger at /api/docs
│   │   └── graceful-shutdown.ts     #   SIGTERM/SIGINT shutdown hooks
│   ├── shared/                      # Framework-agnostic (FE+BE can use it); depends on nothing internal
│   │   └── contracts/              #   API contract types (canonical ApiSuccessResponse) + README (routes, px→%)
│   ├── common/                      # NestJS-bound cross-cutting (may depend on shared, not vice-versa)
│   │   ├── configs/                 #   Zod env.schema.ts + configuration.ts (read via ConfigService)
│   │   ├── dto/                     #   pagination + api-success (re-exports envelope from shared)
│   │   ├── interceptors/            #   SuccessResponseInterceptor (envelope) + HttpLoggingInterceptor
│   │   ├── middlewares/             #   RequestIdMiddleware (request id → logs/errors)
│   │   ├── decorators/              #   @ResponseMessage, @SkipResponseTransform
│   │   ├── swagger/                 #   Api{Success,Error}Response decorator wrappers
│   │   └── logger/                  #   logger setup
│   ├── infrastructure/              # Adapters to external systems
│   │   ├── prisma/                  #   @Global PrismaService (PrismaClient + @prisma/adapter-pg + pg.Pool), TransactionManager, seed/
│   │   └── health/                  #   @nestjs/terminus probes /api/health/live + /ready (DB), version-neutral
│   └── modules/                     # ── Feature modules (TO BUILD) ──
│       ├── regions/                 #   read-only regions+markers API (repo/service/controller/dto/res) — M3
│       └── analysis/                #   async in-memory AI-analysis job — M5 (analysis.constants.ts exists)
├── client/                          # ── React SPA (Vite+React 19+TS; own package.json/tsconfig/eslint) ──
│   ├── src/
│   │   ├── pages/                   #   ExplorerPage (body) + DrillDownPage (brain | ComingSoon)
│   │   ├── components/              #   AppShell, DiseaseCard, RegionMarkers, BodyIllustration,
│   │   │                           #   BrainIllustration, RegionAccordion, AnalysisPanel, ComingSoon
│   │   │                           #   (each: Component.tsx + Component.css [global, BEM] + index.ts)
│   │   ├── lib/                     #   api.ts (typed client, /api/v1, unwraps .data), queries.ts
│   │   │                           #   (TanStack Query + prefetch), useAnalysis.ts (async state machine)
│   │   ├── theme/                   #   tokens.ts + global.css (:root CSS vars, runtime-themeable)
│   │   └── types/contract.ts        #   API contract types — hand-synced copy of src/shared/contracts
│   ├── public/anatomy/              #   body-outline.png, brain.png (Figma assets)
│   ├── vite.config.ts               #   dev proxy /api → :4000   ·   vitest.config.ts (jsdom)
│   └── package.json                 #   isolated frontend deps (kept out of root knip)
│       # built output → client/dist, served by NestJS ServeStaticModule in prod — M8
├── docs/
│   ├── figma-design-spec.md         # Design source of truth (tokens, screens, interaction model, AI-flow)
│   ├── adr/                         # Architectural Decision Records (template.md) — async, in-memory, serve-static
│   └── retrospectives/              # Dev retrospectives (_template.md)
├── test/                            # integration / e2e (currently minimal)
├── eslint.config.mjs                # Flat config (strictTypeChecked); root scripts glob {src,test,prisma,scripts}
├── knip.json                        # Unused-export/dep check (CI gate) — sees src/**+test/** only, not client/
├── prisma.config.ts                 # Prisma standalone config
├── .env.example                     # NODE_ENV, PORT, CORS_ORIGINS, DATABASE_URL
├── PROJECT.md                       # Assignment spec
├── PLANNING.md                      # Milestone roadmap (M0–M9) — keep in sync as you build
└── CLAUDE.md                        # ← this file
```

> Frontend tests use **Vitest + @testing-library/react** (`cd client && npm test`).
> The key spec is `client/src/lib/useAnalysis.test.ts` (the async state machine:
> transitions, anti-double-submit, polling timeout, 404-terminal, retry).

## Conventions

- **Config — infra vs feature**: never read `process.env` in runtime code — go
  through `ConfigService`.
  - **Deployment/infra config** (varies per environment, cross-cutting:
    `DATABASE_URL`, `PORT`, `CORS_ORIGINS`) → global
    `common/configs/configuration.ts`. Add it by: extend `envSchema` (Zod) → map
    in `configuration.ts` → read via `config.get('path')`.
  - **Feature config** (genuinely belongs to one module AND must vary per
    environment) → a `<feature>.config.ts` **inside the module** via
    `registerAs('<ns>', …)` + `ConfigModule.forFeature(...)` — **not** the global
    config. The Zod env boundary still validates the vars centrally; only the
    namespace mapping lives in the module. (No such case exists yet.)
  - **Feature constants** (not env-tunable: business rules, limits, mock tuning,
    templates) → `<feature>.constants.ts` inside the module
    (e.g. `modules/analysis/analysis.constants.ts` — the mock fail-rate/delays).
    Don't expose a value as an env var "just in case": that leaks an
    implementation detail into the deployment surface and adds tunability a
    prototype doesn't need. The analysis tunables are mock-only (no prod
    equivalent), so they're constants, never env.
- **Response DTOs**: `class-validator` + `@ApiProperty` for requests; return
  plain objects for responses (interceptor wraps them). Paginated lists use
  `PaginationQueryDto` / `PaginatedResponseDto`.
- **Swagger**: use the wrappers in `src/common/swagger/` (`ApiSuccessOkResponse`,
  `ApiSuccessCreatedResponse`, error wrappers) — not bare `@ApiResponse` for
  success.
- **Routes**: all under `/api`, URI-versioned (`/api/v1/...`, default v1).
- **Tests**: unit specs live next to source (`*.spec.ts`, `rootDir: src`).
  No coverage threshold (this is a prototype) — `test:cov` reports coverage but
  does not fail on a percentage. Write tests where they add value (config,
  analysis state machine, business logic), not to chase a number on boilerplate.
- **Lint/format**: `strictTypeChecked` + `stylisticTypeChecked`; `simple-import-sort`
  (let `--fix` order imports); `consistent-type-imports` (use `import type`);
  `no-floating-promises`; `interface` over `type` for object shapes.
- **DB column naming**: Postgres columns/tables are **snake_case** — there is no
  global field mapper, so map explicitly in `schema.prisma`: `@map("snake_case")`
  on every camelCase field and `@@map("snake_case")` on every model
  (e.g. `xPct Float @map("x_pct")`, `sortOrder Int @map("sort_order")`,
  `model Region { @@map("regions") }`). Prisma model fields stay camelCase in TS.
- **Migrations need review**: do **not** run `db:migrate:dev` / apply a migration
  without showing the generated SQL for review first. Edit the schema, generate
  the migration SQL, present it, and apply only after approval.

## Docs process

Only two doc processes are kept for this project:

- **`docs/adr/`** — Architectural Decision Records. Add one when a decision is
  load-bearing (e.g. async strategy = polling vs SSE; in-memory job vs
  outbox/worker; static-serving the client via NestJS). Use `docs/adr/template.md`.
- **`docs/retrospectives/`** — one short retro per milestone (`_template.md`).
  **Reviewers read these**, so they contain only **project-relevant** content:
  what shipped, project-level deviations from PLANNING.md, key decisions (link the
  ADR), and lessons. They demonstrate that we review code and adapt the plan
  mid-flight — which is what the assignment values.
- **Audience split — important:** our own setup mistakes / scaffolding fumbles
  (e.g. cleaning stray template migrations at project start, internal false
  starts) go in **`.notes/`** (git-ignored), **not** in retrospectives. Retros
  show engineering judgment on the product; `.notes/` is our private kitchen.
- **Deviations** are recorded twice on purpose: a quick `> Note:` under the step
  in PLANNING.md (the living plan) and summarized in the milestone retro's
  "Deviations" section (project-relevant ones only).

`docs/figma-design-spec.md` is the design source of truth (tokens, screens,
interaction model, AI-flow states). Read it before building UI.

## Workflow Rules

- **PLANNING.md sync** — once PLANNING.md exists, mark steps `[x]` immediately as
  you finish them (don't batch). Update milestone status (✅ done / 🔧 in progress).
- **Plan deviations** — if reality diverges from the plan, update PLANNING.md right
  away so it always reflects truth, not the original guess.
- **Technical workarounds** — record platform quirks / non-obvious fixes here so
  future sessions don't re-discover them.
  - _Prisma `@map`/`@@map`:_ after adding or changing a column/table name mapping,
    re-run `npm run db:generate`. The previously generated client keeps targeting
    the old (PascalCase) names and fails at runtime with `TableDoesNotExist`.
  - _Prisma 7 destructive commands_ (`migrate reset`, etc.) are blocked for AI
    agents; they require `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<user's
exact consent text>`. Only run against the local dev DB, never prod.
