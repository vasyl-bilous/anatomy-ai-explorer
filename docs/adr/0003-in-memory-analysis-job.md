# ADR 0003: Analysis jobs are in-memory (not persisted)

## Status

Accepted

## Decision

The simulated analysis job lives in an in-process `Map<id, Analysis>` in
`AnalysisService`; a `setTimeout` transitions it to a terminal status. Jobs are
**not** persisted, and there is **no** `Analysis` Prisma model.

## Context

The analysis is explicitly allowed to be mocked/simulated. Two ways to run it:

- **In-memory job** — `Map` + `setTimeout`, rule-based result, injectable RNG for a
  small failure rate. Zero schema, zero migration, zero worker runtime; fastest path
  to a working async flow. Downside: jobs vanish on process restart and don't survive
  horizontal scaling (each instance has its own Map).
- **Persistent outbox/worker** — an `Analysis`/`Job` row in Postgres written as
  `PENDING`, a worker process that picks it up, status read from the DB on each poll.
  Survives restarts and scales horizontally — but needs a model, a migration, a
  worker runtime, and atomic job-claiming. Production-grade, but well beyond a
  prototype whose spec says it doesn't care about production readiness.

Regions _are_ persisted (reference data); analyses are ephemeral simulated jobs, so
the asymmetry is intentional.

## Consequences

- **Known limitation:** after a server restart mid-poll, `GET /:id` returns `404`.
  The client treats an unknown id as a **terminal failure** (retry starts a fresh
  job) rather than spinning forever.
- Not safe under horizontal scaling (per-instance Map) — fine for a single-process
  prototype, called out here so no one assumes otherwise.
- Randomness is injected (`RandomSource` provider) so tests are deterministic with
  `jest.useFakeTimers()`.
- **With more time (the production path):** persist the job as an outbox row in
  Postgres and process it in the worker runtime — the next poll then reads state
  from the DB and picks up the result even across a restart. The HTTP contract
  (`202` + pollable status resource) is unchanged; only the storage/execution moves
  from memory to the outbox + worker.
