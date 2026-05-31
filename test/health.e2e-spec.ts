import { type INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from '../src/infrastructure/health/health.controller';
import { PrismaHealthIndicator } from '../src/infrastructure/health/prisma.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    {
      provide: PrismaHealthIndicator,
      useValue: {
        isHealthy: jest.fn().mockResolvedValue({ db: { status: 'up' } }),
      },
    },
  ],
})
class TestHealthModule {}

describe('Health Smoke (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestHealthModule, {
      logger: false,
    });
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  async function get(path: string) {
    const response = await fetch(`${baseUrl}${path}`);

    return {
      status: response.status,
      body: (await response.json()) as unknown,
    };
  }

  it('/api/health/live (GET)', async () => {
    const response = await get('/api/health/live');

    expect(response.status).toBe(200);
    expect((response.body as { status: string }).status).toBe('ok');
  });

  it('/api/health/ready (GET)', async () => {
    const response = await get('/api/health/ready');
    const body = response.body as {
      status: string;
      info: {
        db: { status: string };
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.info).toMatchObject({
      db: { status: 'up' },
    });
  });
});
