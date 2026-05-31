import {
  CursorPaginatedResponseDto,
  CursorPaginationQueryDto,
  decodeCursor,
  encodeCursor,
} from './cursor-pagination.dto';

describe('cursor-pagination', () => {
  describe('encodeCursor / decodeCursor round-trip', () => {
    it('encodes and decodes back to the original payload', () => {
      const payload = { id: 42, createdAtMs: 1_700_000_000_000 };
      const cursor = encodeCursor(payload);
      const result = decodeCursor(cursor);
      expect(result).toEqual(payload);
    });

    it('encodes to a non-empty base64url string', () => {
      const cursor = encodeCursor({ id: 1, createdAtMs: 1000 });
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });
  });

  describe('decodeCursor', () => {
    it('returns null for a malformed cursor (not valid base64url content)', () => {
      // This decodes fine but produces non-numeric parts → null
      const result = decodeCursor(
        Buffer.from('notanumber:alsonotanumber').toString('base64url'),
      );
      expect(result).toBeNull();
    });

    it('returns null for a cursor missing the delimiter', () => {
      const result = decodeCursor(
        Buffer.from('nodelimiterhere').toString('base64url'),
      );
      expect(result).toBeNull();
    });

    it('returns null when id is NaN', () => {
      const result = decodeCursor(
        Buffer.from('abc:1000').toString('base64url'),
      );
      expect(result).toBeNull();
    });

    it('returns null when createdAtMs is NaN', () => {
      const result = decodeCursor(Buffer.from('42:xyz').toString('base64url'));
      expect(result).toBeNull();
    });
  });

  describe('CursorPaginationQueryDto', () => {
    it('has default limit of 50', () => {
      const dto = new CursorPaginationQueryDto();
      expect(dto.limit).toBe(50);
    });
  });

  describe('CursorPaginatedResponseDto', () => {
    it('sets hasNextPage to true when nextCursor is provided', () => {
      const dto = new CursorPaginatedResponseDto({
        items: [1, 2, 3],
        limit: 50,
        nextCursor: 'some-cursor',
      });
      expect(dto.meta.hasNextPage).toBe(true);
      expect(dto.meta.nextCursor).toBe('some-cursor');
    });

    it('sets hasNextPage to false when nextCursor is null', () => {
      const dto = new CursorPaginatedResponseDto({
        items: [1, 2],
        limit: 50,
        nextCursor: null,
      });
      expect(dto.meta.hasNextPage).toBe(false);
      expect(dto.meta.nextCursor).toBeNull();
    });

    it('exposes items and limit correctly', () => {
      const items = ['a', 'b'];
      const dto = new CursorPaginatedResponseDto({
        items,
        limit: 25,
        nextCursor: null,
      });
      expect(dto.items).toBe(items);
      expect(dto.meta.limit).toBe(25);
    });
  });
});
