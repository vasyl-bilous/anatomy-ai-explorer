# Retrospective: M0 — Foundations & contract

_Date: 2026-05-30 · Status: done_

## What shipped

- A frozen client/server contract before any feature code: shared TS types in
  `src/shared/contracts/anatomy.contract.ts` (`Region`, `Marker`, `AnalysisStatus`,
  `AnalysisResult`, `Analysis`, `CreateAnalysisRequest`).
- A contract note (`src/shared/contracts/README.md`) documenting routes
  (`/api/v1/...`), the response-envelope unwrap rule, and the marker px→% formula.

## Deviations from the plan

- Avoided redeclaring the success-envelope type — re-exported the existing
  `ApiSuccessResponse` from `src/common/dto/` instead (caught during review; the
  canonical type is also more correct with `data: TData | null`).

## Key decisions (top 3–5)

1. **Markers as percentages, not pixels** — store `xPct`/`yPct` (0–100) of the
   illustration box so the overlay is responsive; conversion happens once in the
   seed.
2. **Per-screen reference box** — brain markers use the exact Figma px→% formula
   (`(mx-307)/673`, `(my-160)/630`); body markers are placed at sensible anatomical
   percentages because Figma's body coordinates are internally inconsistent. The
   mockups are "a guideline, not a strict spec."
3. **Responsive via a fixed `aspect-ratio` box** — the illustration container keeps
   the image's natural ratio so percent-positioned marker anchors never drift on
   resize. A marker _is_ the anchor (carries `label` + hover `tooltip`).
4. **No OpenAPI codegen / workspace package** — two endpoints; hand-write types and
   copy them into `client/` in M4. Keeps tooling simple.

## Lessons learned

- Locking the contract first (routes, envelope, types) before writing either side
  prevents the classic `/api` vs `/api/v1` and "forgot to unwrap `.data`" drift.
