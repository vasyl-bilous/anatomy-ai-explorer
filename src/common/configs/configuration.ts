import { z } from 'zod';

import logger from '../logger/logger';
import { type Env, envSchema } from './env.schema';

export function isProduction(): boolean {
  return normalizeNodeEnv(process.env.NODE_ENV) === 'production';
}

export function normalizeNodeEnv(
  value: string | undefined,
): Env['NODE_ENV'] | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  if (normalized === 'dev' || normalized === 'development') {
    return 'development';
  }

  if (normalized === 'test') {
    return 'test';
  }

  if (
    normalized === 'prod' ||
    normalized === 'production' ||
    normalized === 'stage' ||
    normalized === 'staging'
  ) {
    return 'production';
  }

  return undefined;
}

function normalizeEnv(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalized: NodeJS.ProcessEnv = {
    ...raw,
  };

  const nodeEnv = normalizeNodeEnv(raw.NODE_ENV);
  if (nodeEnv) {
    normalized.NODE_ENV = nodeEnv;
  }

  return normalized;
}

export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(normalizeEnv(raw));

  if (!parsed.success) {
    logger.error(
      'Invalid environment variables:',
      z.treeifyError(parsed.error),
    );
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export default () => {
  const env = validateEnv(process.env);
  const corsOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    app: {
      nodeEnv: env.NODE_ENV,
      hideInternalErrorDetails: env.NODE_ENV === 'production',
    },
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    cors: {
      origins: corsOrigins,
    },
    // Feature-specific config (e.g. analysis tunables) lives in its own module
    // via `registerAs` — not here. This global config is deployment/infra only.
  } as const;
};
