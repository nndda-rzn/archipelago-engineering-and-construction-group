import { cn } from '../lib/cn';

export interface EvmMetrics {
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  cpi: number | null;
  spi: number | null;
  cv: number;
  sv: number;
}

export interface EvmRatios {
  pv: number;
  ev: number;
  ac: number;
}

/**
 * Skalakan PV/EV/AC terhadap nilai terbesar di antara ketiganya agar panjang
 * batang sebanding (satuan sama: rupiah). Semua nol → 0% (tanpa pembagian nol).
 */
export function evmRatios({ pv, ev, ac }: EvmMetrics): EvmRatios {
  const max = Math.max(pv, ev, ac, 0);
  const pct = (v: number) => (max > 0 ? Math.round((v / max) * 1000) / 10 : 0);
  return { pv: pct(pv), ev: pct(ev), ac: pct(ac) };
}

const SERIES: Array<{ key: keyof EvmRatios; label: string; bar: string; meaning: string }> = [
  { key: 'pv', label: 'PV', bar: 'bg-neutral-300', meaning: 'Planned value' },
  { key: 'ev', label: 'EV', bar: 'bg-financial-positive-500', meaning: 'Earned value' },
  { key: 'ac', label: 'AC', bar: 'bg-neutral-800', meaning: 'Actual cost' },
];

/**
 * Tiga bar sejajar PV/EV/AC (satuan sama → langsung sebanding) plus CPI/SPI
 * sebagai angka — bukan gauge (gauge adalah anti-pola untuk rasio tunggal).
 * Aksesibel via `role="img"` + aria-label berisi ketiga nilai.
 */
export function EvmBars({ metrics, format = String, className }: { metrics: EvmMetrics; format?: (n: number) => string; className?: string }) {
  const ratios = evmRatios(metrics);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="img"
        aria-label={`PV ${format(metrics.pv)}, EV ${format(metrics.ev)}, AC ${format(metrics.ac)}`}
        className="space-y-1.5"
      >
        {SERIES.map((s) => (
          <div key={s.key} className="grid grid-cols-[2rem_1fr] items-center gap-3">
            <span className="text-caption font-medium text-neutral-500" title={s.meaning}>
              {s.label}
            </span>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-neutral-100">
              <div data-slot="evm-bar" className={cn('h-full rounded-sm', s.bar)} style={{ width: `${ratios[s.key]}%` }} />
            </div>
          </div>
        ))}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-caption text-neutral-500">CPI</dt>
          <dd
            data-slot="evm-index"
            data-ok={metrics.cpi == null ? undefined : String(metrics.cpi >= 1)}
            className={cn('font-mono text-body-sm tabular-nums', metrics.cpi == null ? 'text-neutral-400' : metrics.cpi >= 1 ? 'text-financial-positive-600' : 'text-warning-600')}
          >
            {metrics.cpi == null ? '—' : metrics.cpi.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-caption text-neutral-500">SPI</dt>
          <dd
            data-slot="evm-index"
            data-ok={metrics.spi == null ? undefined : String(metrics.spi >= 1)}
            className={cn('font-mono text-body-sm tabular-nums', metrics.spi == null ? 'text-neutral-400' : metrics.spi >= 1 ? 'text-financial-positive-600' : 'text-warning-600')}
          >
            {metrics.spi == null ? '—' : metrics.spi.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
