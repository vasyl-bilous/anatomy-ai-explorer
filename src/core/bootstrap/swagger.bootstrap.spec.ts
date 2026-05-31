/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { setupSwagger } from './swagger.bootstrap';

jest.mock('@nestjs/swagger', () => {
  class MockDocumentBuilder {
    setTitle = jest.fn().mockReturnThis();
    setDescription = jest.fn().mockReturnThis();
    setVersion = jest.fn().mockReturnThis();
    addBearerAuth = jest.fn().mockReturnThis();
    build = jest.fn().mockReturnValue({ openapi: '3.0.0' });
  }

  return {
    DocumentBuilder: MockDocumentBuilder,
    SwaggerModule: {
      createDocument: jest.fn(() => ({ openapi: '3.0.0' })),
      setup: jest.fn(),
    },
  };
});

describe('setupSwagger', () => {
  it('creates and mounts swagger docs under /api/docs', () => {
    const app = { get: jest.fn() };
    const createDocumentMock =
      SwaggerModule.createDocument as unknown as jest.Mock;

    setupSwagger(app as never);

    expect(createDocumentMock).toHaveBeenCalledWith(
      app,
      expect.objectContaining({ openapi: '3.0.0' }),
    );
    expect(SwaggerModule.setup as unknown as jest.Mock).toHaveBeenCalledWith(
      'api/docs',
      app,
      expect.objectContaining({ openapi: '3.0.0' }),
    );
    expect(DocumentBuilder).toBeDefined();
  });
});
