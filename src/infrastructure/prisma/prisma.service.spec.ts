import type { ConfigService } from '@nestjs/config';

import { PrismaService } from './prisma.service';

const prismaConnect = jest.fn();
const prismaDisconnect = jest.fn();
const poolEnd = jest.fn();
const poolConstructor = jest.fn((..._args: unknown[]) => ({
  end: poolEnd,
}));
const adapterConstructor = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {
    $connect = prismaConnect;
    $disconnect = prismaDisconnect;

    constructor(...args: unknown[]) {
      void args;
    }
  },
}));

jest.mock('pg', () => ({
  Pool: function Pool(...args: unknown[]) {
    poolConstructor(...args);
    return {
      end: poolEnd,
    };
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: function PrismaPg(...args: unknown[]) {
    adapterConstructor(...args);
    return { provider: 'pg' };
  },
}));

describe('PrismaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaConnect.mockResolvedValue(undefined);
    prismaDisconnect.mockResolvedValue(undefined);
    poolEnd.mockResolvedValue(undefined);
  });

  function createConfig(databaseUrl?: string): ConfigService {
    return {
      get: jest.fn((key: string) =>
        key === 'databaseUrl' ? databaseUrl : undefined,
      ),
    } as unknown as ConfigService;
  }

  it('throws when DATABASE_URL is missing', () => {
    expect(() => new PrismaService(createConfig(undefined))).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('creates the pg pool and adapter from config', () => {
    const service = new PrismaService(
      createConfig('postgresql://postgres:postgres@localhost:5432/app'),
    );

    expect(service).toBeInstanceOf(PrismaService);
    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/app',
    });
    expect(adapterConstructor).toHaveBeenCalledTimes(1);
  });

  it('connects and closes both prisma and pg pool through lifecycle hooks', async () => {
    const service = new PrismaService(
      createConfig('postgresql://postgres:postgres@localhost:5432/app'),
    );

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(prismaConnect).toHaveBeenCalledTimes(1);
    expect(prismaDisconnect).toHaveBeenCalledTimes(1);
    expect(poolEnd).toHaveBeenCalled();
  });
});
