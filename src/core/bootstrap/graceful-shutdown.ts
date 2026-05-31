import type { INestApplication, INestApplicationContext } from '@nestjs/common';

import logger from '../../common/logger/logger';

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

export function installGracefulShutdown(
  app: INestApplication | INestApplicationContext,
  options: { graceMs?: number } = {},
): void {
  const graceMs = options.graceMs ?? 30_000;
  let shuttingDown = false;

  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;

      logger.info('shutdown.signal_received', { signal, graceMs });

      const timeout = setTimeout(() => {
        logger.error('shutdown.timeout_exceeded', { signal, graceMs });
        process.exit(1);
      }, graceMs);
      timeout.unref();

      app
        .close()
        .then(() => {
          logger.info('shutdown.complete', { signal });
          clearTimeout(timeout);
          process.exit(0);
        })
        .catch((err: unknown) => {
          logger.error('shutdown.failed', {
            signal,
            message: err instanceof Error ? err.message : 'unknown',
          });
          clearTimeout(timeout);
          process.exit(1);
        });
    });
  }
}
