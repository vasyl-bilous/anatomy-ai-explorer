import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { CreateAnalysisRequest } from '../../../../shared/contracts/anatomy.contract';

/**
 * Body for `POST /api/v1/analyses`. Every field is declared because the global
 * ValidationPipe is `forbidNonWhitelisted` — unknown keys 400.
 */
export class CreateAnalysisDto implements CreateAnalysisRequest {
  @ApiProperty({
    example: 'ckv1a2b3c4d5e6f7g8h9',
    description: 'Region to analyse',
  })
  @IsString()
  @IsNotEmpty()
  regionId!: string;
}
