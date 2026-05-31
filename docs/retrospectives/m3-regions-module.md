# Retrospective: M3 — Regions module

_Date: 2026-05-30 · Status: done_

## What shipped

- `src/modules/regions/` — repository → service → controller, plus request/response
  DTOs. Two read-only endpoints:
  - `GET /api/v1/regions` (optional `?screen=body|brain`),
  - `GET /api/v1/regions/:id` (region with markers).
- Swagger via the project's success/error wrappers; `RegionsModule` wired into
  `AppModule`. Unit specs for service + controller (6 tests).
- Verified live against the seeded DB: body=10, brain=7 (children linked to
  Alzheimer's), by-id happy path, 404 `NOT_FOUND`, and `?screen=bad` → 400.

## Deviations from the plan

- None of substance. Added a `dto/req/` query DTO (`ListRegionsQueryDto`) alongside
  the planned `dto/res/` — needed for validated `?screen` filtering.

## Key decisions (top 3–5)

1. **Repository returns the shared `Region` shape directly** — a Prisma `select`
   projects exactly the contract fields (incl. ordered markers), so service and
   controller pass typed data straight through to the envelope. No mapping layer.
2. **Not-found → `NotFoundException`** — let `@geren32/nestjs-error-handler` format
   the error envelope (`NOT_FOUND`, 404) rather than hand-rolling error responses.
3. **Validated `?screen` via `@IsIn`** — with the global `forbidNonWhitelisted`
   pipe, an unknown screen value (or extra query key) returns 400 automatically.
4. **PrismaService is `@Global`** — `RegionsModule` doesn't re-import it; the repo
   injects it directly.

## Lessons learned

- Driving the Prisma `select` from the shared contract shape kept the whole module
  thin — no DTO mapping, no transformation layer, the seeded data flows straight to
  the response envelope. Worth repeating for the next read model.
