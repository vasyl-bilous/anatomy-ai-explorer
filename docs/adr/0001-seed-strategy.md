# ADR 0001: Seed runs as a release-phase step, never from app runtime

## Status

Accepted

## Decision

Reference data (regions + markers) is loaded by an **idempotent seed script** run
**manually in dev** (`npm run prisma:seed`) and as a **release-phase step in prod**
(`npm run db:setup` = `migrate deploy && prisma:seed`, executed before the server
starts) — it is **never** run from the application's runtime bootstrap
(`onModuleInit`).

## Context

The app needs the `regions`/`markers` tables populated to be useful, so "when and
how is data seeded?" is a real question. Options considered:

- **App-runtime seed** (`onModuleInit` "seed if empty"): clone-and-run "just
  works", but it (a) races under horizontal scaling — N instances start at once
  and fight to seed — and (b) mixes a data-provisioning concern into a process
  whose job is to serve requests.
- **Manual / release-phase seed**: seed is a deploy step that runs **once** per
  release, decoupled from the N app instances.

For a prototype with no real data source, the seed itself is a stand-in for what
production would do: an **ETL / curation pipeline** pulling from curated medical
ontologies (MONDO / Disease Ontology / ICD-11 for diseases, UBERON / FMA for
anatomy) or a partner data SDK — not hand-written constants. Marker coordinates
would likewise come from an anatomical atlas / expert curation, not be eyeballed.

## Consequences

- `npm run db:setup` is the prod sequence (release phase / Docker entrypoint /
  init container), run **before** `start:prod`. Dev uses the manual
  `npm run prisma:seed`. The README documents both.
- Seed must stay **idempotent** (currently `deleteMany → create`) because the
  release phase runs on every deploy. (For curated prod data, upsert would be
  safer than delete-then-create — noted for "more time".)
- The server bootstrap stays free of seed logic — no race under horizontal
  scaling, clean separation of concerns.
- Trade-off: a fresh `clone → migrate → start` shows an **empty** app until seed
  is run. Mitigated by clear README ordering (`migrate → seed → start`).
- `seed.ts` lives in `src/infrastructure/prisma/seed/` (it's a Prisma/DB adapter
  concern), per the infrastructure-module convention. In prod it represents the
  ETL-from-ontologies step; the hardcoded constants are the prototype shortcut.
