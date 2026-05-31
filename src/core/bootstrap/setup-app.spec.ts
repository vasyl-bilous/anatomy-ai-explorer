import { ValidationPipe } from '@nestjs/common';

import { setupApp } from './setup-app';

describe('setupApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures cors, validation, request ids, shutdown hooks, and trust proxy', () => {
    const set = jest.fn();
    const httpAdapter = {
      getInstance: jest.fn(() => ({ set })),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'cors.origins'
          ? ['https://app.example.com', 'https://admin.example.com']
          : undefined,
      ),
    };
    const use = jest.fn();
    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const enableShutdownHooks = jest.fn();
    const setGlobalPrefix = jest.fn();
    const app = {
      get: jest.fn((token: unknown) =>
        token === httpAdapter.constructor ? httpAdapter : config,
      ),
      use,
      enableCors,
      useGlobalPipes,
      enableShutdownHooks,
      setGlobalPrefix,
      enableVersioning: jest.fn(),
      getHttpAdapter: jest.fn(() => httpAdapter),
    };

    setupApp(app as never);

    expect(app.get).toHaveBeenCalled();
    expect(use).toHaveBeenCalledTimes(3);
    expect(enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        origin: expect.any(Function),
      }),
    );
    expect(useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(set).toHaveBeenCalledWith('trust proxy', 1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestIdMiddlewareCall = use.mock.calls[2]?.[0] as
      | ((...args: unknown[]) => unknown)
      | undefined;
    expect(requestIdMiddlewareCall).toBeDefined();
    expect(requestIdMiddlewareCall?.name).toContain('bound use');
  });

  it('allows requests without origin and blocks unknown origins', () => {
    const config = {
      get: jest.fn(() => ['https://app.example.com']),
    };
    const enableCors = jest.fn();
    const app = {
      get: jest.fn(() => config),
      use: jest.fn(),
      enableCors,
      useGlobalPipes: jest.fn(),
      enableShutdownHooks: jest.fn(),
      setGlobalPrefix: jest.fn(),
      enableVersioning: jest.fn(),
      getHttpAdapter: jest.fn(() => ({
        getInstance: () => ({ set: jest.fn() }),
      })),
    };

    setupApp(app as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const options = enableCors.mock.calls[0]?.[0] as {
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => void;
    };

    const noOriginCallback = jest.fn();
    options.origin(undefined, noOriginCallback);
    expect(noOriginCallback).toHaveBeenCalledWith(null, true);

    const allowedCallback = jest.fn();
    options.origin('https://app.example.com', allowedCallback);
    expect(allowedCallback).toHaveBeenCalledWith(null, true);

    const deniedCallback = jest.fn();
    options.origin('https://evil.example.com', deniedCallback);
    expect(deniedCallback).toHaveBeenCalledWith(null, false);
  });
});
