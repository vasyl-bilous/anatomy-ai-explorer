# ADR 0004: NestJS serves the built client (single origin)

## Status

Accepted

## Decision

In production the NestJS app serves the built React client (`client/dist`) as
static files via `@nestjs/serve-static`, so the SPA and the API share one origin.
The module is registered **only when `client/dist` exists**, and `exclude`s every
`/api/...` route so the API, Swagger, and health stay owned by Nest.

## Context

The client and API are separate dev processes (Vite on 5173, Nest on 4000, with a
`/api` dev proxy). For deployment we wanted the simplest thing that "runs locally
with clear instructions" (the assignment's bar) without a second web server, a CDN,
or CORS between origins. Options:

- **NestJS static serving** — one process serves both `/` (SPA) and `/api/*`. No
  CORS, no second server; `vite build` → `client/dist` → `start:prod`.
- **Separate static host / CDN + API** — production-grade, but more moving parts
  than a prototype needs and reintroduces cross-origin concerns.

## Consequences

- `serveStaticImports()` in `AppModule` does `existsSync(client/dist)`: present →
  register `ServeStaticModule`; absent → skip. So **dev stays untouched** (no dist,
  Vite serves the client) and **prod serves the SPA** — one codebase, no env flag.
- The `existsSync` check runs **once at startup**. If `client/dist` is created while
  the server is already running, restart the backend for it to pick up. File
  _contents_ are read per-request, so re-running `vite build` (when dist already
  existed at startup) is picked up without a restart.
- `exclude: ['/api/{*splat}']` — note the **path-to-regexp v8** named-wildcard
  syntax (Nest 11 / serve-static 5). The old `/api*` throws
  `Missing parameter name`. This keeps REST (`/api/v1/...`), Swagger (`/api/docs`),
  and health (`/api/health/*`) with Nest; everything else falls through to the SPA
  (so client-side deep links like `/region/:id` serve `index.html`).
- `start:prod` is `node dist/main.js` (nest build emits a flat `dist/`, not
  `dist/src/`); `rootPath` is `join(__dirname, '..', 'client', 'dist')` from the
  compiled `dist/app.module.js`.
- Run order documented in the README: `cd client && npm run build` → `npm run build`
  (API) → `npm run start:prod`.
- "With more time": serve the client from a CDN/object store with cache headers and
  run the API separately behind a gateway — but that's beyond a single-origin
  prototype.
