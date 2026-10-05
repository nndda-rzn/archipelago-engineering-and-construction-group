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
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={positive} dataKey="amount" nameKey="costType" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
            {positive.map((entry) => (
              <Cell key={entry.costType} fill={COST_COLORS[entry.costType] ?? CHART.axis} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatIdr(Number(value))} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-2 space-y-1">
        {positive.map((i) => (
          <li key={i.costType} className="flex items-center gap-2 text-caption">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COST_COLORS[i.costType] ?? CHART.axis }} aria-hidden="true" />
            <span className="w-28 text-neutral-600">{i.costType}</span>
            <span className="font-mono tabular-nums text-neutral-800">{formatIdr(i.amount)}</span>
            <span className="ml-auto font-mono tabular-nums text-neutral-500">
              {total > 0 ? `${Math.round((i.amount / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
