# Retrospective: M9 — Polish, docs & CI

_Date: 2026-05-31 · Status: done_

## What shipped

- A full **README**: Docker one-command run + local dev steps, what-it-does,
  architecture summary, test/CI commands, Render deploy guide, and "with more time".
- **AI-usage summary** (`docs/ai-usage.md`) — the spec-required write-up of tools,
  how they helped, what needed manual judgment, and how code was reviewed.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): a backend job (Postgres
  service → prisma generate/migrate → typecheck, lint, format:check, knip, test,
  build) and a frontend job (typecheck, lint, test, build). Render is configured to
  "Wait for CI to pass" before deploying.
- A real **client ESLint flat-config** — the Vite scaffold shipped an `eslint src`
  script with no config, so the frontend never actually linted.

## Deviations from the plan

- Added a CI pipeline + client ESLint config (not in the original M9 list) at the
  request to gate tests before the Render build.

## Key decisions (top 3–5)

1. **CI as the gate, Render waits for it** — GitHub Actions runs the full quality
   suite; Render only deploys on green. Clean separation (CI verifies, Render
   deploys) rather than baking tests into the Docker build (which would re-run them
   on every image build and couple concerns).
2. **Key-based remount over in-hook reset** — react-hooks v7 forbids ref access
   during render and setState-in-effect, which the `useAnalysis` reset logic used.
   The canonical fix is to reset by identity: the caller mounts the analysis subtree
   with `key={regionId}`, so a region change remounts the hook with fresh state. The
   hook got simpler (no reset branch) and the rule is satisfied honestly, not
   disabled.
3. **Fix the missing frontend lint properly** — rather than drop the `lint` step,
   added a proper flat-config (typescript-eslint + react-hooks + react-refresh) so
   the client is actually checked in CI.
4. **knip tuning, not knip-disabling** — the API contract file is an `entry` (its
   exports are consumed via the copied client types), and `client/**` + the unused
   skeleton DTOs are ignored with intent, keeping the check meaningful.

## Lessons learned

- "Make CI pass" is a real review pass in itself — it forced fixing latent issues
  the happy path hid: a frontend that never linted, and a hook that worked but used
  patterns a strict linter (rightly) rejects. The key-based-remount refactor is
  genuinely better code, prompted by the lint rule.
- New strict lint rules (react-hooks v7) are worth obeying over disabling — the
  fix usually points at a more idiomatic pattern.
