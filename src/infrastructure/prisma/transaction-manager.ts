import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

import { PrismaService } from './prisma.service';

export type PrismaTx = Prisma.TransactionClient;
export type PrismaDb = PrismaTx | PrismaService;

@Injectable()
export class TransactionManager {
  private readonly storage = new AsyncLocalStorage<PrismaTx>();

  constructor(private readonly prisma: PrismaService) {}

  getClient(): PrismaDb {
    return this.storage.getStore() ?? this.prisma;
  }

  async run<T>(
    fn: (tx: PrismaTx) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    const existing = this.storage.getStore();
    if (existing) {
      return fn(existing);
    }

    return this.prisma.$transaction(
      async (tx) => this.storage.run(tx, () => fn(tx)),
      options,
    );
  }
}
