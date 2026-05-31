import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service';
import { TransactionManager } from './transaction-manager';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, TransactionManager],
  exports: [PrismaService, TransactionManager],
})
export class PrismaModule {}
