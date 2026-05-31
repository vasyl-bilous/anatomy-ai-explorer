import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import type { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

const DOCS_PATH_PREFIX = '/api/docs';

const strictHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'", 'https:', 'data:'],
      'frame-ancestors': ["'none'"],
      'img-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'style-src': ["'self'", 'https:', "'unsafe-inline'"],
      'upgrade-insecure-requests': [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: {
    maxAge: 60 * 60 * 24 * 365,
    includeSubDomains: true,
    preload: false,
  },
});

// Swagger UI ships with inline scripts. Apply the rest of the security headers
// but skip CSP so the docs page renders. Lock /api/docs at the network layer
// in production if you are concerned about exposure.
const docsHelmet = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
});

function helmetRouter(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith(DOCS_PATH_PREFIX)) {
    docsHelmet(req, res, next);
    return;
  }

  strictHelmet(req, res, next);
}

export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('cors.origins') ?? [];
  const trustedProxyHops = 1;

  const corsOriginHandler = (
    origin: string | undefined,
    callback: CorsOriginCallback,
  ): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, corsOrigins.includes(origin));
  };

  app.use(helmetRouter);
  app.use(compression());

  app.enableCors({
    origin: corsOriginHandler,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  // URI-based API versioning. New routes default to v1 unless they explicitly
  // opt out via @Version(VERSION_NEUTRAL) (e.g. health checks, metrics).
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', trustedProxyHops);
}
