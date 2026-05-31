# Retrospective: M6 — Explorer screen

_Date: 2026-05-31 · Status: done_

## What shipped

- The full-body "Disease Navigator" screen: AppShell (nav + footer), the disease
  card list, and the body illustration with overlaid marker anchors.
- Two-way selection driven by a single `selectedRegionId`: clicking a marker
  highlights its card (and scrolls it into view); clicking a card highlights its
  marker. Hover is a separate state.
- **Click-to-deselect**: clicking anywhere in the Explorer that isn't an
  interactive element (a card, a marker, "Next level", a tab) clears the selection
  — both columns and the gutters between them — so "Next level" goes back to
  disabled. A single root click handler with a `closest()` allow-list.
- "Next level" drill-down button: disabled until a region is selected, then
  navigates to `/region/:id`; hover-prefetches region detail (~90 ms intent).
- Loading / error (with retry) / empty states; responsive stacking under 900px.
- Components co-located with global CSS + BEM + `:root` CSS custom properties.
- Verified live with Playwright: marker→card and card→marker sync, disabled→enabled
  transition, navigation, tooltips, zero console errors.

## Deviations from the plan

- None. (Figma asset download, deferred from M4, was done here as planned.)

## Key decisions (top 3–5)

1. **Single `selectedRegionId` as the source of truth** — both the card list and the
   marker overlay derive highlight from it, so the two halves can't desync. This is
   the crux of the "click marker ↔ click card" requirement and it stayed trivial
   because there's exactly one piece of state.
2. **Markers and cards are real `<button>`s** — keyboard-operable, `aria-label` /
   `aria-pressed`, visible focus. Accessibility for free instead of `div onClick`.
3. **Fixed `aspect-ratio` box for the illustration** — markers positioned by `%` +
   `translate(-50%,-50%)` never drift on resize, no JS measurement needed.
4. **Selection ≠ navigation** — enforced by separate handlers; only the explicit
   "Next level" button navigates, and only when something is selected.
5. **Hover-prefetch is guarded** — no-ops when nothing is selected, so a disabled
   button never warms the cache; region detail only, never the analysis.
6. **Deselect via one root handler + `closest()` allow-list** — rather than
   `stopPropagation` on every interactive element (fragile, easy to forget on new
   ones), a single handler on the Explorer container clears the selection unless
   the click landed inside a known interactive element. New interactive elements
   just join the allow-list.

## Lessons learned

- A single well-scoped state atom (`selectedRegionId`) removed the whole class of
  "the two views got out of sync" bugs that two separate states would have invited.
  Worth keeping the same discipline for the drill-down + analysis state in M7.
- The marker overlay (`.region-markers`, `inset: 0`) was silently swallowing all
  clicks over the illustration. Fix: `pointer-events: none` on the overlay +
  `pointer-events: auto` on the marker buttons, so clicks pass through the empty
  overlay to the background. Without it, deselect-on-background couldn't fire — and
  the whole illustration was effectively click-blocked.
