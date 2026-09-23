import { encodeCursor, decodeCursor, keysetWhere, type TimeIdCursor } from './keyset-cursor';

describe('keyset-cursor', () => {
  const cursor: TimeIdCursor = { createdAt: new Date('2026-09-23T10:00:00.000Z'), id: 'clx123' };

  describe('encodeCursor / decodeCursor', () => {
    it('roundtrip mengembalikan createdAt + id yang sama', () => {
      const decoded = decodeCursor(encodeCursor(cursor));
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe('clx123');
      expect(decoded!.createdAt.toISOString()).toBe('2026-09-23T10:00:00.000Z');
    });

    it('cursor rusak / bukan base64 valid -> null', () => {
      expect(decodeCursor('@@not-base64@@')).toBeNull();
    });

    it('payload tanpa separator -> null', () => {
      expect(decodeCursor(Buffer.from('tanpa-separator', 'utf8').toString('base64url'))).toBeNull();
    });

    it('tanggal invalid -> null', () => {
      expect(decodeCursor(Buffer.from('bukan-tanggal|id-1', 'utf8').toString('base64url'))).toBeNull();
    });
  });

  describe('keysetWhere', () => {
    it('gabungkan baseWhere + OR keyset (createdAt lt ATAU createdAt==id<)', () => {
      const where = keysetWhere({ projectId: 'proj-1' }, cursor);
      expect(where.projectId).toBe('proj-1');
      expect(where.OR).toEqual([
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: 'clx123' } },
      ]);
    });
  });
});
