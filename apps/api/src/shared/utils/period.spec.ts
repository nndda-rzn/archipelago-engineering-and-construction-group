import { parsePeriod, periodRange, periodOf, journalPeriodWhere, assertPeriodOpen, JAKARTA_OFFSET_MS } from './period';

describe('period utils', () => {
  describe('parsePeriod', () => {
    it('menerima YYYY-MM yang valid', () => {
      expect(parsePeriod('2026-08')).toEqual({ year: 2026, month: 8 });
      expect(parsePeriod('2026-12')).toEqual({ year: 2026, month: 12 });
    });

    it('menolak format yang salah -> INVALID_PERIOD', () => {
      for (const bad of ['2026-13', '2026-00', '2026/08', '26-08', '2026-8', 'agustus', '']) {
        let code: string | undefined;
        try {
          parsePeriod(bad);
        } catch (e) {
          const body = (e as { getResponse?: () => { code?: string } }).getResponse?.();
          code = body?.code;
        }
        expect(code).toBe('INVALID_PERIOD');
      }
    });
  });

  describe('periodRange (Asia/Jakarta, batas akhir eksklusif)', () => {
    it('Agustus 2026 = 2026-08-01T00:00 WIB s/d < 2026-09-01T00:00 WIB', () => {
      const { gte, lt } = periodRange('2026-08');
      // 2026-08-01 00:00 WIB = 2026-07-31 17:00 UTC
      expect(gte.toISOString()).toBe('2026-07-31T17:00:00.000Z');
      // 2026-09-01 00:00 WIB = 2026-08-31 17:00 UTC
      expect(lt.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    });

    it('batas eksklusif: jurnal tepat di awal bulan berikutnya TIDAK termasuk', () => {
      const { lt } = periodRange('2026-08');
      const firstOfSeptember = new Date('2026-08-31T17:00:00.000Z'); // 2026-09-01 00:00 WIB
      expect(firstOfSeptember.getTime() >= lt.getTime()).toBe(true);
    });

    it('jurnal pada jam terakhir bulan (WIB) tetap termasuk', () => {
      const { gte, lt } = periodRange('2026-08');
      const lastMoment = new Date('2026-08-31T16:59:59.999Z'); // 2026-08-31 23:59:59.999 WIB
      expect(lastMoment.getTime()).toBeGreaterThanOrEqual(gte.getTime());
      expect(lastMoment.getTime()).toBeLessThan(lt.getTime());
    });

    it('Desember menyeberang tahun', () => {
      const { gte, lt } = periodRange('2026-12');
      expect(gte.toISOString()).toBe('2026-11-30T17:00:00.000Z');
      expect(lt.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it('Februari tahun kabisat 2028 punya 29 hari', () => {
      const { gte, lt } = periodRange('2028-02');
      const days = (lt.getTime() - gte.getTime()) / (24 * 60 * 60 * 1000);
      expect(days).toBe(29);
    });

    it('selalu 7 jam offset (tanpa DST)', () => {
      expect(JAKARTA_OFFSET_MS).toBe(7 * 60 * 60 * 1000);
    });
  });

  describe('periodOf', () => {
    it('memakai zona waktu Asia/Jakarta, bukan UTC', () => {
      // 2026-08-31 22:00 UTC = 2026-09-01 05:00 WIB -> periode September, bukan Agustus.
      expect(periodOf(new Date('2026-08-31T22:00:00.000Z'))).toBe('2026-09');
      // 2026-08-31 16:00 UTC = 2026-08-31 23:00 WIB -> masih Agustus.
      expect(periodOf(new Date('2026-08-31T16:00:00.000Z'))).toBe('2026-08');
    });
  });

  describe('journalPeriodWhere', () => {
    it('mengikat legal entity + status POSTED + rentang periode', () => {
      const where = journalPeriodWhere('ent-1', '2026-08');
      expect(where.legalEntityId).toBe('ent-1');
      expect(where.status).toBe('POSTED');
      expect(where.date).toEqual(periodRange('2026-08'));
    });
  });

  describe('assertPeriodOpen', () => {
    const txWith = (close: { status: string } | null) => ({
      periodClose: { findUnique: jest.fn().mockResolvedValue(close) },
    });

    it('tanpa PeriodClose -> lolos', async () => {
      await expect(assertPeriodOpen(txWith(null) as never, 'ent-1', new Date('2026-08-15T00:00:00Z'))).resolves.toBeUndefined();
    });

    it('OPEN / IN_PROGRESS -> lolos', async () => {
      await expect(assertPeriodOpen(txWith({ status: 'OPEN' }) as never, 'ent-1', new Date('2026-08-15T00:00:00Z'))).resolves.toBeUndefined();
      await expect(assertPeriodOpen(txWith({ status: 'IN_PROGRESS' }) as never, 'ent-1', new Date('2026-08-15T00:00:00Z'))).resolves.toBeUndefined();
    });

    it('CLOSED -> Conflict PERIOD_CLOSED', async () => {
      await expect(assertPeriodOpen(txWith({ status: 'CLOSED' }) as never, 'ent-1', new Date('2026-08-15T00:00:00Z'))).rejects.toMatchObject({
        response: { code: 'PERIOD_CLOSED' },
      });
    });

    it('LOCKED -> Conflict PERIOD_LOCKED', async () => {
      await expect(assertPeriodOpen(txWith({ status: 'LOCKED' }) as never, 'ent-1', new Date('2026-08-15T00:00:00Z'))).rejects.toMatchObject({
        response: { code: 'PERIOD_LOCKED' },
      });
    });

    it('mencari periode berdasarkan tanggal (Asia/Jakarta)', async () => {
      const tx = txWith(null);
      // 2026-08-31 22:00 UTC = 2026-09-01 WIB -> periode September.
      await assertPeriodOpen(tx as never, 'ent-1', new Date('2026-08-31T22:00:00.000Z'));
      expect(tx.periodClose.findUnique).toHaveBeenCalledWith({
        where: { legalEntityId_period: { legalEntityId: 'ent-1', period: '2026-09' } },
      });
    });
  });
});
