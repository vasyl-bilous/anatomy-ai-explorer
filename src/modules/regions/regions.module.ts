import { Module } from '@nestjs/common';

import { RegionsController } from './regions.controller';
import { RegionsRepository } from './regions.repository';
import { RegionsService } from './regions.service';

// PrismaService is provided globally (PrismaModule is @Global), so it doesn't
// need importing here.
@Module({
  controllers: [RegionsController],
  providers: [RegionsService, RegionsRepository],
})
export class RegionsModule {}
