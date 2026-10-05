import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@aec/ui';
import type { Portfolio, PortfolioEvmItem } from '@aec/api-contracts';
import { usePortfolio, usePortfolioEvm } from '@/features/project';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

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

const HEALTH_COLORS: Record<Portfolio['items'][number]['health'], string> = {
  ON_TRACK: '#22c55e',
  AT_RISK: '#f59e0b',
  CRITICAL: '#ef4444',
  NO_BUDGET: '#a1a1aa',
};

const HEALTH_LABEL: Record<Portfolio['items'][number]['health'], string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
  NO_BUDGET: 'No Budget',
};

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

export function PortfolioCanvas({ filter = {}, health = '', onSelectHealth }: { filter?: DashboardFilter; health?: string; onSelectHealth?: (h: string) => void }) {
  const navigate = useNavigate();
  const portfolio = usePortfolio(filter);
  const evm = usePortfolioEvm(filter);

  const points = buildEvmPoints(portfolio.data?.items ?? [], evm.data?.items ?? []);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis type="number" dataKey="cpi" name="CPI" domain={[0.6, 1.4]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
          <YAxis type="number" dataKey="spi" name="SPI" domain={[0.6, 1.4]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} width={40} />
          <ReferenceLine x={1} stroke="#d4d4d8" />
          <ReferenceLine y={1} stroke="#d4d4d8" />
          <Tooltip content={<CanvasTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={points}
            onClick={(point: unknown) => {
              const p = point as EvmPoint;
              if (p?.projectId) navigate({ to: '/project-health', search: { project: p.projectId } as never });
            }}
          >
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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {(Object.keys(HEALTH_LABEL) as Array<keyof typeof HEALTH_LABEL>).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={health === k}
            onClick={() => onSelectHealth?.(health === k ? '' : k)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption transition-colors duration-fast ${
              health === k ? 'border-racing-red-600 text-racing-red-700' : 'border-neutral-300 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[k] }} aria-hidden="true" />
            {HEALTH_LABEL[k]}
          </button>
        ))}
        <Badge variant="outline" className="gap-1.5 text-neutral-500">No EVM data</Badge>
      </div>
      <p className="mt-2 text-caption text-neutral-500">X = CPI (cost efficiency) · Y = SPI (schedule efficiency) · crosshair at 1.0 · click a legend to filter</p>
    </div>
  );
}
