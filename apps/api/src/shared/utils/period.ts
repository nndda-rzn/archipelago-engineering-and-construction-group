import type { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

/**
 * Bantuan periode akuntansi (bulan buku).
 *
 * Zona waktu pembukuan = **Asia/Jakarta (UTC+7, tanpa DST)** — keputusan D5. Offset
 * dipakai sebagai konstanta, bukan database zona waktu, karena Indonesia tidak memakai
 * daylight saving sehingga hasilnya deterministik.
 *
 * Semua rentang memakai batas **akhir eksklusif** (`gte` awal bulan, `lt` awal bulan
 * berikutnya) supaya jurnal pada jam terakhir bulan tidak salah masuk ke bulan berikutnya
 * atau terlewat.
 */

/** Asia/Jakarta = UTC+7 tanpa DST. */
export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Status PeriodClose yang menutup jalur posting (keputusan D4).
 *  - `CLOSED`  : buku periode sudah ditutup; tidak ada entri baru.
 *  - `LOCKED`  : pembekuan permanen setelah CLOSED.
 * Koreksi pada periode ini harus dicatat pada periode terbuka, bukan dimasukkan ke sini.
 */
export const POSTING_BLOCKED_PERIOD_STATUSES = ['CLOSED', 'LOCKED'] as const;

const PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;

export interface PeriodParts {
  year: number;
  month: number;
}

/** Parse "YYYY-MM" secara ketat; periode tidak valid = kegagalan keras. */
export function parsePeriod(period: string): PeriodParts {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) {
    throw new ConflictException({
      code: 'INVALID_PERIOD',
      message: `Period format must be YYYY-MM (received: "${period}")`,
    });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new ConflictException({ code: 'INVALID_PERIOD', message: `Invalid period month ("${period}")` });
  }
  return { year, month };
}

/** Rentang instan untuk satu periode. `lt` eksklusif agar batas bulan tidak tumpang tindih. */
export function periodRange(period: string): { gte: Date; lt: Date } {
  const { year, month } = parsePeriod(period);
  const gte = new Date(Date.UTC(year, month - 1, 1) - JAKARTA_OFFSET_MS);
  const lt = new Date(Date.UTC(year, month, 1) - JAKARTA_OFFSET_MS);
  return { gte, lt };
}

/** Periode "YYYY-MM" dari sebuah instan, menurut zona waktu Asia/Jakarta. */
export function periodOf(date: Date): string {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Where-clause jurnal POSTED dalam satu periode (dipakai hitungan period close). */
export function journalPeriodWhere(legalEntityId: string, period: string): Prisma.JournalWhereInput {
  const { gte, lt } = periodRange(period);
  return { legalEntityId, status: 'POSTED', date: { gte, lt } };
}

/**
 * Tolak penulisan jurnal bila periode tanggal tersebut sudah CLOSED/LOCKED untuk legal entity.
 *
 * WAJIB dipanggil di dalam transaksi penulisan supaya pemeriksaan dan penulisan berada pada
 * satu unit: pada jalur `withSerializableRetry` (GlHelper) ini menutup race antara admin
 * mengunci periode dan posting yang berjalan bersamaan.
 */
export async function assertPeriodOpen(
  tx: Pick<Prisma.TransactionClient, 'periodClose'>,
  legalEntityId: string,
  date: Date = new Date(),
): Promise<void> {
  const period = periodOf(date);
  const close = await tx.periodClose.findUnique({
    where: { legalEntityId_period: { legalEntityId, period } },
  });
  if (!close) return;
  if ((POSTING_BLOCKED_PERIOD_STATUSES as readonly string[]).includes(close.status)) {
    throw new ConflictException({
      code: close.status === 'LOCKED' ? 'PERIOD_LOCKED' : 'PERIOD_CLOSED',
      message:
        `Period ${period} is ${close.status === 'LOCKED' ? 'locked' : 'closed'}; posting is not allowed. ` +
        'Record corrections in an open period.',
    });
  }
}
