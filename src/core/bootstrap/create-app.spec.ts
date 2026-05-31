import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { createApp } from './create-app';

jest.mock('../../app.module', () => ({
  AppModule: { module: 'AppModule' },
}));

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

describe('createApp', () => {
  it('creates the Nest application with buffered logs enabled', async () => {
    const app = { init: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const createMock = NestFactory.create as unknown as jest.Mock;
    createMock.mockResolvedValue(app);

    await expect(createApp()).resolves.toBe(app);
    expect(createMock).toHaveBeenCalledWith(AppModule, {
      bufferLogs: true,
    });
  });
});
