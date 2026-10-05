import { BadRequestException } from '@nestjs/common';
import { resolveDateRange } from './date-range';

describe('resolveDateRange', () => {
  it('returns empty object when no bounds given', () => {
    expect(resolveDateRange()).toEqual({});
  });

  it('parses ISO date bounds', () => {
    const r = resolveDateRange('2026-01-01', '2026-03-31');
    expect(r.from?.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(r.to?.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('throws INVALID_DATE_RANGE when from > to', () => {
    expect(() => resolveDateRange('2026-03-01', '2026-01-01')).toThrow(BadRequestException);
    try {
      resolveDateRange('2026-03-01', '2026-01-01');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({ code: 'INVALID_DATE_RANGE' });
    }
  });

  it('throws DATE_RANGE_TOO_WIDE beyond 5 years', () => {
    try {
      resolveDateRange('2015-01-01', '2026-01-01');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({ code: 'DATE_RANGE_TOO_WIDE' });
    }
  });
});
