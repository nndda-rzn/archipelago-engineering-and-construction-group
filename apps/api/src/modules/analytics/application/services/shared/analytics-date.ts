import { monthKeyUtc } from '@/shared/utils/month-key';

/** N bulan terakhir (termasuk bulan berjalan), urut lama → baru. */
export function lastNMonthsUtc(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(monthKeyUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return out;
}

/** Semua bulan yang menyentuh rentang `a`..`b`, urut lama → baru. */
export function monthSpanUtc(a: Date, b: Date): string[] {
  const start = a.getTime() <= b.getTime() ? a : b;
  const end = a.getTime() <= b.getTime() ? b : a;
  const out: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor.getTime() <= last.getTime()) {
    out.push(monthKeyUtc(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}
