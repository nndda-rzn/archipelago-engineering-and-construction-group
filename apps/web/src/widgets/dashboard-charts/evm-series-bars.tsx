import { CHART } from './chart-colors';

export interface EvmSeriesItem {
  /** Label proyek (mis. kode proyek). */
  name: string;
  /** Cost Performance Index; 1.0 adalah target. Null bila tanpa baseline. */
  cpi: number | null;
  /** Schedule Performance Index; 1.0 adalah target. Null bila tanpa baseline. */
  spi: number | null;
}

/**
 * Grouped bar EVM per proyek: satu baris per proyek dengan **dua batang**
 * (CPI dan SPI) dan satu garis target 1.0. Panjang batang = besaran rasio
 * (skala 0…max), sehingga bermakna walau banyak proyek bernilai sama — tidak
 * seperti scatter yang butuh sebaran 2D.
 *
 * Makna tidak bergantung pada warna: setiap baris juga menampilkan kedua angka
 * (`cpi / spi`) dan setiap batang membawa `role="img"` + aria-label.
 */
export function EvmSeriesBars({
  items,
  max = 1.5,
  emptyMessage = 'No EVM data.',
  className,
}: {
  items: EvmSeriesItem[];
  /** Skala maksimum batang (rasio). Default 1.5 agar batang 1.0 tak menyentuh tepi. */
  max?: number;
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-body-sm text-neutral-500">{emptyMessage}</p>;
  }

  const targetPct = (1 / max) * 100;
  const pctOf = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));

  return (
    <ul className={className} aria-label="CPI and SPI by project vs target 1.0">
      {items.map((item) => (
        <li key={item.name} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2.5 py-1">
          <span className="truncate font-mono text-caption text-neutral-600" title={item.name}>
            {item.name}
          </span>
          <span className="flex flex-col gap-0.5">
            <span
              role="img"
              aria-label={`${item.name} CPI ${item.cpi == null ? 'no data' : item.cpi.toFixed(2)} vs target 1.00`}
              className="relative h-2 w-full overflow-hidden rounded-sm bg-neutral-100"
            >
              {item.cpi != null && (
                <span
                  data-slot="evm-series-fill"
                  data-series="cpi"
                  className="block h-full rounded-sm"
                  style={{ width: `${pctOf(item.cpi)}%`, backgroundColor: CHART.strong }}
                />
              )}
              <span aria-hidden="true" className="absolute top-0 h-full w-px bg-neutral-900" style={{ left: `${targetPct}%` }} />
            </span>
            <span
              role="img"
              aria-label={`${item.name} SPI ${item.spi == null ? 'no data' : item.spi.toFixed(2)} vs target 1.00`}
              className="relative h-2 w-full overflow-hidden rounded-sm bg-neutral-100"
            >
              {item.spi != null && (
                <span
                  data-slot="evm-series-fill"
                  data-series="spi"
                  className="block h-full rounded-sm"
                  style={{ width: `${pctOf(item.spi)}%`, backgroundColor: CHART.axis }}
                />
              )}
              <span aria-hidden="true" className="absolute top-0 h-full w-px bg-neutral-900" style={{ left: `${targetPct}%` }} />
            </span>
          </span>
          <span className="text-right font-mono text-caption tabular-nums">
            <span className="text-neutral-800">{item.cpi == null ? '—' : item.cpi.toFixed(2)}</span>
            <span className="text-neutral-300"> / </span>
            <span className="text-neutral-500">{item.spi == null ? '—' : item.spi.toFixed(2)}</span>
          </span>
        </li>
      ))}
      <li className="mt-1 flex items-center gap-3 text-caption text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: CHART.strong }} aria-hidden="true" /> CPI
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: CHART.axis }} aria-hidden="true" /> SPI
        </span>
        <span>· target 1.0</span>
      </li>
    </ul>
  );
}
