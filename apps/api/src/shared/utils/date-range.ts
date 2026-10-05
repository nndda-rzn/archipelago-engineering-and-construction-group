import { BadRequestException } from '@nestjs/common';

const MAX_RANGE_MS = 5 * 365.25 * 86_400_000;

/**
 * Terjemahkan rentang tanggal opsional (ISO YYYY-MM-DD) menjadi batas `Date`.
 * Mengembalikan hanya batas yang diberikan. Melempar 400 bila `from > to`
 * atau rentang melebihi 5 tahun.
 */
export function resolveDateRange(from?: string, to?: string): { from?: Date; to?: Date } {
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  if (fromDate && toDate) {
    if (fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'from must be before to' });
    }
    if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException({ code: 'DATE_RANGE_TOO_WIDE', message: 'Date range must not exceed 5 years' });
    }
  }

  return { from: fromDate, to: toDate };
}
