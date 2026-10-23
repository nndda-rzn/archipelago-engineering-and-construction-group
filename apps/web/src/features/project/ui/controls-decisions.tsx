import type { ProjectHealth } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona B — pernyataan keputusan.
 *
 * Project controls bukan pelaporan; tujuannya memicu keputusan dan mencegah
 * kejutan (APM: "no cost or schedule surprises"). Karena itu halaman dimulai
 * dari APA YANG MENYIMPANG, bukan dari grafik. Howell & Ballard menyebut
 * kontrol = pengukuran + pengambilan keputusan; bagian ini adalah bagian
 * keputusannya.
 *
 * Bila tidak ada penyimpangan, ditampilkan satu baris tenang — bukan tiga
 * kotak kosong.
 */
export interface DecisionZoneProps {
  evm: {
    metrics: { cpi: number | null; spi: number | null; bac: number };
    interpretation: { partial?: boolean };
  };
  eac: number | null;
  caIssueCount: number;
  caTotal: number;
}

interface Finding {
  key: string;
  /** Apa yang menyimpang. */
  what: string;
  /** Seberapa besar, dalam angka. */
  magnitude: string;
  /** Mengapa — penyebab yang bisa ditindaklanjuti. */
  cause: string;
}

export function DecisionZone({ evm, eac, caIssueCount, caTotal }: DecisionZoneProps) {
  const findings: Finding[] = [];
  const { cpi, spi, bac } = evm.metrics;

  if (eac != null && bac > 0 && eac > bac) {
    const over = eac - bac;
    findings.push({
      key: 'eac',
      what: 'Proyeksi akhir melewati anggaran',
      magnitude: `EAC ${formatIdrCompact(eac)} vs BAC ${formatIdrCompact(bac)} — ${formatIdrCompact(over)} (${Math.round((over / bac) * 100)}%)`,
      cause: 'Biaya per unit pekerjaan lebih tinggi dari rencana.',
    });
  }

  if (cpi != null && cpi < 1) {
    findings.push({
      key: 'cpi',
      what: 'Biaya berjalan di atas rencana',
      magnitude: `CPI ${cpi.toFixed(2)} — ${Math.round((1 - cpi) * 100)}% lebih mahal per unit pekerjaan`,
      cause: 'Setiap rupiah yang dibelanjakan menghasilkan pekerjaan lebih sedikit dari yang direncanakan.',
    });
  }

  if (spi != null && spi < 1) {
    findings.push({
      key: 'spi',
      what: 'Jadwal tertinggal',
      magnitude: `SPI ${spi.toFixed(2)} — ${Math.round((1 - spi) * 100)}% lebih lambat dari rencana`,
      cause: 'Pekerjaan yang selesai lebih sedikit dari yang dijadwalkan pada tanggal data.',
    });
  }

  if (caIssueCount > 0) {
    findings.push({
      key: 'ca',
      what: 'Jadwal tidak dapat dinilai',
      magnitude: `${caIssueCount} dari ${caTotal} control account punya progres tetapi belum punya planned value`,
      cause: 'Tanpa PV, SPI tidak bisa dihitung — dasar penilaian jadwal belum lengkap.',
    });
  }

  if (findings.length === 0) {
    return (
      <section aria-label="Decisions required" className="border-l-2 border-neutral-300 pl-4">
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">Keputusan yang diperlukan</p>
        <p className="mt-1.5 text-body-sm text-neutral-900/70">
          Tidak ada penyimpangan yang memerlukan keputusan pada tanggal data ini.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Decisions required" className="border-l-2 border-racing-red-600 pl-4">
      <p className="text-caption uppercase tracking-wide text-neutral-900/40">Keputusan yang diperlukan</p>
      <ul className="mt-1.5 space-y-2">
        {findings.map((f) => (
          <li key={f.key}>
            <p className="text-body-sm text-neutral-950">
              <span className="mr-1.5 text-racing-red-700" aria-hidden="true">▲</span>
              {f.what}
              <span className="ml-2 font-mono text-body-sm tabular-nums text-neutral-900">{f.magnitude}</span>
            </p>
            <p className="ml-4 text-caption text-neutral-900/70">{f.cause}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
