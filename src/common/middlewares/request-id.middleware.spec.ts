import { runWithLogContext } from '@geren32/logger';
import { randomUUID } from 'crypto';

import { RequestIdMiddleware } from './request-id.middleware';

jest.mock('@geren32/logger', () => ({
  runWithLogContext: jest.fn(
    (
      _context: { requestId: string; traceId: string },
      callback: () => void | Promise<void>,
    ) => callback(),
  ),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    jest.clearAllMocks();
  });

  it('reuses the incoming request id header when it is present', () => {
    const next = jest.fn();
    const req = {
      headers: {
        'x-request-id': '  incoming-id  ',
      },
    } as unknown as Parameters<typeof middleware.use>[0];
    const res = {
      setHeader: jest.fn(),
    };

    middleware.use(req, res as never, next);

    expect(req).toHaveProperty('requestId', 'incoming-id');
    expect(req).toHaveProperty('traceId', 'incoming-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'incoming-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', 'incoming-id');
    expect(runWithLogContext).toHaveBeenCalledWith(
      { requestId: 'incoming-id', traceId: 'incoming-id' },
      expect.any(Function),
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('generates a request id when the incoming header is absent', () => {
    const next = jest.fn();
    const req = {
      headers: {},
    } as unknown as Parameters<typeof middleware.use>[0];
    const res = {
      setHeader: jest.fn(),
    };

    (randomUUID as jest.Mock).mockReturnValue('generated-id');

    middleware.use(req, res as never, next);

    expect(req).toHaveProperty('requestId', 'generated-id');
    expect(req).toHaveProperty('traceId', 'generated-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'generated-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', 'generated-id');
    expect(runWithLogContext).toHaveBeenCalledWith(
      { requestId: 'generated-id', traceId: 'generated-id' },
      expect.any(Function),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses propagated trace id when trace headers are present', () => {
    const next = jest.fn();
    const req = {
      headers: {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      },
    } as unknown as Parameters<typeof middleware.use>[0];
    const res = {
      setHeader: jest.fn(),
    };

    (randomUUID as jest.Mock).mockReturnValue('generated-id');

    middleware.use(req, res as never, next);

    expect(req).toHaveProperty('traceId', '4bf92f3577b34da6a3ce929d0e0e4736');
    expect(res.setHeader).toHaveBeenCalledWith(
      'x-trace-id',
      '4bf92f3577b34da6a3ce929d0e0e4736',
    );
  });
});
