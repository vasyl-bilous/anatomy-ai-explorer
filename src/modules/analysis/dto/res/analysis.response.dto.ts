import { ApiProperty } from '@nestjs/swagger';

import type {
  Analysis,
  AnalysisJobStatus,
  AnalysisResult,
} from '../../../../shared/contracts/anatomy.contract';
import { ANALYSIS_JOB_STATUSES } from '../../analysis.constants';

class AnalysisResultDto implements AnalysisResult {
  @ApiProperty({ example: 'Potential abnormal activity detected…' })
  summary!: string;

  @ApiProperty({ type: [String], example: ['Increased signal intensity…'] })
  findings!: string[];

  @ApiProperty({ example: 87, description: '0–100' })
  confidence!: number;

  @ApiProperty({ example: '2026-05-30T20:00:00.000Z' })
  completedAt!: string;
}

export class AnalysisResponseDto implements Analysis {
  @ApiProperty({ example: '4f1c2f9a-4f9a-4b0c-b4b3-3d3a7b7d4a5e' })
  id!: string;

  @ApiProperty({ example: 'ckv1a2b3c4d5e6f7g8h9' })
  regionId!: string;

  @ApiProperty({ enum: ANALYSIS_JOB_STATUSES, example: 'processing' })
  status!: AnalysisJobStatus;

  @ApiProperty({
    type: AnalysisResultDto,
    nullable: true,
    description: 'Present only when status is "completed".',
  })
  result!: AnalysisResult | null;
}
