import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import logger from '../logger/logger';

interface ErrorWithMessage {
  message?: string;
}

function isErrorWithMessage(value: unknown): value is ErrorWithMessage {
  return typeof value === 'object' && value !== null;
}

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'newpassword',
  'otp',
  'accesstoken',
  'refreshtoken',
  'token',
  'codehash',
  'tokenhash',
  'refreshtokenhash',
]);

const SAFE_HEADERS = new Set([
  'content-type',
  'content-length',
  'user-agent',
  'x-request-id',
  'x-trace-id',
  'traceparent',
]);

function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[Truncated]';
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer:${value.length}]`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : sanitizeLogValue(nestedValue, depth + 1);
    }

    return sanitized;
  }

  return value;
}

function sanitizeHeaders(headers: Request['headers']) {
  const result: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SAFE_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }

  return result;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;

          logger.info('HTTP Request', {
            body: sanitizeLogValue(req.body as unknown),
            headers: sanitizeHeaders(req.headers),
            ip: req.ip,
            method: req.method,
            params: sanitizeLogValue(req.params),
            query: sanitizeLogValue(req.query),
            statusCode: res.statusCode,
            durationMs: ms,
            url: req.originalUrl,
            userAgent:
              typeof req.headers['user-agent'] === 'string'
                ? req.headers['user-agent']
                : undefined,
          });
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const statusCode =
            err instanceof HttpException ? err.getStatus() : res.statusCode;

          logger.error('HTTP Error', {
            durationMs: ms,
            errorMessage:
              isErrorWithMessage(err) && typeof err.message === 'string'
                ? err.message
                : 'Unknown error',
            method: req.method,
            statusCode,
            url: req.originalUrl,
          });
        },
      }),
    );
  }
}
