import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';

import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';
import { SuccessResponseInterceptor } from './success-response.interceptor';

describe('SuccessResponseInterceptor', () => {
  let interceptor: SuccessResponseInterceptor;
  let reflector: {
    getAllAndOverride: jest.Mock;
  };
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn((key: string | symbol) => {
        if (key === SKIP_RESPONSE_TRANSFORM_KEY) {
          return false;
        }

        if (key === RESPONSE_MESSAGE_KEY) {
          return undefined;
        }

        return undefined;
      }),
    };

    interceptor = new SuccessResponseInterceptor(
      reflector as unknown as Reflector,
    );
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it('wraps raw values into the global success envelope', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          of({
            id: 1,
            email: 'user@example.com',
          }),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        id: 1,
        email: 'user@example.com',
      },
    });
  });

  it('applies response message metadata', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string | symbol) => {
      if (key === SKIP_RESPONSE_TRANSFORM_KEY) {
        return false;
      }

      if (key === RESPONSE_MESSAGE_KEY) {
        return 'Operation successful';
      }

      return undefined;
    });

    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of(null),
      }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Operation successful',
      data: null,
    });
  });

  it('normalizes legacy success envelopes with extra top-level keys', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          of({
            success: true,
            message: 'Deleted successfully',
            deletedKey: 'photos/example.png',
          }),
      }),
    );

    expect(result).toEqual({
      success: true,
      message: 'Deleted successfully',
      data: {
        deletedKey: 'photos/example.png',
      },
    });
  });

  it('returns the raw response when transformation is skipped', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string | symbol) =>
      key === SKIP_RESPONSE_TRANSFORM_KEY ? true : undefined,
    );

    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ status: 'ok' }),
      }),
    );

    expect(result).toEqual({ status: 'ok' });
  });
});
