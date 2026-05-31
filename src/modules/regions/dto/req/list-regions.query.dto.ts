import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import type { RegionScreen } from '../../../../shared/contracts/anatomy.contract';

// Runtime list for validation + Swagger; `satisfies` ties it to the shared
// `RegionScreen` type so it can't silently drift.
const SCREENS = ['body', 'brain'] as const satisfies readonly RegionScreen[];

/** Query for `GET /api/v1/regions` — optionally filter by illustration screen. */
export class ListRegionsQueryDto {
  @ApiPropertyOptional({
    enum: SCREENS,
    description: 'Filter regions by the illustration they belong to.',
  })
  @IsOptional()
  @IsIn(SCREENS)
  screen?: RegionScreen;
}
