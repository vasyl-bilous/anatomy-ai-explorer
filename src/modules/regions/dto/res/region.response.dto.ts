import { ApiProperty } from '@nestjs/swagger';

import type {
  Marker,
  Region,
  RegionScreen,
} from '../../../../shared/contracts/anatomy.contract';

/** Swagger/response shape for a marker anchor. Implements the shared `Marker`. */
export class MarkerResponseDto implements Marker {
  @ApiProperty({ example: 'ckv1a2b3c4d5e6f7g8h9' })
  id!: string;

  @ApiProperty({
    example: 39.7,
    description: '0–100, % of illustration box width',
  })
  xPct!: number;

  @ApiProperty({
    example: 21.1,
    description: '0–100, % of illustration box height',
  })
  yPct!: number;

  @ApiProperty({ example: 'Entorhinal Cortex' })
  label!: string;

  @ApiProperty({ example: '#FF0000' })
  color!: string;

  @ApiProperty({ example: 'Memory and navigation hub' })
  tooltip!: string;
}

/** Swagger/response shape for a region. Implements the shared `Region`. */
export class RegionResponseDto implements Region {
  @ApiProperty({ example: 'ckv1a2b3c4d5e6f7g8h9' })
  id!: string;

  @ApiProperty({ example: "Alzheimer's Disease" })
  name!: string;

  @ApiProperty({
    example: 'Neurological',
    nullable: true,
    description: 'Category badge; null for brain sub-regions.',
  })
  category!: string | null;

  @ApiProperty({ enum: ['body', 'brain'], example: 'body' })
  screen!: RegionScreen;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Parent region id for brain sub-regions; null on body.',
  })
  parentId!: string | null;

  @ApiProperty({ type: [MarkerResponseDto] })
  markers!: MarkerResponseDto[];
}
