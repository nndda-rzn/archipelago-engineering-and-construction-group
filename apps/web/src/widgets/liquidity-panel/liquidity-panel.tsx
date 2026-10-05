import { DivergingBar, Skeleton, Sparkline } from '@aec/ui';
import { useAging, useCashFlow } from '@/features/analytics';
import { useCashPosition } from '@/features/treasury';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';
import { formatIdr } from '@/shared/lib/format';
import { TONE_CLASS, valueTone } from '@/shared/lib/value-tone';

/** Bulan ketahanan kas = kas / net burn bulanan. `null` bila burn ≤ 0 (tak bermakna). */
export function computeRunway(cashOnHand: number, monthlyBurn: number): number | null {
  if (monthlyBurn <= 0) return null;
  return Math.round((cashOnHand / monthlyBurn) * 10) / 10;
}

/**
 * Net burn bulanan = rata-rata defisit bulan-bulan yang merugi saja.
 * Bulan surplus **tidak** dihitung sebagai burn; bila semua bulan surplus → 0.
 */
export function computeNetBurn(netSeries: number[]): number {
  const deficits = netSeries.filter((n) => n < 0).map((n) => Math.abs(n));
  if (deficits.length === 0) return 0;
  return Math.round((deficits.reduce((s, v) => s + v, 0) / deficits.length) * 100) / 100;
}

/** Kebutuhan modal kerja = piutang belum tertagih − utang harus dibayar. */
export function workingCapitalGap(ar: number, ap: number): number {
  return ar - ap;
}

const sum = (buckets: { amount: number }[]) => buckets.reduce((s, b) => s + b.amount, 0);

export interface LiquidityPanelViewProps {
  /** Net cash flow bulanan (bertanda) — 3 bulan terakhir. */
  netSeries: number[];
  ar: number;
  ap: number;
  runwayMonths: number | null;
  monthlyBurn: number;
  isLoading?: boolean;
}

function Divider() {
  return <div data-slot="liquidity-divider" className="border-t border-neutral-200" />;
}

/**
 * Panel likuiditas: Runway sebagai metrik utama (satu-satunya tempat), tren net
 * cash, lalu working capital (AR/AP) sebagai bar diverging dari titik nol.
 * Cash on hand **tidak** diulang di sini — itu milik HeroBand.
 */
export function LiquidityPanelView({ netSeries, ar, ap, runwayMonths, monthlyBurn, isLoading = false }: LiquidityPanelViewProps) {
  const gap = workingCapitalGap(ar, ap);
  const hasBurn = monthlyBurn > 0;

  if (isLoading) {
    return (
      <div aria-label="Loading liquidity" className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-40" />
        <Divider />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div>
        <p className="text-overline uppercase text-neutral-500">Runway</p>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono tabular-nums text-h1 text-neutral-950">
              {runwayMonths != null ? `≈ ${runwayMonths} months` : '—'}
            </p>
            <p className="mt-0.5 text-caption text-neutral-500">
              {hasBurn ? `at ≈ ${formatIdr(monthlyBurn)}/mo net burn` : 'No net burn · cash-generative'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-caption text-neutral-500">Net cash · 3 mo</p>
            {netSeries.length >= 2 && (
              <span className="text-neutral-400">
                <Sparkline values={netSeries} label="Net cash trend" baseline={0} width={96} height={28} />
              </span>
            )}
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <p className="text-overline uppercase text-neutral-500">Working capital</p>
        <div className="mt-2 flex items-center justify-between text-caption text-neutral-500">
          <span>AP · {formatIdr(ap)}</span>
          <span>AR · {formatIdr(ar)}</span>
        </div>
        <div className="mt-1.5">
          <DivergingBar
            left={ap}
            right={ar}
            leftLabel="Payable"
            rightLabel="Receivable"
            format={formatIdr}
          />
        </div>
        <p className="mt-2 flex items-center justify-between text-body-sm text-neutral-700">
          <span>Working-capital gap</span>
          <span data-slot="wc-gap" className={`font-mono tabular-nums ${TONE_CLASS[valueTone(gap)]}`}>
            {formatIdr(gap)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function LiquidityPanel({ filter = {} }: { filter?: DashboardFilter }) {
  const cashPosition = useCashPosition();
  const cashFlow = useCashFlow(filter);
  const aging = useAging(filter);

  const cashOnHand = cashPosition.data?.totalBalance ?? 0;
  // Net cash flow bertanda (bukan |net|) — 3 bulan terakhir.
  const netSeries = (cashFlow.data?.series ?? []).slice(-3).map((m) => m.net);
  const monthlyBurn = computeNetBurn(netSeries);
  const ar = sum(aging.data?.ar ?? []);
  const ap = sum(aging.data?.ap ?? []);

  return (
    <LiquidityPanelView
      netSeries={netSeries}
      ar={ar}
      ap={ap}
      runwayMonths={computeRunway(cashOnHand, monthlyBurn)}
      monthlyBurn={monthlyBurn}
      isLoading={cashPosition.isLoading || cashFlow.isLoading || aging.isLoading}
    />
  );
}
