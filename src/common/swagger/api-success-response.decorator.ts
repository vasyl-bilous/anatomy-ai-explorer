import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

type ResponseType = Type<unknown>;

interface ApiSuccessResponseOptions {
  description: string;
  type?: ResponseType;
  isArray?: boolean;
  messageExample?: string;
}

function buildSuccessSchema(options: ApiSuccessResponseOptions) {
  const dataSchema = options.type
    ? options.isArray
      ? {
          type: 'array',
          items: { $ref: getSchemaPath(options.type) },
        }
      : { $ref: getSchemaPath(options.type) }
    : {
        type: 'object',
        nullable: true,
        example: null,
      };

  return {
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      message: {
        type: 'string',
        example: options.messageExample ?? 'OK',
      },
      data: dataSchema,
      meta: {
        type: 'object',
        additionalProperties: true,
      },
    },
  };
}

export function ApiSuccessOkResponse(options: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(...(options.type ? [options.type] : [])),
    ApiOkResponse({
      description: options.description,
      schema: buildSuccessSchema(options),
    }),
  );
}

export function ApiSuccessCreatedResponse(options: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(...(options.type ? [options.type] : [])),
    ApiCreatedResponse({
      description: options.description,
      schema: buildSuccessSchema(options),
    }),
  );
}
