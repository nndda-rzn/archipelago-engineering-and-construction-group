import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@aec/ui';
import type { Portfolio } from '@aec/api-contracts';
import { usePortfolio } from '@/features/project';
import { useProjectCostSummary } from '@/features/analytics';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

export interface CanvasPoint {
  projectId: string;
  projectCode: string;
  projectName: string;
  usage: number;
  margin: number;
  contract: number;
  health: Portfolio['items'][number]['health'];
  hasBudget: boolean;
  hasRevenue: boolean;
}

type PortfolioItem = Portfolio['items'][number];
type CostItem = { projectCode: string; revenue: number; cost: number };

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
 * Gabungkan portofolio + cost summary (join lewat `projectCode`) menjadi titik canvas.
 * Aman terhadap bagi nol: proyek tanpa budget/revenue → 0, bukan NaN/-Infinity.
 */
export function buildCanvasPoints(items: PortfolioItem[], costItems: CostItem[]): CanvasPoint[] {
  const costByCode = new Map(costItems.map((c) => [c.projectCode, c]));
  return items.map((p) => {
    const cost = costByCode.get(p.projectCode);
    const revenue = cost ? cost.revenue : 0;
    const projectCost = cost ? cost.cost : 0;
    const hasBudget = p.budget > 0;
    const hasRevenue = revenue > 0;
    return {
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      usage: hasBudget ? Math.round((p.actual / p.budget) * 1000) / 10 : 0,
      margin: hasRevenue ? Math.round(((revenue - projectCost) / revenue) * 1000) / 10 : 0,
      contract: p.contractValue,
      health: p.health,
      hasBudget,
      hasRevenue,
    };
  });
}

interface TooltipPayload {
  payload?: CanvasPoint;
}

function CanvasTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-2 text-caption shadow-md">
      <p className="font-medium text-neutral-900">{p.projectCode} · {p.projectName}</p>
      <p className="text-neutral-600">Usage: {p.hasBudget ? `${p.usage}%` : 'no budget'}</p>
      <p className="text-neutral-600">Margin: {p.hasRevenue ? `${p.margin}%` : 'no revenue'}</p>
      <p className="text-neutral-600">Contract: {formatIdr(p.contract)}</p>
    </div>
  );
}

export function PortfolioCanvas({ filter = {} }: { filter?: DashboardFilter }) {
  const navigate = useNavigate();
  const portfolio = usePortfolio(filter);
  const costSummary = useProjectCostSummary();

  const points = buildCanvasPoints(portfolio.data?.items ?? [], costSummary.data?.items ?? []);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis type="number" dataKey="usage" name="Budget usage %" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
          <YAxis type="number" dataKey="margin" name="Margin %" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} width={48} />
          <ReferenceLine x={100} stroke="#d4d4d8" />
          <ReferenceLine y={0} stroke="#d4d4d8" />
          <Tooltip content={<CanvasTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={points}
            onClick={(point: unknown) => {
              const p = point as CanvasPoint;
              if (p?.projectId) navigate({ to: '/project-health', search: { project: p.projectId } as never });
            }}
          >
            {points.map((p) => (
              <Cell key={p.projectId} fill={HEALTH_COLORS[p.health]} cursor="pointer" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {(Object.keys(HEALTH_LABEL) as Array<keyof typeof HEALTH_LABEL>).map((k) => (
          <Badge key={k} variant="outline" className="gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[k] }} aria-hidden="true" />
            {HEALTH_LABEL[k]}
          </Badge>
        ))}
      </div>
    </div>
  );
}
