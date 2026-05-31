import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import logger, { nestLogger } from './common/logger/logger';
import { createApp } from './core/bootstrap/create-app';
import { installGracefulShutdown } from './core/bootstrap/graceful-shutdown';
import { setupApp } from './core/bootstrap/setup-app';
import { setupSwagger } from './core/bootstrap/swagger.bootstrap';

export async function bootstrap() {
  const app = await createApp();
  const reflector = app.get(Reflector);

  app.useLogger(nestLogger);

  app.useGlobalInterceptors(
    new SuccessResponseInterceptor(reflector),
    new HttpLoggingInterceptor(),
  );

  setupApp(app);
  setupSwagger(app);

  installGracefulShutdown(app);

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');

  logger.info(`Listening on port ${port}`);
}

if (require.main === module) {
  void bootstrap();
}
