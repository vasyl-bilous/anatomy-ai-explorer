# Retrospective: M4 — Frontend scaffold

_Date: 2026-05-30 · Status: done_

## What shipped

- `client/` — a self-contained Vite 6 + React 19 + TypeScript app with its own
  `package.json`, `tsconfig`, `.gitignore`, and `node_modules`.
- Routing (`react-router-dom`): Explorer (`/`) and DrillDown (`/region/:id`).
- Typed API client (`lib/api.ts`): relative `/api/v1` baseURL, central `.data`
  unwrap, and a typed `ApiError` for the backend error envelope.
- TanStack Query wiring (`lib/queries.ts`): `useRegions`, `useRegion`, and
  `useRegionPrefetch` (for the M6 "Next level" hover-prefetch).
- Design tokens (`theme/tokens.ts`) from the Figma spec.
- Verified live in the browser: the Explorer renders all 10 body regions fetched
  through the dev proxy. Full chain works: React → Vite proxy → NestJS → Prisma →
  Postgres → envelope → unwrap → render.

## Deviations from the plan

- Figma asset download deferred to M6/M7 — the illustrations are only needed when
  the actual screens are built, not for the scaffold.

## Key decisions (top 3–5)

1. **`client/` is isolated, not a workspace** — its own toolchain keeps the root
   knip/lint/tsc clean and avoids monorepo plumbing. The one cost (the contract
   types are copied, not imported) is acceptable for two endpoints.
2. **Same-origin relative API URLs (`/api/v1`)** — the Vite dev proxy and the prod
   static-serve both make `/api` same-origin, so no `VITE_API_URL` env or CORS
   dance; the client code is identical in dev and prod.
3. **TanStack Query for regions, custom hook for analysis** — Query removes
   boilerplate where the logic is plumbing (regions GET + prefetch); the analysis
   state machine will be a hand-written hook where the logic is the thing being
   assessed. (Rationale and the honest "prod would use Query" caveat are in
   `.notes/talking-points.md` for the demo.)
4. **`useRegionPrefetch` now, used in M6** — set up the prefetch primitive at
   scaffold time so the hover-prefetch UX is a one-liner when the Explorer lands.

## Lessons learned

- A new sibling directory with a different module system silently breaks the
  backend's whole-project `tsc` if the root `tsconfig` has no `exclude`. Adding the
  frontend folder is also a "fence off the backend tooling" task — `tsconfig`
  exclude + eslint ignore — not just creating files.
