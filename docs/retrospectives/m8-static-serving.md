# Retrospective: M8 — Static serving

_Date: 2026-05-31 · Status: done_

## What shipped

- `@nestjs/serve-static` wired into `AppModule` so a production NestJS process
  serves the built React client (`client/dist`) from the same origin as the API.
- Registered conditionally — only when `client/dist` exists — so dev (Vite) is
  untouched and prod serves the SPA, with no env flag.
- `exclude: ['/api/{*splat}']` keeps all `/api/...` routes (REST, Swagger, health)
  with Nest; other paths fall through to the SPA (deep links serve `index.html`).
- ADR 0004. Verified live on :4100: `/`, `/region/:id` fallback, `/api/v1/*`,
  `/api/docs`, `/api/health` all correct.

## Deviations from the plan

- The plan's `exclude: ['/api*']` doesn't work on Nest 11 — see decision 2.

## Key decisions (top 3–5)

1. **Conditional registration via `existsSync(client/dist)`** — one codebase serves
   both modes: dev skips static serving (Vite owns the client), prod serves it after
   `vite build`. No `NODE_ENV` branching, no startup noise when there's no dist.
2. **path-to-regexp v8 wildcard syntax** — Nest 11 / serve-static 5 ship
   path-to-regexp v8, where `exclude: ['/api*']` throws `Missing parameter name`.
   The correct form is the named wildcard `'/api/{*splat}'`. Caught only by running
   it — the build was clean, the 500 appeared at request time.
3. **Single origin over separate hosts** — simplest deployment that "runs locally
   with clear instructions": no second server, no CORS, no CDN. Documented the CDN
   split as the "more time" path in the ADR.

## Lessons learned

- `nest build` emits a **flat `dist/`** (`dist/main.js`, `dist/app.module.js`), not
  `dist/src/`. The skeleton's `start:prod` (`node dist/src/main.js`) was stale and
  would have failed in prod — fixed to `node dist/main.js`, and `rootPath` is one
  `..` from `dist/`, not two. Worth checking the actual emit layout before computing
  any `__dirname`-relative path.
- A clean `typecheck`/`build` says nothing about route-pattern validity:
  the `/api*` → path-to-regexp error only surfaced on an actual request. Live
  verification (curl/Playwright), not just compilation, is what caught both bugs.
