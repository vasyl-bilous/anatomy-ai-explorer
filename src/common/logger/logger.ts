import { createLogger, createNestLoggerService } from '@geren32/logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'api', {
  masks: [
    'x-env-secure-key',
    'authorization',
    'cookie',
    'set-cookie',
    'password',
    'newPassword',
    'otp',
    'accessToken',
    'refreshToken',
    'token',
    'tokenHash',
    'codeHash',
    'refreshTokenHash',
  ],
});

export const nestLogger = createNestLoggerService(logger);

export default logger;
