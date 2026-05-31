import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Opaque cursor format: `base64url(<id>:<createdAt-ms>)`. The shape is an
 * implementation detail of the server — clients must treat it as a blob.
 * Bumping the format is a no-op: old cursors decode wrong → server returns
 * a 400 and the client refetches from the start.
 */
export interface CursorPayload {
  id: number;
  createdAtMs: number;
}

const CURSOR_DELIM = ':';

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(
    `${payload.id}${CURSOR_DELIM}${payload.createdAtMs}`,
  ).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [idRaw, msRaw] = decoded.split(CURSOR_DELIM);
    const id = Number.parseInt(idRaw, 10);
    const createdAtMs = Number.parseInt(msRaw, 10);
    if (!Number.isFinite(id) || !Number.isFinite(createdAtMs)) return null;
    return { id, createdAtMs };
  } catch {
    return null;
  }
}

export class CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque cursor returned from the previous page. Omit on first call.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ example: 50, default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

class CursorPaginationMetaDto {
  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  nextCursor: string | null;
}

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ type: CursorPaginationMetaDto })
  meta: CursorPaginationMetaDto;

  constructor(params: {
    items: T[];
    limit: number;
    nextCursor: string | null;
  }) {
    this.items = params.items;
    this.meta = {
      limit: params.limit,
      hasNextPage: params.nextCursor !== null,
      nextCursor: params.nextCursor,
    };
  }
}
