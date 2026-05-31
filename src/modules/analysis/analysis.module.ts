import { Module } from '@nestjs/common';

import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { RandomSource } from './random.provider';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, RandomSource],
})
export class AnalysisModule {}
