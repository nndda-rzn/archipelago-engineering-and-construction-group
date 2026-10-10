import { cn } from '../lib/cn';

export interface RateMatrixProps {
  /** Kode mata uang baris (From). */
  rows: string[];
  /** Kode mata uang kolom (To). */
  cols: string[];
  /** Nilai kurs terbaru untuk pasangan (baris, kolom); `null` bila tak ada. */
  value: (row: string, col: string) => number | null;
  format: (n: number) => string;
  className?: string;
}

/**
 * Matriks kurs: baris = From, kolom = To, sel = kurs terbaru. Intensitas warna
 * **sekuensial** (satu hue, gelap = nilai lebih besar) — bukan kategori — dan
 * setiap sel membawa nilai penuh lewat `title`, jadi angka terbaca tanpa warna.
 * Pasangan tanpa kurs ditandai "—".
 */
export function RateMatrix({ rows, cols, value, format, className }: RateMatrixProps) {
  const values = rows.flatMap((r) => cols.map((c) => value(r, c))).filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const intensity = (v: number): number => {
    if (max <= min) return 0.5;
    return 0.15 + 0.75 * ((v - min) / (max - min));
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-body-sm" aria-label="Latest exchange rates by currency pair">
        <thead>
          <tr className="text-caption uppercase text-neutral-500">
            <th scope="col" className="py-2 pr-3 text-left font-medium">From \ To</th>
            {cols.map((c) => (
              <th key={c} scope="col" className="py-2 px-2 text-right font-mono font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r} className="border-t border-neutral-100">
              <th scope="row" className="py-2 pr-3 text-left font-mono text-neutral-800">{r}</th>
              {cols.map((c) => {
                const v = value(r, c);
                const same = r === c;
                const bg = v != null && !same ? intensity(v) : 0;
                return (
                  <td
                    key={c}
                    title={v == null ? undefined : format(v)}
                    className="relative py-2 px-2 text-right font-mono tabular-nums text-neutral-900"
                  >
                    {bg > 0 && (
                      <span
                        aria-hidden="true"
                        data-slot="rate-cell-bg"
                        className="absolute inset-0 -z-10 bg-neutral-800"
                        style={{ opacity: bg }}
                      />
                    )}
                    <span className={bg > 0.6 ? 'relative text-white' : 'relative'}>
                      {same ? '—' : v == null ? '—' : format(v)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
