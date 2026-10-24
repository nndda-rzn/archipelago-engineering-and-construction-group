import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona B — keputusan yang diperlukan.
 *
 * Bentuk tabel, bukan daftar beralert. Versi sebelumnya memakai ikon peringatan
 * di tiap baris, garis merah di kiri, dan satu kalimat yang menjelaskan definisi
 * CPI — tiga hal yang menambah kebisingan tanpa menambah informasi. Yang
 * dibutuhkan pembaca adalah: nilainya sekarang, ambangnya, dan selisihnya.
 *
 * Hanya baris yang benar-benar menyimpang yang muncul. Proyek tanpa anggaran
 * tidak masuk tabel sama sekali: ia tidak punya pembanding, jadi tidak bisa
 * disebut lebih mahal atau lebih murah.
 */
export interface DecisionZoneProps {
  evm: {
    metrics: { cpi: number | null; spi: number | null; bac: number } & Record<string, unknown>;
    interpretation: { partial?: boolean } & Record<string, unknown>;
  };
  eac: number | null;
  caIssueCount: number;
  caTotal: number;
}

interface Row {
  key: string;
  label: string;
  /** Nilai saat ini, sudah diformat. */
  now: string;
  /** Ambang yang menjadi acuan. */
  threshold: string;
  /** Selisih terhadap ambang, bertanda. */
  delta: string;
  /** Selisih negatif = perlu tindakan. */
  bad: boolean;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function DecisionZone({ evm, eac, caIssueCount, caTotal }: DecisionZoneProps) {
  const { cpi, spi, bac } = evm.metrics;

  // Tanpa anggaran, EVM tidak punya pembanding sama sekali.
  if (bac <= 0) {
    return (
      <section aria-label="Deviations" className="border-t border-neutral-300">
        <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ PENYIMPANGAN ]</p>
        <p className="text-body-sm text-neutral-600">
          No budget is set, so EVM cannot be computed. There is nothing to compare against.
        </p>
      </section>
    );
  }

  const rows: Row[] = [];

  if (cpi != null && cpi < 1) {
    rows.push({
      key: 'cpi',
      label: 'Cost per unit of work',
      now: cpi.toFixed(2),
      threshold: '1.00',
      delta: `−${pct(1 - cpi)}`,
      bad: true,
    });
  }

  if (eac != null && eac > bac) {
    const over = eac - bac;
    rows.push({
      key: 'eac',
      label: 'Forecast at completion (EAC)',
      now: formatIdrCompact(eac),
      threshold: formatIdrCompact(bac),
      delta: `+${formatIdrCompact(over)}`,
      bad: true,
    });
  }

  if (spi != null && spi < 1) {
    rows.push({
      key: 'spi',
      label: 'Schedule',
      now: spi.toFixed(2),
      threshold: '1.00',
      delta: `−${pct(1 - spi)}`,
      bad: true,
    });
  } else if (spi == null) {
    rows.push({
      key: 'spi',
      label: 'Schedule',
      now: 'n/a',
      threshold: '—',
      delta: '—',
      bad: false,
    });
  }

  if (rows.length === 0) {
    return (
      <section aria-label="Deviations" className="border-t border-neutral-300">
        <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ PENYIMPANGAN ]</p>
        <p className="text-body-sm text-neutral-600">
          Nothing deviates from its threshold at this data date.
        </p>
      </section>
    );
  }

  // Skala tebal garis kiri: penyimpangan terbesar mendapat garis tertebal, supaya
  // urutan keparahan terbaca sebelum angkanya dibaca.
  const magnitudes = rows.map((r) => (r.bad ? 1 : 0.35));

  return (
    <section aria-label="Deviations" className="border-t border-neutral-300">
      <div className="mb-1 mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ PENYIMPANGAN ]</p>
        <p className="text-caption text-neutral-500">
          <span className="font-mono tabular-nums text-neutral-700">{rows.length}</span> item
          {rows.length === 1 ? '' : 's'} outside threshold · now / threshold / delta
        </p>
      </div>

      <ul className="divide-y divide-neutral-100 border-t border-neutral-200">
        {rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[3px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2">
            <span
              aria-hidden="true"
              className={`block self-stretch ${r.bad ? 'bg-destructive-600' : 'bg-neutral-300'}`}
              style={{ width: `${Math.max(1, Math.round(magnitudes[i]! * 3))}px` }}
            />
            <span className="min-w-0 truncate text-body-sm text-neutral-900">{r.label}</span>
            <span className="flex items-baseline gap-x-3 font-mono text-body-sm tabular-nums">
              <span className="text-neutral-950">{r.now}</span>
              <span className="text-neutral-500">/ {r.threshold}</span>
              <span className={`w-24 text-right ${r.bad ? 'text-destructive-600' : 'text-neutral-500'}`}>{r.delta}</span>
            </span>
          </li>
        ))}
      </ul>

      {caIssueCount > 0 && (
        <p className="mt-2 text-caption text-neutral-600">
          {caIssueCount} of {caTotal} control accounts have no planned value — schedule index is not computable from
          them.
        </p>
      )}
    </section>
  );
}

