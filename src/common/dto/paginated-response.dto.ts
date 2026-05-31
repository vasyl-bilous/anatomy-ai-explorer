import { ApiProperty } from '@nestjs/swagger';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 135 })
  total: number;

  @ApiProperty({ example: 7 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  constructor(params: {
    items: T[];
    page: number;
    limit: number;
    total: number;
  }) {
    const { items, page, limit, total } = params;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    this.items = items;
    this.meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
