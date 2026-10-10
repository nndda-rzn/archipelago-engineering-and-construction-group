import { EmptyState, RateMatrix } from '@aec/ui';
import type { ExchangeRate } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/**
 * Matriks kurs terbaru: baris = From, kolom = To, sel = rate paling baru per
 * pasangan. Menjawab "semua pasangan sekaligus" — intensitas sel sekuensial,
 * nilai penuh lewat `title`.
 */
export function RateMatrixPanel({ rates }: { rates: ExchangeRate[] }) {
  if (rates.length === 0) {
    return <EmptyState title="No exchange rates" description="Record a rate to populate the matrix." />;
  }
  // Ambil rate terbaru per pasangan (ExchangeRate datang urut effectiveDate desc).
  const latest = new Map<string, number>();
  for (const r of rates) {
    const key = `${r.fromCurrency.code}::${r.toCurrency.code}`;
    if (!latest.has(key)) latest.set(key, r.rate);
  }
  const rows = [...new Set(rates.map((r) => r.fromCurrency.code))].sort();
  const cols = [...new Set(rates.map((r) => r.toCurrency.code))].sort();

  return (
    <RateMatrix
      rows={rows}
      cols={cols}
      value={(row, col) => latest.get(`${row}::${col}`) ?? null}
      format={formatIdr}
    />
  );
}
