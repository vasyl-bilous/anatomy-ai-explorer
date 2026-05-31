# Retrospective: M7 — Drill-down screen + AI flow

_Date: 2026-05-31 · Status: done_

## What shipped

- The Alzheimer's drill-down: brain illustration with marker anchors + a 7-item
  **accordion** of brain sub-regions, with two-way highlight (marker ↔ accordion)
  off a single `selectedRegionId`.
- A **"Coming soon"** placeholder for every non-Alzheimer's region — the spec only
  provides the brain, so we don't invent organs.
- The async **AI-analysis flow** via a hand-written `useAnalysis()` state machine:
  idle → processing → completed | failed, with retry.
- `AnalysisPanel` renders all four states; completed shows summary, key findings,
  confidence score, and timestamp.
- **Vitest + testing-library** added to `client/`; 6 tests cover the hook's
  transitions, anti-double-submit, timeout cap, 404-terminal, and retry.
- Verified live (Playwright): full idle→processing→completed (confidence 71%),
  accordion↔marker sync, Coming-soon for COPD, zero console errors.

## Deviations from the plan

- Added a frontend test runner (Vitest) — not in the original M7 steps, but the
  `useAnalysis` state machine is the core of the assignment, so locking it down with
  unit tests was worth the small setup.

## Key decisions (top 3–5)

1. **Run-token + AbortController for concurrency** — a monotonic `runIdRef`: every
   async callback (POST resolution, each poll tick) captures the token it started
   under and **ignores stale responses**; and an `AbortController` per run **cancels
   the in-flight request** itself on a new run / unmount (an `AbortError` is treated
   as deliberate cancellation, not a failure). The token guarantees correctness even
   if a response slips through; the abort avoids the wasted round-trip. Together they
   cover stale jobs from a previous `generate()` and post-unmount writes. (Regions go
   through TanStack Query, which already aborts superseded requests.)
2. **Custom hook, not TanStack Query, for the analysis** — deliberate: the state
   machine is what's being assessed, so it's explicit and unit-tested rather than
   hidden behind `refetchInterval`. (Regions still use Query.) Rationale in `.notes`.
3. **Polling cap → failed** — 20 × 1.5s ≈ 30s, never an infinite spinner; a lost job
   (404 after restart) is also terminal-failed, both with a retry path.
4. **"Coming soon" over invented data** — the assignment provides only the brain;
   faking organs for other diseases would be dishonest and medically wrong. The
   placeholder also exercises the "no drill-down available" edge case.
5. **Prop-drilling, not Context** — the drill-down subtree is one level deep
   (page → direct children), below the threshold where Context earns its keep.
6. **Per-region result cache** — a completed analysis is cached by `regionId`, so
   revisiting a region shows the result instantly (no re-POST/poll) with a "cached"
   badge and a Regenerate action. A small UX/efficiency win that's exactly the kind
   of judgment the assignment looks for; documented as in-memory (cleared on full
   reload) — a persistent cache would be the "more time" upgrade.

## Lessons learned

- A discriminated-union state (`{status:'completed'; result}` vs
  `{status:'failed'; error}`) made the result/error payloads impossible to access in
  the wrong state — the compiler enforces the state machine, not just runtime checks.
- Testing a timer + polling hook is painless with `vi.useFakeTimers()` +
  `advanceTimersByTimeAsync` + a mocked api — the same discipline as the backend's
  fake-timer + injected-RNG approach in M5.
