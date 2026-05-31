import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type {
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

type ErrorCategory = 'business' | 'validation' | 'auth' | 'system';

interface ApiErrorResponseOptions {
  status: number;
  description: string;
  codeExample: string;
  category: ErrorCategory;
  messageExample?: string;
  includeDetails?: boolean;
}

function buildErrorSchema(
  options: ApiErrorResponseOptions,
): SchemaObject & Partial<ReferenceObject> {
  const errorProperties: NonNullable<SchemaObject['properties']> = {
    code: {
      type: 'string',
      example: options.codeExample,
    },
    category: {
      type: 'string',
      enum: ['business', 'validation', 'auth', 'system'],
      example: options.category,
    },
    message: {
      type: 'string',
      example: options.messageExample ?? options.description,
    },
    requestId: {
      type: 'string',
      example: '4f1c2f9a-4f9a-4b0c-b4b3-3d3a7b7d4a5e',
    },
  };

  if (options.includeDetails) {
    errorProperties.details = {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    };
  }

  return {
    type: 'object',
    required: ['success', 'error', 'statusCode'],
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'object',
        properties: errorProperties,
      },
      statusCode: {
        type: 'number',
        example: options.status,
      },
    },
  };
}

export function ApiErrorResponse(options: ApiErrorResponseOptions) {
  return applyDecorators(
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: buildErrorSchema(options),
    }),
  );
}

export function ApiValidationErrorResponse(description = 'Validation failed') {
  return ApiErrorResponse({
    status: 400,
    description,
    codeExample: 'VALIDATION_FAILED',
    category: 'validation',
    messageExample: description,
    includeDetails: true,
  });
}

export function ApiUnauthorizedErrorResponse(
  description = 'Unauthorized',
  codeExample = 'UNAUTHORIZED',
) {
  return ApiErrorResponse({
    status: 401,
    description,
    codeExample,
    category: 'auth',
    messageExample: description,
  });
}

export function ApiForbiddenErrorResponse(description = 'Forbidden') {
  return ApiErrorResponse({
    status: 403,
    description,
    codeExample: 'FORBIDDEN',
    category: 'auth',
    messageExample: description,
  });
}

export function ApiNotFoundErrorResponse(
  description = 'Resource not found',
  codeExample = 'NOT_FOUND',
) {
  return ApiErrorResponse({
    status: 404,
    description,
    codeExample,
    category: 'business',
    messageExample: description,
  });
}

export function ApiConflictErrorResponse(
  description = 'Resource already exists',
  codeExample = 'UNIQUE_CONSTRAINT',
) {
  return ApiErrorResponse({
    status: 409,
    description,
    codeExample,
    category: 'business',
    messageExample: description,
  });
}

export function ApiInternalErrorResponse(
  description = 'Internal server error',
) {
  return ApiErrorResponse({
    status: 500,
    description,
    codeExample: 'INTERNAL_ERROR',
    category: 'system',
    messageExample: description,
  });
}
