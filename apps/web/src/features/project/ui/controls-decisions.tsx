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
      <section aria-label="Decisions required">
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">Keputusan yang diperlukan</p>
        <p className="mt-2 text-body-sm text-neutral-900/70">
          Tidak ada anggaran terpasang — EVM tidak dapat dihitung.
        </p>
      </section>
    );
  }

  const rows: Row[] = [];

  if (cpi != null && cpi < 1) {
    rows.push({
      key: 'cpi',
      label: 'Biaya per unit pekerjaan',
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
      label: 'Proyeksi akhir (EAC)',
      now: formatIdrCompact(eac),
      threshold: formatIdrCompact(bac),
      delta: `+${formatIdrCompact(over)}`,
      bad: true,
    });
  }

  if (spi != null && spi < 1) {
    rows.push({
      key: 'spi',
      label: 'Jadwal',
      now: spi.toFixed(2),
      threshold: '1.00',
      delta: `−${pct(1 - spi)}`,
      bad: true,
    });
  } else if (spi == null) {
    rows.push({
      key: 'spi',
      label: 'Jadwal',
      now: 'n/a',
      threshold: '—',
      delta: '—',
      bad: false,
    });
  }

  if (rows.length === 0) {
    return (
      <section aria-label="Decisions required">
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">Keputusan yang diperlukan</p>
        <p className="mt-2 text-body-sm text-neutral-900/70">
          Tidak ada penyimpangan yang memerlukan keputusan pada tanggal data ini.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Decisions required">
      <p className="text-caption uppercase tracking-wide text-neutral-900/40">Keputusan yang diperlukan</p>

      <table className="mt-2 w-full border-collapse text-body-sm">
        <caption className="sr-only">Penyimpangan terhadap ambang, dengan selisihnya.</caption>
        <thead>
          <tr className="border-y border-neutral-300">
            <th scope="col" className="py-1.5 text-left text-caption uppercase tracking-wide text-neutral-900/40">
              &nbsp;
            </th>
            <th scope="col" className="w-36 py-1.5 text-right text-caption uppercase tracking-wide text-neutral-900/40">
              Sekarang
            </th>
            <th scope="col" className="w-32 py-1.5 text-right text-caption uppercase tracking-wide text-neutral-900/40">
              Ambang
            </th>
            <th scope="col" className="w-32 py-1.5 text-right text-caption uppercase tracking-wide text-neutral-900/40">
              Selisih
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-neutral-100">
              <th scope="row" className="py-1.5 text-left font-normal text-neutral-900">
                {r.label}
              </th>
              <td className="py-1.5 text-right font-mono tabular-nums text-neutral-950">{r.now}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-neutral-900/70">{r.threshold}</td>
              <td
                className={`py-1.5 text-right font-mono tabular-nums ${r.bad ? 'text-racing-red-700' : 'text-neutral-900/40'}`}
              >
                {r.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {caIssueCount > 0 && (
        <p className="mt-2 text-caption text-neutral-900/70">
          PV belum diisi di {caIssueCount} dari {caTotal} control account — SPI tidak dapat dihitung.
        </p>
      )}
    </section>
  );
}
