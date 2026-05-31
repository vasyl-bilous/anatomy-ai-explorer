import { runWithLogContext } from '@geren32/logger';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

function extractTraceId(
  traceparent: string | undefined,
  traceHeader: string | undefined,
) {
  if (traceHeader && traceHeader.trim().length > 0) {
    return traceHeader.trim();
  }

  if (!traceparent) {
    return undefined;
  }

  const segments = traceparent.trim().split('-');
  const traceId = segments[1];

  return traceId.length === 32 ? traceId : undefined;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request & { requestId?: string; traceId?: string },
    res: Response,
    next: NextFunction,
  ) {
    const incoming = req.headers['x-request-id'];
    const traceparent =
      typeof req.headers.traceparent === 'string'
        ? req.headers.traceparent
        : undefined;
    const traceHeader =
      typeof req.headers['x-trace-id'] === 'string'
        ? req.headers['x-trace-id']
        : undefined;
    const requestId =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : randomUUID();
    const traceId = extractTraceId(traceparent, traceHeader) ?? requestId;

    req.requestId = requestId;
    req.traceId = traceId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);

    runWithLogContext({ requestId, traceId }, () => {
      next();
    });
  }
}
