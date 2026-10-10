import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EmptyState } from '@aec/ui';
import type { CostComposition } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { COST_COLORS, CHART } from './chart-colors';

/** Apakah ada data komposisi biaya untuk digambar (minimal satu amount > 0). */
export function hasCostData(items: { costType: string; amount: number }[]): boolean {
  return items.some((i) => i.amount > 0);
}

const tooltipStyle = {
  borderRadius: 6,
  border: `1px solid ${CHART.grid}`,
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

export function CostCompositionChart({ items, total }: { items: CostComposition['items']; total: number }) {
  if (!hasCostData(items)) {
    return <EmptyState title="No published budget" description="Publish a budget to see cost composition." />;
  }

  const positive = items.filter((i) => i.amount > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      <ResponsiveContainer width={200} height={200} className="shrink-0">
        <PieChart>
          <Pie data={positive} dataKey="amount" nameKey="costType" innerRadius={58} outerRadius={92} paddingAngle={2} strokeWidth={0}>
            {positive.map((entry) => (
              <Cell key={entry.costType} fill={COST_COLORS[entry.costType] ?? CHART.axis} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatIdr(Number(value))} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="w-full max-w-xs space-y-1.5">
        {positive.map((i) => (
          <li key={i.costType} className="flex items-center gap-2 text-caption">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COST_COLORS[i.costType] ?? CHART.axis }} aria-hidden="true" />
            <span className="text-neutral-700">{i.costType}</span>
            <span className="ml-auto font-mono tabular-nums text-neutral-800">{formatIdr(i.amount)}</span>
            <span className="w-10 text-right font-mono tabular-nums text-neutral-500">
              {total > 0 ? `${Math.round((i.amount / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
