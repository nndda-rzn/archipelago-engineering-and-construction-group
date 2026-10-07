export interface EvmBulletItem {
  name: string;
  /** CPI/SPI value; 1.0 adalah target. */
  value: number;
}

/**
 * Bullet graph EVM per proyek: satu baris per proyek dengan penanda target 1.0.
 * Proyek di bawah 1.0 (merah) langsung terbaca lewat **panjang bar + warna +
 * label angka** (bukan warna saja).
 */
export function EvmBullets({ items, max = 1.5, label = 'index' }: { items: EvmBulletItem[]; max?: number; label?: string }) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-body-sm text-neutral-500">No EVM data.</p>;
  }
  return (
    <ul className="space-y-2" aria-label={`${label} by project vs target 1.0`}>
      {items.map((item) => {
        const below = item.value < 1;
        const pct = Math.min(100, (item.value / max) * 100);
        const targetPct = (1 / max) * 100;
        return (
          <li key={item.name} className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-2.5">
            <span className="truncate text-caption text-neutral-500" title={item.name}>
              {item.name}
            </span>
            <span
              role="img"
              aria-label={`${item.name} ${label} ${item.value.toFixed(2)} vs target 1.00`}
              className="relative h-2.5 w-full overflow-hidden rounded-sm bg-neutral-100"
            >
              <span
                data-slot="evm-bullet-fill"
                className={`block h-full rounded-sm ${below ? 'bg-destructive-700' : 'bg-success-700'}`}
                style={{ width: `${pct}%` }}
              />
              <span aria-hidden="true" className="absolute top-0 h-full w-px bg-neutral-900" style={{ left: `${targetPct}%` }} />
            </span>
            <span className={`text-right font-mono text-caption tabular-nums ${below ? 'text-destructive-700' : 'text-success-700'}`}>
              {item.value.toFixed(2)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
