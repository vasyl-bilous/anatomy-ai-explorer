# syntax=docker/dockerfile:1

# ── Stage 1: install all deps (root + client) ──────────────────────────────
# node:22 (Debian) — not alpine: Prisma's binary engine needs glibc/openssl.
FROM node:22-slim AS deps
WORKDIR /app

# Root (API) deps. --ignore-scripts skips the `prepare` husky hook (dev-only git
# tooling, no .git in the image — would fail).
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Client deps
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --ignore-scripts --prefix client

# ── Stage 2: build client + API ────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# OpenSSL is required by Prisma's binary engine at generate/runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Generate Prisma client, build the React client, then the NestJS API.
# A dummy DATABASE_URL satisfies prisma.config.ts at build time — `generate`
# doesn't connect, it only needs the var to resolve. The real URL is injected at
# runtime (compose / Render env).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    npm run db:generate \
    && npm run build --prefix client \
    && npm run build

# ── Stage 3: lean runtime ──────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Production deps only (Prisma CLI stays in deps for `migrate deploy` at boot).
# --ignore-scripts skips the husky `prepare` hook (no .git / dev tooling here).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Prisma schema/migrations + generated client (from build stage).
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Built artifacts: API (dist/) + client (client/dist, served by ServeStaticModule).
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
