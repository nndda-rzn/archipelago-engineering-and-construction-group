import { BulletBar, Sparkline } from '@aec/ui';
import { useAging, useCashFlow } from '@/features/analytics';
import { useCashPosition } from '@/features/treasury';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';

/** Bulan ketahanan kas = kas / burn bulanan. `null` bila burn ≤ 0 (tak bermakna). */
export function computeRunway(cashOnHand: number, monthlyBurn: number): number | null {
  if (monthlyBurn <= 0) return null;
  return Math.round((cashOnHand / monthlyBurn) * 10) / 10;
}

/** Kebutuhan modal kerja = piutang belum tertagih − utang harus dibayar. */
export function workingCapitalGap(ar: number, ap: number): number {
  return ar - ap;
}

const sum = (buckets: { amount: number }[]) => buckets.reduce((s, b) => s + b.amount, 0);

export interface LiquidityPanelViewProps {
  cashOnHand: number;
  burnSeries: number[];
  ar: number;
  ap: number;
  runwayMonths: number | null;
}

export function LiquidityPanelView({ cashOnHand, burnSeries, ar, ap, runwayMonths }: LiquidityPanelViewProps) {
  const gap = workingCapitalGap(ar, ap);
  const maxApAr = Math.max(ar, ap, 1);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div>
        <p className="text-overline uppercase text-neutral-500">Liquidity</p>
        <p className="mt-1 font-mono tabular-nums text-h2 text-neutral-950">{formatIdr(cashOnHand)}</p>
        <p className="text-caption text-neutral-500">Cash on hand</p>
      </div>

      <div className="flex items-center gap-3">
        <Sparkline values={burnSeries} label="Burn trend" />
        <div>
          <p className="font-mono tabular-nums text-h3 text-neutral-900">
            {runwayMonths != null ? `≈ ${runwayMonths} months` : '—'}
          </p>
          <p className="text-caption text-neutral-500">Runway</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-neutral-100 pt-3">
        <div>
          <p className="mb-1 text-caption text-neutral-500">AR · {formatIdr(ar)}</p>
          <BulletBar value={ar} max={maxApAr} label="Receivable" />
        </div>
        <div>
          <p className="mb-1 text-caption text-neutral-500">AP · {formatIdr(ap)}</p>
          <BulletBar value={ap} max={maxApAr} label="Payable" />
        </div>
      </div>

      <p className="border-t border-neutral-100 pt-3 text-body-sm text-neutral-700">
        Working-capital gap:{' '}
        <span className={`font-mono tabular-nums ${gap >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}`}>
          {formatIdr(gap)}
        </span>
      </p>
    </div>
  );
}

export function LiquidityPanel({ filter = {} }: { filter?: DashboardFilter }) {
  const cashPosition = useCashPosition();
  const cashFlow = useCashFlow(filter);
  const aging = useAging(filter);

  const cashOnHand = cashPosition.data?.totalBalance ?? 0;
  const burnSeries = (cashFlow.data?.series ?? []).slice(-3).map((m) => Math.abs(m.net));
  const monthlyBurn = burnSeries.length ? burnSeries.reduce((s, v) => s + v, 0) / burnSeries.length : 0;
  const ar = sum(aging.data?.ar ?? []);
  const ap = sum(aging.data?.ap ?? []);

  return (
    <LiquidityPanelView
      cashOnHand={cashOnHand}
      burnSeries={burnSeries}
      ar={ar}
      ap={ap}
      runwayMonths={computeRunway(cashOnHand, monthlyBurn)}
    />
  );
}
