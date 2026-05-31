# ADR 0002: AI analysis is async via POST + client polling

## Status

Accepted

## Decision

The AI-analysis flow is asynchronous: `POST /api/v1/analyses` returns `202` with
`{ id, status: 'processing' }` immediately, and the client **polls**
`GET /api/v1/analyses/:id` until a terminal status (`completed` | `failed`).

## Context

The assignment wants a realistic "trigger a long job, get insights later" workflow
with explicit `idle → processing → completed | failed` states. The transport
options:

- **Polling** — POST starts the job, client re-fetches a status endpoint on an
  interval. Simplest, stateless on the server, trivial to reason about and test;
  retry is just a new POST. Downside: a little redundant traffic, latency up to one
  poll interval.
- **SSE / WebSocket** — server pushes status changes. Lower latency, no redundant
  polls, but needs a long-lived connection, connection lifecycle handling, and is
  more to build/test for a single short-lived job.

For a prototype whose point is to _demonstrate_ state transitions, polling makes the
state machine explicit on the client (where the assignment is looking) and keeps the
server a plain request/response service.

## Consequences

- The client owns the polling loop: a `useAnalysis()` hook with a fixed interval
  (~1.5s), a max-attempts/timeout cap (→ `failed`), abort-on-unmount, and a stale-job
  guard (ignore responses for a job that's no longer current). These are the
  failure modes the design has to handle explicitly.
- `POST` is idempotent from the UI's side only via guard (anti-double-submit while a
  job is in flight); the server will happily create a new job per POST.
- **Retry = a fresh POST** — no special server endpoint.
- Latency is bounded by the poll interval; acceptable for a simulated job.
- "With more time": switch to SSE for push updates — the API shape (`202` + status
  resource) stays, only the client transport changes.
