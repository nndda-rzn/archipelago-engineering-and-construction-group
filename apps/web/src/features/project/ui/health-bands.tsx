import type { HealthPortfolioItem } from '@aec/api-contracts';

/**
 * Lima pita dimensi health — SEBARAN, bukan kartu metrik.
 *
 * Perbedaan yang menentukan: kartu metrik menampilkan "CPI: 0,93" (satu angka),
 * pita ini menampilkan "berapa proyek di tiap nilai" (● ●●●● ●●●●●). Angka
 * tunggal menyembunyikan proyek bermasalah di balik rata-rata; sebaran tidak.
 *
 * Tidak ada border, radius, atau shadow. Yang memisahkan pita hanya garis
 * vertikal rambut — kalau ini terlihat seperti lima kotak sejajar, berarti
 * desainnya gagal.
 */
export interface HealthBandsProps {
  items: HealthPortfolioItem[];
}

interface Band {
  key: string;
  label: string;
  /** Nilai yang membentuk sebaran, sudah dikelompokkan. */
  groups: Array<{ value: string; count: number; sub?: string }>;
  /** Kalimat ringkas di bawah sebaran. */
  summary: string;
  /** true bila pita ini menampilkan ambang (garis 1,0). */
  hasThreshold: boolean;
}

function groupBy<T>(items: T[], key: (t: T) => string): Array<{ value: string; count: number }> {
  const map = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => Number(b.value) - Number(a.value));
}

const DOTS = (count: number) => '●'.repeat(Math.min(count, 8));

export function HealthBands({ items }: HealthBandsProps) {
  const withBudget = items.filter((i) => i.health !== 'NO_BUDGET');

  const costGroups = groupBy(
    withBudget.filter((i) => i.cpi != null),
    (i) => i.cpi!.toFixed(2),
  ).map((g) => ({ value: g.value, count: g.count, sub: DOTS(g.count) }));

  const scheduleGroups = groupBy(
    withBudget.filter((i) => i.spi != null),
    (i) => i.spi!.toFixed(2),
  ).map((g) => ({ value: g.value, count: g.count, sub: DOTS(g.count) }));

  const noSpi = withBudget.filter((i) => i.spi == null).length;

  const bands: Band[] = [
    {
      key: 'cost',
      label: 'Cost',
      groups: costGroups,
      summary: `${withBudget.filter((i) => i.cpi != null && i.cpi < 1).length} of ${costGroups.reduce((s, g) => s + g.count, 0)} below 1.00`,
      hasThreshold: true,
    },
    {
      key: 'schedule',
      label: 'Schedule',
      groups: scheduleGroups,
      summary:
        `${withBudget.filter((i) => i.spi != null && i.spi < 1).length} of ${scheduleGroups.reduce((s, g) => s + g.count, 0)} below 1.00` +
        (noSpi > 0 ? ` · ${noSpi} without a schedule baseline` : ''),
      hasThreshold: true,
    },
    {
      key: 'quality',
      label: 'Quality',
      groups: [{ value: String(items.reduce((s, i) => s + i.ncrs, 0)), count: 1, sub: 'open NCRs' }],
      summary: `${items.filter((i) => i.ncrs > 0).length} projects carry open NCRs`,
      hasThreshold: false,
    },
    {
      key: 'safety',
      label: 'Safety',
      groups: [{ value: String(items.reduce((s, i) => s + i.incidents, 0)), count: 1, sub: 'incidents' }],
      summary: `${items.filter((i) => i.incidents > 0).length} projects recorded an incident`,
      hasThreshold: false,
    },
    {
      key: 'risk',
      label: 'Risk',
      groups: [{ value: String(items.reduce((s, i) => s + i.risks, 0)), count: 1, sub: 'open risks' }],
      summary: `${items.filter((i) => i.risks > 0).length} projects carry open risks`,
      hasThreshold: false,
    },
  ];

  return (
    <section aria-label="Health dimensions" className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-12 lg:gap-x-6">
      {bands.map((band) => (
        <div
          key={band.key}
          className={
            // COST dan SCHEDULE menampilkan sebaran titik sehingga butuh ruang;
            // tiga sisanya hanya angka. Bobot mengikuti kepadatan isi, bukan
            // dibagi rata — pembagian rata itulah yang membuat layout terasa template.
            band.key === 'cost' || band.key === 'schedule'
              ? 'border-l border-neutral-200 pl-4 lg:col-span-3'
              : 'border-l border-neutral-200 pl-4 lg:col-span-2'
          }
        >
          <p className="text-caption uppercase tracking-wide text-neutral-900/40">{band.label}</p>

          <div className="mt-2 space-y-1">
            {band.groups.length === 0 && <p className="text-body-sm text-neutral-900/40">No data</p>}
            {band.groups.map((g) => (
              <div key={g.value} className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-body-sm tabular-nums text-neutral-900/70">{g.sub}</span>
                <span className="font-mono text-body-sm tabular-nums text-neutral-900">{g.value}</span>
              </div>
            ))}
          </div>

          {band.hasThreshold && (
            <div className="mt-2 h-px w-full bg-neutral-900/20" aria-hidden="true" />
          )}

          <p className="mt-1.5 text-caption text-neutral-900/40">{band.summary}</p>
        </div>
      ))}
    </section>
  );
}
