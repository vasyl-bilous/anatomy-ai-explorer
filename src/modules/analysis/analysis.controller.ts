import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiNotFoundErrorResponse } from '../../common/swagger/api-error-response.decorator';
import {
  ApiSuccessCreatedResponse,
  ApiSuccessOkResponse,
} from '../../common/swagger/api-success-response.decorator';
import type { Analysis } from '../../shared/contracts/anatomy.contract';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/req/create-analysis.dto';
import { AnalysisResponseDto } from './dto/res/analysis.response.dto';

@ApiTags('analyses')
@Controller('analyses')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // 202 — accepted, result not ready yet
  @ApiOperation({ summary: 'Start an AI analysis for a region (async)' })
  @ApiSuccessCreatedResponse({
    description: 'Analysis accepted; poll GET /analyses/:id for the result',
    type: AnalysisResponseDto,
  })
  @ResponseMessage('Analysis started')
  create(@Body() body: CreateAnalysisDto): Analysis {
    return this.analysis.create(body.regionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Poll an analysis by id' })
  @ApiParam({ name: 'id', example: '4f1c2f9a-4f9a-4b0c-b4b3-3d3a7b7d4a5e' })
  @ApiSuccessOkResponse({
    description: 'Current analysis status (and result when completed)',
    type: AnalysisResponseDto,
  })
  @ApiNotFoundErrorResponse('Analysis not found')
  get(@Param('id') id: string): Analysis {
    const job = this.analysis.get(id);
    if (!job) {
      throw new NotFoundException(`Analysis "${id}" not found`);
    }
    return job;
  }
}
