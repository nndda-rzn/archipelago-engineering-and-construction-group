import { monthKeyUtc } from '@/shared/utils/month-key';
import { resolveDateRange } from '@/shared/utils/date-range';

/**
 * Batas periode pembanding ("sebelumnya"). Bila filter punya rentang eksplisit,
 * geser mundur sepanjang rentang itu; tanpa rentang → bulan kalender sebelumnya.
 * Satu sumber agar executive, cash flow, dan aging membandingkan dengan periode
 * yang sama persis.
 */
export function previousPeriodBounds(
  filter: { from?: string; to?: string },
  now: Date = new Date(),
): { from: Date; to: Date } {
  const { from, to } = resolveDateRange(filter.from, filter.to);
  if (from && to) {
    const spanMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);
    return { from: prevFrom, to: prevTo };
  }
  const base = to ?? now;
  const prevTo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 0));
  const prevFrom = new Date(Date.UTC(prevTo.getUTCFullYear(), prevTo.getUTCMonth(), 1));
  return { from: prevFrom, to: prevTo };
}

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
