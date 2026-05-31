# Retrospective: M5 — Analysis module (async backend)

_Date: 2026-05-30 · Status: done_

## What shipped

- `src/modules/analysis/` — an in-memory, simulated AI-analysis job:
  - `POST /api/v1/analyses` → **202** `{ id, status: 'processing' }`,
  - `GET /api/v1/analyses/:id` → current status (+ result when completed; 404 when
    unknown).
- `setTimeout`-based transition to `completed` (rule-based result whose confidence
  derives from `regionId`) or `failed` (probability `ANALYSIS_FAIL_RATE`).
- Injectable `RandomSource` provider so the simulation is deterministic under test.
- 11 unit tests with `jest.useFakeTimers()` + a stub RNG. Two ADRs (0002 polling,
  0003 in-memory). Verified live end-to-end via curl.

## Deviations from the plan

- None. (Config moved to constants back in M2, so M5 just imports them.)

## Key decisions (top 3–5)

1. **Injectable randomness (`RandomSource` provider)** — the single thing that
   makes a timer + random-failure job testable. The class is its own DI token (no
   separate symbol/interface — simpler for one impl). Prod uses `Math.random`;
   specs inject a queued-values stub, so `processing → completed/failed` is
   deterministic.
2. **Result varies by region, not a fixed 87%** — confidence is derived from the
   `regionId` char-sum (70–99) and stable per region. Avoids the "always 87%" tell
   that a result is hardcoded, with no extra state.
3. **No region-existence check on create** — the analysis is a mock and doesn't
   couple to the regions module; any `regionId` is accepted. Keeps the modules
   independent. (A real system would validate against the catalog.)
4. **404 on unknown id is the restart story** — `get` returns `undefined` →
   controller throws `NotFoundException`; the client will read that as a terminal
   failure (ADR 0003), which is exactly how an in-memory job behaves after a
   restart.

## Lessons learned

- Driving status transitions through an injected RNG + fake timers gave full
  control over the async state machine in tests without any real waiting or
  flakiness — worth reusing for the client-side `useAnalysis()` hook in M7.
