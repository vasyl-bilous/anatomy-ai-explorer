import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import {
  ApiNotFoundErrorResponse,
  ApiValidationErrorResponse,
} from '../../common/swagger/api-error-response.decorator';
import { ApiSuccessOkResponse } from '../../common/swagger/api-success-response.decorator';
import type { Region } from '../../shared/contracts/anatomy.contract';
import { ListRegionsQueryDto } from './dto/req/list-regions.query.dto';
import { RegionResponseDto } from './dto/res/region.response.dto';
import { RegionsService } from './regions.service';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'List anatomy regions (optionally by screen)' })
  @ApiSuccessOkResponse({
    description: 'Regions with their marker anchors',
    type: RegionResponseDto,
    isArray: true,
  })
  @ApiValidationErrorResponse()
  @ResponseMessage('Regions retrieved')
  list(@Query() query: ListRegionsQueryDto): Promise<Region[]> {
    return this.regions.list(query.screen);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one region (with markers) by id' })
  @ApiParam({ name: 'id', example: 'ckv1a2b3c4d5e6f7g8h9' })
  @ApiSuccessOkResponse({
    description: 'The region with its marker anchors',
    type: RegionResponseDto,
  })
  @ApiNotFoundErrorResponse('Region not found')
  @ResponseMessage('Region retrieved')
  getById(@Param('id') id: string): Promise<Region> {
    return this.regions.getById(id);
  }
}
