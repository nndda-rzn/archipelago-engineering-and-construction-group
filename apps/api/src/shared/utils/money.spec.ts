import { toCents, fromCents } from './money';

describe('money', () => {
  describe('toCents', () => {
    it('membulatkan ke sen terdekat', () => {
      expect(toCents(100)).toBe(10000);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(1234.56)).toBe(123456);
    });

    it('menerima string dan Decimal-like (hasil Prisma)', () => {
      expect(toCents('1234.56')).toBe(123456);
      expect(toCents({ toString: () => '99.99' })).toBe(9999);
    });

    it('null/undefined -> 0', () => {
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
    });

    it('menghilangkan galat floating point yang membuat perbandingan toleransi tidak perlu', () => {
      // 0.1 + 0.2 !== 0.3 pada float, tetapi dalam sen keduanya sama.
      expect(0.1 + 0.2 === 0.3).toBe(false);
      expect(toCents(0.1) + toCents(0.2)).toBe(toCents(0.3));
    });

    it('membedakan nominal yang berbeda 1 sen (tidak lagi "kira-kira sama")', () => {
      // Dengan toleransi lama (0.001), selisih 1 sen bisa dianggap sama pada nominal besar.
      expect(toCents(1_000_000.01)).toBeGreaterThan(toCents(1_000_000));
      expect(toCents(1_000_000.01) - toCents(1_000_000)).toBe(1);
    });
  });

  describe('fromCents', () => {
    it('kebalikan dari toCents untuk nilai 2 desimal', () => {
      expect(fromCents(toCents(1234.56))).toBe(1234.56);
      expect(fromCents(1)).toBe(0.01);
      expect(fromCents(0)).toBe(0);
    });
  });
});
