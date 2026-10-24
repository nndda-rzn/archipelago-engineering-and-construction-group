import { useMemo } from 'react';
import type { HealthPortfolioItem } from '@aec/api-contracts';
import { mapDomain, mapPoints, placePoints, worstPoint, THRESHOLD } from './health-map-domain';

/**
 * Peta CPI x SPI — elemen dominan halaman, full-lebar.
 *
 * Posisi dua dimensi hanya terbaca sebagai POSISI. Daftar angka bisa benar tapi
 * pesannya hilang: empat proyek dengan CPI 0,85 dan SPI 0,63 baru terasa
 * "semuanya di kiri-bawah" ketika digambar, bukan ketika dibaca.
 *
 * Proyek dengan CPI/SPI identik digabung menjadi satu penanda berisi jumlah.
 * Tidak dijitter — menggeser titik berarti memindahkan data secara diam-diam.
 *
 * Domain dihitung dari data (lihat health-map-domain). Dulu hardcoded SPI
 * 0,5–1,2; setelah PV control account terisi (PR #357) lima proyek dengan SPI
 * 0,38–0,45 mendapat koordinat di luar viewBox dan tidak pernah tampak — justru
 * proyek terparah yang hilang dari visualisasi yang dibuat untuk menampilkannya.
 * Tinggi peta juga dibesarkan dan max-h dilepas: elemen dominan halaman tidak
 * boleh terkurung 352px di kolom 8/12.
 */
export interface HealthMapProps {
  items: HealthPortfolioItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const W = 1180;
const H = 520;
const PAD = { top: 40, right: 24, bottom: 56, left: 52 };

const xOf = (nx: number) => PAD.left + nx * (W - PAD.left - PAD.right);
const yOf = (ny: number) => PAD.top + ny * (H - PAD.top - PAD.bottom);

export function HealthMap({ items, selectedId, onSelect }: HealthMapProps) {
  const { domain, points } = useMemo(() => {
    const d = mapDomain(items);
    return { domain: d, points: placePoints(mapPoints(items), d) };
  }, [items]);

  const { xMin, xMax, yMin, yMax } = domain;
  const xOfV = (v: number) => xOf((v - xMin) / (xMax - xMin || 1));
  const yOfV = (v: number) => yOf((yMax - v) / (yMax - yMin || 1));

  const radiusOf = (c: (typeof points)[number]) => {
    const total = c.items.reduce((s, i) => s + i.contractValue, 0);
    // sqrt agar perbedaan nilai kontrak tidak mendominasi ukuran.
    const scaled = Math.sqrt(total) / Math.sqrt(5_000_000_000_000);
    return Math.min(24, Math.max(10, 10 + scaled * 14));
  };

  const worst = (c: (typeof points)[number]) =>
    c.items.some((i) => i.cpi! < 1 && (i.spi == null || i.spi < 1));

  // Titik terparah: labelnya digambar DI ATAS titik bila terlalu dekat tepi
  // bawah, agar tidak menempel batas kanvas.
  const lowest = worstPoint(points);
  const lowestKey = lowest?.key ?? null;

  // Ticks sumbu: bilangan bulat kelipatan 0.1 di dalam domain.
  const ticks = (lo: number, hi: number) => {
    const out: number[] = [];
    const step = hi - lo > 0.6 ? 0.2 : 0.1;
    const start = Math.ceil(lo / step) * step;
    for (let v = start; v <= hi; v += step) {
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  };
  const xTicks = ticks(xMin, xMax);
  const yTicks = ticks(yMin, yMax);

  return (
    <section aria-label="CPI by SPI map" className="min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `Scatter of ${points.reduce((s, c) => s + c.items.length, 0)} projects by cost and schedule performance. ` +
          points.map((c) => `${c.items.map((i) => i.code).join(', ')} at CPI ${c.items[0]!.cpi} SPI ${c.noSpi ? 'not available' : c.items[0]!.spi}`).join('; ')
        }
      >
        {/* Kuadran kiri-bawah: boros dan terlambat. Nada, bukan warna. */}
        <rect
          x={PAD.left}
          y={yOfV(THRESHOLD)}
          width={xOfV(THRESHOLD) - PAD.left}
          height={H - PAD.bottom - yOfV(THRESHOLD)}
          fill="currentColor"
          className="text-neutral-900/[0.03]"
        />

        {/* Grid */}
        {xTicks.map((v) => (
          <line key={`gx${v}`} x1={xOfV(v)} y1={PAD.top} x2={xOfV(v)} y2={H - PAD.bottom} stroke="currentColor" className="text-neutral-200" strokeWidth={1} />
        ))}
        {yTicks.map((v) => (
          <line key={`gy${v}`} x1={PAD.left} y1={yOfV(v)} x2={W - PAD.right} y2={yOfV(v)} stroke="currentColor" className="text-neutral-200" strokeWidth={1} />
        ))}

        {/* Garis ambang 1,00 — lebih tegas dari grid, dengan microlabel. */}
        <line x1={xOfV(THRESHOLD)} y1={PAD.top} x2={xOfV(THRESHOLD)} y2={H - PAD.bottom} stroke="currentColor" className="text-neutral-500" strokeWidth={1.5} />
        <line x1={PAD.left} y1={yOfV(THRESHOLD)} x2={W - PAD.right} y2={yOfV(THRESHOLD)} stroke="currentColor" className="text-neutral-500" strokeWidth={1.5} />
        <text x={W - PAD.right} y={yOfV(THRESHOLD) - 6} textAnchor="end" className="fill-current font-mono text-[10px] tabular-nums text-neutral-500">
          1.00
        </text>

        {/* Label sumbu */}
        {xTicks.map((v) => (
          <text key={`tx${v}`} x={xOfV(v)} y={H - PAD.bottom + 18} textAnchor="middle" className="fill-current text-[11px] text-neutral-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(1)}
          </text>
        ))}
        {yTicks.map((v) => (
          <text key={`ty${v}`} x={PAD.left - 8} y={yOfV(v) + 4} textAnchor="end" className="fill-current text-[11px] text-neutral-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(1)}
          </text>
        ))}
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-current text-[10px] uppercase tracking-wide text-neutral-500">CPI →</text>
        <text x={PAD.left - 8} y={PAD.top - 14} textAnchor="end" className="fill-current text-[10px] uppercase tracking-wide text-neutral-500">SPI ↑</text>

        {points.map((c) => {
          const r = radiusOf(c);
          const x = xOf(c.nx);
          const y = yOf(c.ny);
          const isSelected = c.items.some((i) => i.projectId === selectedId);
          const isCluster = c.items.length > 1;
          const labelBelow = c.key !== lowestKey;
          return (
            <g key={c.key}>
              <circle
                cx={x}
                cy={y}
                r={r}
                className={worst(c) ? 'fill-destructive-600' : 'fill-neutral-700'}
                fillOpacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? 'currentColor' : 'none'}
                strokeWidth={2}
              />
              {/* Area klik 24px (WCAG 2.5.8) meski lingkaran visualnya lebih kecil. */}
              <circle
                cx={x}
                cy={y}
                r={Math.max(14, r)}
                fill="transparent"
                className="cursor-pointer transition-transform duration-fast ease-out active:scale-97"
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }}
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
                <text x={x} y={y + 4} textAnchor="middle" className="fill-current text-[10px] font-medium text-white">▽</text>
              )}
              {isCluster && (
                <text x={x} y={y + 4} textAnchor="middle" className="fill-current text-[11px] font-medium text-white">
                  ×{c.items.length}
                </text>
              )}
              {/* Label langsung di sebelah penanda; dekat tepi bawah → di atas titik. */}
              <text
                x={c.key === lowestKey ? x : x + r + 8}
                y={labelBelow ? y + r + 14 : y - r - 6}
                textAnchor={c.key === lowestKey ? 'middle' : 'start'}
                className="fill-current text-[11px] text-neutral-600"
              >
                {c.items.map((i) => i.code.replace('PRJ-EPC-2027-', '')).join(' · ')}
                {c.noSpi ? ' ▽' : ''}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-caption text-neutral-500">
        Point size reflects contract value. ▽ marks a project with no schedule baseline, so SPI cannot be plotted.
        Scale adapts to the data; the 1.00 threshold is always drawn.
      </p>
    </section>
  );
}
