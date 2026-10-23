import { useMemo } from 'react';
import type { HealthPortfolioItem } from '@aec/api-contracts';

/**
 * Peta CPI x SPI — elemen dominan halaman.
 *
 * Posisi dua dimensi hanya terbaca sebagai POSISI. Daftar angka bisa benar tapi
 * pesannya hilang: empat proyek dengan CPI 0,85 dan SPI 0,63 baru terasa
 * "semuanya di kiri-bawah" ketika digambar, bukan ketika dibaca.
 *
 * Proyek dengan CPI/SPI identik digabung menjadi satu penanda berisi jumlah.
 * Tidak dijitter — menggeser titik berarti memindahkan data secara diam-diam.
 */
export interface HealthMapProps {
  items: HealthPortfolioItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const W = 760;
const H = 352;
const PAD = { top: 32, right: 16, bottom: 32, left: 44 };

const X_MIN = 0.6;
const X_MAX = 1.4;
const Y_MIN = 0.5;
const Y_MAX = 1.2;

const xOf = (cpi: number) => PAD.left + ((cpi - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.left - PAD.right);
const yOf = (spi: number) => PAD.top + ((Y_MAX - spi) / (Y_MAX - Y_MIN)) * (H - PAD.top - PAD.bottom);

interface Cluster {
  key: string;
  x: number;
  y: number;
  items: HealthPortfolioItem[];
  /** SPI tidak tersedia: digambar di tepi bawah sebagai penanda khusus. */
  noSpi: boolean;
}

export function HealthMap({ items, selectedId, onSelect }: HealthMapProps) {
  const clusters = useMemo<Cluster[]>(() => {
    const map = new Map<string, Cluster>();
    for (const i of items) {
      if (i.health === 'NO_BUDGET' || i.cpi == null) continue;
      const noSpi = i.spi == null;
      const key = noSpi ? 'nospi' : `${i.cpi.toFixed(2)}|${i.spi!.toFixed(2)}`;
      const found = map.get(key);
      if (found) {
        found.items.push(i);
      } else {
        map.set(key, {
          key,
          x: noSpi ? xOf(i.cpi) : xOf(i.cpi),
          y: noSpi ? H - PAD.bottom : yOf(i.spi!),
          items: [i],
          noSpi,
        });
      }
    }
    return [...map.values()];
  }, [items]);

  const radiusOf = (c: Cluster) => {
    const total = c.items.reduce((s, i) => s + i.contractValue, 0);
    // sqrt agar perbedaan nilai kontrak tidak mendominasi ukuran.
    const scaled = Math.sqrt(total) / Math.sqrt(5_000_000_000_000);
    return Math.min(20, Math.max(8, 8 + scaled * 12));
  };

  const worst = (c: Cluster) =>
    c.items.some((i) => i.cpi! < 1 && (i.spi == null || i.spi < 1));

  return (
    <section aria-label="CPI by SPI map" className="min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-h-[352px]"
        role="img"
        aria-label={
          `Scatter of ${clusters.reduce((s, c) => s + c.items.length, 0)} projects by cost and schedule performance. ` +
          clusters.map((c) => `${c.items.map((i) => i.code).join(', ')} at CPI ${c.items[0]!.cpi} SPI ${c.noSpi ? 'not available' : c.items[0]!.spi}`).join('; ')
        }
      >
        {/* Kuadran kiri-bawah: boros dan terlambat. Nada, bukan warna. */}
        <rect
          x={PAD.left}
          y={yOf(1)}
          width={xOf(1) - PAD.left}
          height={H - PAD.bottom - yOf(1)}
          fill="currentColor"
          className="text-neutral-900/[0.03]"
        />

        {/* Grid 0,1 */}
        {[0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4].map((v) => (
          <line key={`gx${v}`} x1={xOf(v)} y1={PAD.top} x2={xOf(v)} y2={H - PAD.bottom} stroke="currentColor" className="text-neutral-900/10" strokeWidth={1} />
        ))}
        {[0.6, 0.7, 0.8, 0.9, 1.1].map((v) => (
          <line key={`gy${v}`} x1={PAD.left} y1={yOf(v)} x2={W - PAD.right} y2={yOf(v)} stroke="currentColor" className="text-neutral-900/10" strokeWidth={1} />
        ))}

        {/* Garis ambang 1,0 — lebih tegas dari grid. */}
        <line x1={xOf(1)} y1={PAD.top} x2={xOf(1)} y2={H - PAD.bottom} stroke="currentColor" className="text-neutral-900/40" strokeWidth={1.5} />
        <line x1={PAD.left} y1={yOf(1)} x2={W - PAD.right} y2={yOf(1)} stroke="currentColor" className="text-neutral-900/40" strokeWidth={1.5} />

        {/* Label sumbu */}
        {[0.6, 0.8, 1.0, 1.2, 1.4].map((v) => (
          <text key={`tx${v}`} x={xOf(v)} y={H - PAD.bottom + 16} textAnchor="middle" className="fill-current text-[11px] text-neutral-900/40" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(1)}
          </text>
        ))}
        {[0.6, 0.8, 1.0, 1.2].map((v) => (
          <text key={`ty${v}`} x={PAD.left - 8} y={yOf(v) + 4} textAnchor="end" className="fill-current text-[11px] text-neutral-900/40" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(1)}
          </text>
        ))}
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-current text-[10px] uppercase tracking-wide text-neutral-900/40">CPI →</text>
        <text x={PAD.left - 8} y={PAD.top - 12} textAnchor="end" className="fill-current text-[10px] uppercase tracking-wide text-neutral-900/40">SPI</text>

        {clusters.map((c) => {
          const r = radiusOf(c);
          const isSelected = c.items.some((i) => i.projectId === selectedId);
          const isCluster = c.items.length > 1;
          return (
            <g key={c.key}>
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                className={worst(c) ? 'fill-racing-red-600' : 'fill-neutral-700'}
                fillOpacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? 'currentColor' : 'none'}
                strokeWidth={2}
              />
              {/* Area klik 24px (WCAG 2.5.8) meski lingkaran visualnya lebih kecil. */}
              <circle
                cx={c.x}
                cy={c.y}
                r={Math.max(12, r)}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(isSelected ? null : c.items[0]!.projectId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(isSelected ? null : c.items[0]!.projectId);
                  }
                }}
                aria-label={
                  isCluster
                    ? `${c.items.length} projects at CPI ${c.items[0]!.cpi}, SPI ${c.noSpi ? 'not available' : c.items[0]!.spi}: ${c.items.map((i) => i.code).join(', ')}`
                    : `${c.items[0]!.code} at CPI ${c.items[0]!.cpi}, SPI ${c.noSpi ? 'not available' : c.items[0]!.spi}`
                }
              />
              {c.noSpi && (
                <text x={c.x} y={c.y + 4} textAnchor="middle" className="fill-current text-[10px] font-medium text-white">▽</text>
              )}
              {isCluster && (
                <text x={c.x} y={c.y + 4} textAnchor="middle" className="fill-current text-[11px] font-medium text-white">
                  ×{c.items.length}
                </text>
              )}
              {/* Label langsung di sebelah penanda — tanpa legenda. */}
              <text
                x={c.x + r + 6}
                y={c.y + 4}
                className="fill-current text-[11px] text-neutral-900/70"
              >
                {c.items.map((i) => i.code.replace('PRJ-EPC-2027-', '')).join(' · ')}
                {c.noSpi ? ' ▽' : ''}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-caption text-neutral-900/40">
        Point size reflects contract value. ▽ marks a project with no schedule baseline, so SPI cannot be plotted.
      </p>
    </section>
  );
}
