import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';
import type { ApiSuccessResponse } from '../dto/api-success-response.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiSuccessEnvelope(value: unknown): value is ApiSuccessResponse {
  return isRecord(value) && value.success === true;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    const responseMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (shouldSkip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((value: unknown) => {
        if (isApiSuccessEnvelope(value)) {
          const { message, data, meta, ...rest } = value;
          const extraKeys = Object.keys(rest).filter(
            (key) => key !== 'success',
          );
          const normalizedData =
            data ??
            (extraKeys.length > 0
              ? Object.fromEntries(extraKeys.map((key) => [key, rest[key]]))
              : null);

          const response: ApiSuccessResponse = {
            success: true,
            data: normalizedData,
          };

          if (message ?? responseMessage) {
            response.message = message ?? responseMessage;
          }

          if (meta) {
            response.meta = meta;
          }

          return response;
        }

        const response: ApiSuccessResponse = {
          success: true,
          data: value ?? null,
        };

        if (responseMessage) {
          response.message = responseMessage;
        }

        return response;
      }),
    );
  }
}
