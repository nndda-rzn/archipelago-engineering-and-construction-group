/**
 * Logika peta CPI×SPI — fungsi murni, tanpa SVG, supaya domain dan titik dapat
 * diuji tanpa merender apa pun.
 *
 * Bug yang dijaga di sini: domain sumbu dulu hardcoded (SPI 0,5–1,2), sehingga
 * setelah PV control account terisi (PR #357) lima proyek dengan SPI 0,38–0,45
 * mendapat koordinat di luar viewBox dan tidak pernah tampak. Justru proyek
 * terparah yang hilang dari visualisasi yang dibuat untuk menampilkannya.
 *
 * Aturan:
 * - Domain dihitung dari data; ambang 1,0 SELALU berada di dalam domain agar
 *   garisnya tetap tergambar.
 * - Satu titik per (CPI, SPI) unik — proyek dengan nilai identik dikelompokkan,
 *   TIDAK dijitter (menggeser titik = memindahkan data diam-diam).
 * - Proyek tanpa SPI menuju rail bawah (digambar di tepi, bertanda ▽).
 * - Proyek tanpa CPI tidak digambar (tidak ada dasar menilai biaya).
 */

export interface MapInputItem {
  projectId: string;
  code: string;
  cpi: number | null;
  spi: number | null;
  contractValue: number;
  health: string;
}

export interface MapPoint {
  key: string;
  /** Posisi dinormalisasi 0–1 terhadap domain, bukan piksel. */
  nx: number;
  ny: number;
  items: MapInputItem[];
  /** SPI tidak tersedia: digambar di rail bawah sebagai penanda khusus. */
  noSpi: boolean;
}

export interface MapDomain {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Ambang indeks kinerja: 1,00. Selalu di dalam domain. */
export const THRESHOLD = 1;

/** Margin domain: ruang di luar nilai ekstrem dan garis ambang. */
const MARGIN = 0.08;

/** Batas wajar domain — jangan pernah menggambar skala tak masuk akal. */
const FLOOR = 0.3;
const CEILING = 1.35;

export function mapDomain(items: MapInputItem[]): MapDomain {
  const withCpi = items.filter((i) => i.cpi != null);
  const cpis = withCpi.map((i) => i.cpi!);
  const spis = withCpi.filter((i) => i.spi != null).map((i) => i.spi!);

  const xMin = Math.max(FLOOR, Math.min(...cpis, THRESHOLD) - MARGIN);
  const xMax = Math.min(CEILING, Math.max(...cpis, THRESHOLD) + MARGIN);
  const yMin = Math.max(FLOOR, Math.min(...spis, THRESHOLD) - MARGIN);
  const yMax = Math.min(CEILING, Math.max(...spis, THRESHOLD) + MARGIN);

  // Data kosong: fallback yang masuk akal, bukan NaN.
  const safe = (lo: number, hi: number) => (hi > lo ? [lo, hi] : [lo - MARGIN, lo + MARGIN]);
  const [sx0, sx1] = safe(xMin, xMax);
  const [sy0, sy1] = safe(yMin, yMax);
  return { xMin: sx0, xMax: sx1, yMin: sy0, yMax: sy1 };
}

export function mapPoints(items: MapInputItem[]): MapPoint[] {
  const map = new Map<string, MapPoint>();
  for (const i of items) {
    if (i.cpi == null) continue;
    const noSpi = i.spi == null;
    const key = noSpi ? 'nospi' : `${i.cpi.toFixed(2)}|${i.spi!.toFixed(2)}`;
    const found = map.get(key);
    if (found) {
      found.items.push(i);
    } else {
      map.set(key, {
        key,
        nx: NaN, // diisi penelepon setelah domain diketahui
        ny: NaN,
        items: [i],
        noSpi,
      });
    }
  }
  return [...map.values()];
}

/** Isi koordinat ternormalisasi untuk tiap titik, terhadap domain yang diberikan. */
export function placePoints(points: MapPoint[], domain: MapDomain): MapPoint[] {
  const spanX = domain.xMax - domain.xMin || 1;
  const spanY = domain.yMax - domain.yMin || 1;
  for (const p of points) {
    const cpi = p.items[0]!.cpi!;
    const spi = p.items[0]!.spi;
    p.nx = (cpi - domain.xMin) / spanX;
    p.ny = p.noSpi ? 1 : (domain.yMax - spi!) / spanY;
    // Jepit supaya titik selalu di dalam kanvas — margin domain seharusnya
    // membuat ini tak pernah aktif, tapi invarian "titik di dalam viewBox"
    // lebih penting daripada presisi piksel.
    p.nx = Math.min(1, Math.max(0, p.nx));
    p.ny = Math.min(1, Math.max(0, p.ny));
  }
  return points;
}

/** Titik dengan SPI terendah (paling parah) — dipakai untuk menempatkan label. */
export function worstPoint(points: MapPoint[]): MapPoint | null {
  const plotted = points.filter((p) => !p.noSpi);
  if (plotted.length === 0) return null;
  return plotted.reduce((worst, p) => (p.ny > worst.ny ? p : worst));
}
