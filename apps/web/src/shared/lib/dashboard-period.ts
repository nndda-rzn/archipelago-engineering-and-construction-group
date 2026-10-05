export type PeriodPreset = 'MTD' | 'QTD' | 'YTD' | '12M' | 'CUSTOM';

/** Filter dashboard yang dipakai lintas hook. */
export interface DashboardFilter {
  legalEntityId?: string;
  from?: string;
  to?: string;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Terjemahkan preset periode menjadi rentang tanggal ISO (YYYY-MM-DD).
 * `to` selalu `now` untuk empat preset; `CUSTOM` memakai batas yang diberikan.
 */
export function resolvePeriod(
  preset: PeriodPreset,
  now: Date,
  custom?: { from?: string; to?: string },
): { from?: string; to?: string } {
  const to = iso(now);
  switch (preset) {
    case 'MTD':
      return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
    case 'QTD': {
      const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1))), to };
    }
    case 'YTD':
      return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), to };
    case '12M': {
      const start = new Date(now);
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      return { from: iso(start), to };
    }
    case 'CUSTOM':
      return { from: custom?.from, to: custom?.to };
  }
}
