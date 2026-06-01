import { ErrorHandlerModule } from '@geren32/nestjs-error-handler';
import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';

import configuration, {
  isProduction,
  validateEnv,
} from './common/configs/configuration';
import logger from './common/logger/logger';
import { HealthModule } from './infrastructure/health/health.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { RegionsModule } from './modules/regions/regions.module';

// Serve the built React client (client/dist) only when it exists — so prod (after
// `vite build`) serves the SPA from the same origin as the API, while dev (no
// dist; client runs on Vite) stays untouched and quiet. `exclude` keeps every
// `/api*` route (REST, Swagger at /api/docs, health) owned by Nest, not the SPA
// catch-all. The existsSync check runs once at startup (see ADR 0004).
function serveStaticImports(): DynamicModule[] {
  // From the compiled dist/app.module.js → repo root → client/dist.
  const clientDist = join(__dirname, '..', 'client', 'dist');
  if (!existsSync(clientDist)) return [];
  return [
    ServeStaticModule.forRoot({
      rootPath: clientDist,
      // path-to-regexp v8 (Nest 11) needs a named wildcard, not the old `/api*`.
      // This keeps every /api/... route (REST, /api/docs, /api/health/*) with Nest.
      exclude: ['/api/{*splat}'],
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    ErrorHandlerModule.register({
      hideInternalDetails: isProduction(),
      includeRequestId: true,
      getRequestId: (req) => {
        const requestWithId = req as typeof req & { requestId?: string };
        const header = req.headers?.['x-request-id'];

        if (typeof requestWithId.requestId === 'string') {
          return requestWithId.requestId;
        }

        if (typeof header === 'string' && header.trim().length > 0) {
          return header;
        }

        if (Array.isArray(header)) {
          return header.find((value) => value.trim().length > 0);
        }

        return undefined;
      },
      logger: {
        warn: (message, payload) => logger.warn(message, payload),
        error: (message, payload) => logger.error(message, payload),
      },
    }),
    HealthModule,
    RegionsModule,
    AnalysisModule,
    ...serveStaticImports(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
