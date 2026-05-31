import { HealthIndicatorService } from '@nestjs/terminus';

import type { PrismaService } from '../prisma/prisma.service';
import { PrismaHealthIndicator } from './prisma.health';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prisma: {
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    indicator = new PrismaHealthIndicator(
      prisma as unknown as PrismaService,
      new HealthIndicatorService(),
    );
  });

  it('returns up when the database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(indicator.isHealthy()).resolves.toEqual({
      db: {
        status: 'up',
      },
    });
  });

  it('returns down when the database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy()).resolves.toEqual({
      db: {
        status: 'down',
        message: 'Connection refused',
      },
    });
  });
});
