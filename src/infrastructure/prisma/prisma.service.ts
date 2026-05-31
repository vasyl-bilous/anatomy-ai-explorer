import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private poolEnded = false;

  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('databaseUrl');
    if (!connectionString) throw new Error('DATABASE_URL is required');

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter, log: ['warn', 'error'] });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.endPool();
    this.logger.log('Prisma + pg pool disconnected');
  }

  /**
   * Close the pg pool exactly once. On SIGTERM during a Render redeploy the
   * shutdown path could reach `pool.end()` twice, and pg throws
   * "Called end on pool more than once" — a harmless but noisy error logged on
   * every deploy. A guard flag (plus a swallow of that specific message) makes
   * teardown idempotent.
   */
  private async endPool(): Promise<void> {
    if (this.poolEnded) return;
    this.poolEnded = true;
    try {
      await this.pool.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('more than once')) throw err;
    }
  }
}
