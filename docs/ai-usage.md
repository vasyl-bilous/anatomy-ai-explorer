# AI usage summary

This prototype was built with heavy AI assistance, as the assignment encourages.
This documents which tools were used, how they helped, what required manual
engineering judgment, and how the generated code was reviewed.

## Tools used

- **Claude Code** (Anthropic's agentic CLI) — the primary tool. Used for planning,
  scaffolding, writing backend + frontend code, tests, and docs; and for driving
  verification (running the app, hitting endpoints, reading logs).
- **Claude Code subagents** — a `react-frontend-expert` subagent built the two
  React screens (Explorer, drill-down) from a detailed brief.
- **MCP integrations** the agent drove directly:
  - **Figma MCP** — extracted the design (both frames, tokens, region names, marker
    coordinates) and downloaded the body/brain assets. The Figma data is captured
    in `docs/figma-design-spec.md`.
  - **Postgres MCP** — verified seeded data directly in the database.
  - **NestJS-logs MCP** — read the dev-server logs to diagnose startup/route issues.
  - **Playwright MCP** — drove the running app in a browser to verify the UI flows
    end-to-end (selection sync, the async analysis lifecycle, deep-link fallback).

## How AI helped

- **Speed of prototyping.** The whole stack — trimmed NestJS skeleton, two feature
  modules, Prisma schema + seed, the React client, Docker, CI — came together fast.
- **Boilerplate & consistency.** DTOs, Swagger wrappers, module wiring, CSS, and
  test scaffolding were generated to match existing conventions.
- **Live verification, not just code.** The agent ran the app and exercised it
  (curl, Postgres queries, Playwright, log inspection) rather than assuming the code
  worked — which caught several real bugs (see below).
- **Documentation discipline.** ADRs, per-milestone retrospectives, and a living
  `PLANNING.md` were kept in sync as decisions were made.

## What required manual engineering judgment

The interesting decisions were driven by review and back-and-forth, not accepted
blindly. Examples where human judgment changed the direction:

- **Resolving an ambiguous brief** — clarifying the deployment model (plain React +
  Vite, served statically by NestJS; no Next.js), the interaction model
  (selection ≠ navigation; drill-down is region-bound), and that only the brain has
  drill-down data (others get a "Coming soon").
- **Right-sizing abstractions (repeatedly).** Several AI proposals were deliberately
  pulled back as over-engineering: analysis tunables moved from env config → module
  constants; a `RandomSource` symbol-token + interface simplified to a plain
  injectable class; no Redux/Zustand (prop-drilling is fine at ≤2 levels);
  analysis-result caching kept as a small Map rather than forcing it into TanStack
  Query. Each trade-off is recorded.
- **Architecture boundaries** — `shared/` (framework-agnostic) vs `common/`
  (NestJS-bound), feature config/constants living in their module, snake_case DB
  mapping, seed as a release-phase step (not app runtime).
- **Fidelity to the design** — verifying against Figma that all markers are red
  (not colored by category) and that the region list came from the real second
  frame, instead of inventing data.
- **UX details** — click-to-deselect anywhere non-interactive; hover-prefetch of the
  drill-down; caching completed analyses so revisits are instant.

## How generated code was reviewed / validated

- **Quality gates on every change:** `typecheck`, `lint`, `knip`, `format:check`,
  unit tests, `build` — backend and frontend — were run continuously, and the same
  gate runs in CI.
- **Tests for the load-bearing logic:** the async `useAnalysis` state machine and
  the analysis service are unit-tested with fake timers + injected randomness, so
  the race/timeout/retry paths are deterministic.
- **End-to-end verification of real behavior** via the MCP tools above — the UI was
  driven in a browser and the API hit directly, not just compiled. This surfaced
  bugs that a clean build hid, e.g.: a stale orphaned server process serving an old
  build; `nest build` emitting a flat `dist/` (stale `start:prod` path); a marker
  overlay swallowing background clicks; path-to-regexp v8 rejecting the old
  `exclude: ['/api*']`; and `tsx`/husky/`prisma generate` issues only visible inside
  the Docker build. Each was diagnosed and fixed.
- **Human-in-the-loop decisions** — non-trivial choices were surfaced as explicit
  questions and decided by the developer before implementation, then captured in
  ADRs/retrospectives.
