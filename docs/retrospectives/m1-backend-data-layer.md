# Retrospective: M1 — Backend data layer

_Date: 2026-05-30 · Status: done_

## What shipped

- `Region` and `Marker` Prisma models with a self-relation (brain sub-regions point
  at their parent disease), indexes, and cascade deletes.
- A single baseline migration and an idempotent seed: 10 body diseases + 7 brain
  sub-regions of Alzheimer's, 17 marker anchors. Verified via the Postgres MCP.
- `db:setup` script (`migrate deploy && prisma:seed`) for the production
  release-phase flow.

## Deviations from the plan

- Added `db:setup` and ADR 0001 (seed strategy) — not in the original M1 steps;
  emerged from a design discussion on how seeding should run in dev vs prod.

## Key decisions (top 3–5)

1. **snake_case DB columns** — there's no global field mapper, so every camelCase
   field is `@map`'d (`x_pct`, `sort_order`, …) and models `@@map`'d
   (`regions`, `markers`). TS stays camelCase. Established as a project convention.
2. **Seed runs as a release-phase step, never from app runtime** (ADR 0001) — dev
   uses manual `prisma:seed`; prod runs `db:setup` before the server starts. Avoids
   a seed race under horizontal scaling and keeps the bootstrap free of data
   provisioning.
3. **Data provenance is explicit** — the hardcoded seed stands in for a production
   ETL over medical ontologies (MONDO / UBERON / ICD-11) or a partner SDK; the seed
   header and ADR say so, rather than pretending the data is authoritative.
4. **No `Analysis` model** — analyses are ephemeral in-memory jobs (M5), so they
   don't belong in the persistent schema; regions are reference data and do.

## Lessons learned

- After adding `@map`/`@@map`, the generated Prisma client keeps targeting the old
  table names until `db:generate` is re-run — otherwise it fails with
  `TableDoesNotExist`. Captured in CLAUDE.md.
