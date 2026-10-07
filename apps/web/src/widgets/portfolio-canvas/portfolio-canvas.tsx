import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { useNavigate } from '@tanstack/react-router';
import { Badge, ChartSkeleton } from '@aec/ui';
import type { Portfolio, PortfolioEvmItem } from '@aec/api-contracts';
import { usePortfolio, usePortfolioEvm } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';
import { CHART, HEALTH_COLORS } from '@/widgets/dashboard-charts/chart-colors';

export interface EvmPoint {
  projectId: string;
  projectCode: string;
  projectName: string;
  cpi: number;
  spi: number;
  contract: number;
  health: Portfolio['items'][number]['health'];
  hasEvm: boolean;
}

type PortfolioItem = Portfolio['items'][number];

const HEALTH_LABEL: Record<Portfolio['items'][number]['health'], string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
  NO_BUDGET: 'No Budget',
};

const EMPTY_MESSAGE = 'No portfolio data yet. Sync your projects to start EVM analysis.';

/**
 * Gabungkan portofolio + EVM rollup (join lewat `projectId`) menjadi titik canvas.
 * Proyek tanpa data EVM diletakkan di persilangan 1.0 dan ditandai `hasEvm:false`.
 */
export function buildEvmPoints(items: PortfolioItem[], evmItems: PortfolioEvmItem[]): EvmPoint[] {
  const evmById = new Map(evmItems.map((e) => [e.projectId, e]));
  return items.map((p) => {
    const evm = evmById.get(p.projectId);
    const hasEvm = evm?.hasEvm ?? false;
    return {
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      cpi: hasEvm && evm?.cpi != null ? evm.cpi : 1,
      spi: hasEvm && evm?.spi != null ? evm.spi : 1,
      contract: p.contractValue,
      health: p.health,
      hasEvm,
    };
  });
}

interface TooltipPayload {
  payload?: EvmPoint;
}

/** Saring titik berdasarkan health terpilih; kosong = semua. */
export function filterByHealth<T extends { health: string }>(points: T[], health: string): T[] {
  return health ? points.filter((p) => p.health === health) : points;
}

function CanvasTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-2 text-caption shadow-md">
      <p className="font-medium text-neutral-900">{p.projectCode} · {p.projectName}</p>
      {p.hasEvm ? (
        <>
          <p className="text-neutral-600">CPI: {p.cpi.toFixed(2)}</p>
          <p className="text-neutral-600">SPI: {p.spi.toFixed(2)}</p>
        </>
      ) : (
        <p className="text-neutral-500">No EVM data</p>
      )}
      <p className="text-neutral-600">Contract: {formatIdr(p.contract)}</p>
    </div>
  );
}

/**
 * Empty state edukatif: kerangka chart nyata dengan sumbu samar, crosshair 1.0/1.0,
 * dan watermark scatter transparan — bukan kotak putih kosong.
 */
function EducationalEmptyCanvas() {
  const ticks = [0.6, 0.8, 1.0, 1.2, 1.4];
  const pos = (v: number) => ((v - 0.6) / 0.8) * 100;
  return (
    <div role="img" aria-label={EMPTY_MESSAGE} className="relative h-[280px] w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        {/* sumbu samar X (CPI) dan Y (SPI) */}
        <line x1="0" y1="100" x2="100" y2="100" stroke={CHART.grid} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="100" stroke={CHART.grid} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {/* crosshair referensi di 1.0 / 1.0 */}
        <line x1={pos(1)} y1="0" x2={pos(1)} y2="100" stroke={CHART.gridStrong} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={100 - pos(1)} x2="100" y2={100 - pos(1)} stroke={CHART.gridStrong} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        {/* watermark scatter transparan */}
        {[[0.9, 1.15], [1.1, 0.92], [1.25, 1.2], [0.82, 0.85], [1.05, 1.08], [0.95, 0.75]].map(([x, y], i) => (
          <circle key={i} cx={pos(x!)} cy={100 - pos(y!)} r="1.4" fill={CHART.axis} fillOpacity="0.18" />
        ))}
      </svg>

      {/* label sumbu */}
      <span className="absolute -bottom-1 right-0 text-caption text-neutral-400">CPI →</span>
      <span className="absolute -top-1 left-0 text-caption text-neutral-400">SPI ↑</span>
      {ticks.map((t) => (
        <span key={`x-${t}`} className="absolute bottom-1 text-caption text-neutral-400" style={{ left: `${pos(t)}%`, transform: 'translateX(-50%)' }}>
          {t.toFixed(1)}
        </span>
      ))}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <p className="max-w-xs rounded-md border border-neutral-200 bg-white/90 px-4 py-3 text-center text-body-sm text-neutral-500 shadow-xs">
          {EMPTY_MESSAGE}
        </p>
      </div>
    </div>
  );
}

/** Domain sumbu dari data (CPI/SPI), dibulatkan ke 0,1 dan dijaga di sekitar 1.0. */
export function evmDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0.6, 1.4];
  const min = Math.min(...finite, 1);
  const max = Math.max(...finite, 1);
  // Beri margin 0,1 dan jaga minimal rentang 0,6 agar chart tidak "menyempit".
  const lo = Math.max(0, Math.floor((min - 0.1) * 10) / 10);
  const hi = Math.ceil((max + 0.1) * 10) / 10;
  return hi - lo >= 0.6 ? [lo, hi] : [Math.max(0, lo - 0.3), lo + 0.3];
}

export interface PortfolioCanvasViewProps {
  points: EvmPoint[];
  health?: string;
  onSelectHealth?: (h: string) => void;
  onSelectProject?: (projectId: string) => void;
  isLoading?: boolean;
}

export function PortfolioCanvasView({ points, health = '', onSelectHealth, onSelectProject, isLoading = false }: PortfolioCanvasViewProps) {
  // Domain sumbu mengikuti data (bukan dipatok 0,6–1,4) agar titik ekstrem tidak
  // terpotong di tepi chart.
  const domain = evmDomain(points.flatMap((p) => [p.cpi, p.spi]));
  const legend = (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {(Object.keys(HEALTH_LABEL) as Array<keyof typeof HEALTH_LABEL>).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={health === k}
          onClick={() => onSelectHealth?.(health === k ? '' : k)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption transition-colors duration-fast ${
            health === k ? 'border-neutral-800 text-neutral-800' : 'border-neutral-300 text-neutral-600 hover:border-neutral-400'
          }`}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[k] }} aria-hidden="true" />
          {HEALTH_LABEL[k]}
        </button>
      ))}
      <Badge variant="outline" className="gap-1.5 text-neutral-500">No EVM data</Badge>
    </div>
  );

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      {isLoading ? (
        <div aria-label="Loading portfolio canvas">
          <ChartSkeleton />
        </div>
      ) : points.length === 0 ? (
        <EducationalEmptyCanvas />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis type="number" dataKey="cpi" name="CPI" domain={domain} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
            <YAxis type="number" dataKey="spi" name="SPI" domain={domain} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} width={40} />
            <ReferenceLine x={1} stroke={CHART.gridStrong} />
            <ReferenceLine y={1} stroke={CHART.gridStrong} />
            <Tooltip content={<CanvasTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={points} onClick={(point: unknown) => {
              const p = point as EvmPoint;
              if (p?.projectId) onSelectProject?.(p.projectId);
            }}>
              {points.map((p) => (
                <Cell
                  key={p.projectId}
                  fill={HEALTH_COLORS[p.health]}
                  fillOpacity={health && p.health !== health ? 0.2 : p.hasEvm ? 1 : 0.35}
                  cursor="pointer"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {legend}
      {/* Padanan keyboard untuk drill-through scatter: daftar tautan fokusable.
          Scatter SVG tidak dapat difokus, jadi proyek yang sama disediakan
          sebagai tombol-tombol yang bisa di-Tab (WCAG 2.1 SC 2.1.1). */}
      {points.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Projects (keyboard drill-through)">
          {points.map((p) => (
            <li key={p.projectId}>
              <button
                type="button"
                onClick={() => onSelectProject?.(p.projectId)}
                className="rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-caption text-neutral-600 transition-colors duration-fast hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600"
              >
                {p.projectCode}
                {p.hasEvm ? ` · ${p.cpi.toFixed(2)}/${p.spi.toFixed(2)}` : ' · no EVM'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-caption text-neutral-500">
        X = CPI (cost efficiency) · Y = SPI (schedule efficiency) · quadrants cross at 1.0 · bubble colour = health
      </p>
    </div>
  );
}

export function PortfolioCanvas({ filter = {}, health = '', onSelectHealth }: { filter?: DashboardFilter; health?: string; onSelectHealth?: (h: string) => void }) {
  const navigate = useNavigate();
  const portfolio = usePortfolio(filter);
  const evm = usePortfolioEvm(filter);

  const points = buildEvmPoints(portfolio.data?.items ?? [], evm.data?.items ?? []);

  return (
    <PortfolioCanvasView
      points={points}
      health={health}
      onSelectHealth={onSelectHealth}
      onSelectProject={(projectId) => navigate({ to: '/project-health', search: { project: projectId } as never })}
      isLoading={portfolio.isLoading || evm.isLoading}
    />
  );
}
