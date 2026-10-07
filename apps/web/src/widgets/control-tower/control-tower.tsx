import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { Card, EmptyState, ErrorState, ExceptionQueue, SectionBand, StatTile, StatusPill, type ExceptionItem } from '@aec/ui';
import type { ControlTower, ControlTowerKpi } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CashFlowChart, EvmBullets, WaterfallChart, type WaterfallStep } from '@/widgets/dashboard-charts';
import { DomainTiles } from './domain-tiles';

/** Format nilai KPI sesuai satuannya. */
export function formatKpiValue(kpi: Pick<ControlTowerKpi, 'value' | 'unit'>): string {
  switch (kpi.unit) {
    case 'idr':
      return formatIdr(kpi.value);
    case 'percent':
      return `${kpi.value.toFixed(1)}%`;
    case 'days':
      return `${Math.round(kpi.value)} d`;
    case 'ratio':
      return kpi.value.toFixed(2);
    default:
      return Math.round(kpi.value).toLocaleString('id-ID');
  }
}

/** Label target untuk sebuah KPI (mis. "122% of Rp 15 jt M min"). */
export function kpiTargetLabel(kpi: ControlTowerKpi): string | undefined {
  if (kpi.target == null || kpi.attainmentPct == null) return undefined;
  const dir = kpi.direction === 'MIN' ? 'min' : kpi.direction === 'MAX' ? 'max' : 'target';
  const t = formatKpiValue({ value: kpi.target, unit: kpi.unit });
  return `${Math.round(kpi.attainmentPct)}% of ${t} ${dir}`;
}

/** Peta KPI → tone nilai (netral kecuali kondisi buruk). */
function kpiTone(kpi: ControlTowerKpi): 'neutral' | 'negative' {
  return kpi.meetsTarget === false ? 'negative' : 'neutral';
}

/** Peta exception Control Tower → item ExceptionQueue (dengan deep-link). */
export function toExceptionItems(t: ControlTower): ExceptionItem[] {
  return t.exceptions.items.map((e) => ({
    key: e.key,
    severity: e.severity,
    type: e.type,
    documentCode: e.documentCode,
    domain: e.domain,
    ageDays: e.ageDays,
    slaDays: e.slaDays,
    overdue: e.overdue,
    to: e.to,
  }));
}

/** Jembatan kas dari KPI + treasury: opening → net → closing. */
export function buildCashBridge(t: ControlTower): WaterfallStep[] {
  const net = t.kpis.find((k) => k.key === 'netCashFlow')?.value ?? 0;
  const opening = t.treasury.cashOnHand - net;
  const openingSafe = Number.isFinite(opening) ? opening : t.treasury.cashOnHand;
  return [
    { label: 'Opening', value: Math.max(0, openingSafe), kind: 'base' },
    { label: 'Net flow', value: net, kind: net >= 0 ? 'pos' : 'neg' },
    { label: 'Closing', value: t.treasury.cashOnHand, kind: 'total' },
  ];
}

export interface ControlTowerViewProps {
  data: ControlTower;
  /** Seri arus kas 12 bulan dari `useCashFlow` (endpoint terpisah, sudah ada). */
  cashFlowSeries: { month: string; cashIn: number; cashOut: number }[];
  /** Tombol Live/Paused + indikator, dirender di header zona. */
  liveControl?: React.ReactNode;
  /** Nilai angka live (opsional) untuk animasi; keyed by KPI key. */
  renderKpiValue?: (kpi: ControlTowerKpi) => React.ReactNode;
}

/** Satu zona Control Tower: header rule + isi. */
export function ControlTowerView({ data, cashFlowSeries, liveControl, renderKpiValue }: ControlTowerViewProps) {
  const excItems = toExceptionItems(data);
  const byKey = new Map(data.kpis.map((k) => [k.key, k]));
  const cash = byKey.get('cash');
  const net = byKey.get('netCashFlow');
  const backlog = byKey.get('backlog');
  const budgetVar = byKey.get('budgetVariance');
  const arOverdue = byKey.get('arOverdue');
  const dso = byKey.get('dso');

  return (
    <div className="flex flex-col gap-tier">
      {/* T2 — Position band: 6 stat ber-target sebagai teks, bukan kartu. */}
      <SectionBand name="Position" count={`updated ${new Date(data.generatedAt).toLocaleTimeString('id-ID')}`} right={liveControl}>
        <div className="grid grid-cols-1 gap-x-cell gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {[cash, net, backlog, budgetVar, arOverdue, dso].filter((k): k is ControlTowerKpi => Boolean(k)).map((k) => (
            <StatTile
              key={k.key}
              label={k.label}
              value={renderKpiValue ? (renderKpiValue(k) as unknown as string) : formatKpiValue(k)}
              attainmentPct={k.attainmentPct}
              targetLabel={kpiTargetLabel(k)}
              meetsTarget={k.meetsTarget}
              direction={k.direction}
              tone={kpiTone(k)}
            />
          ))}
        </div>
      </SectionBand>

      {/* T3 — Cash flow (dominan) ‖ Exception queue. */}
      <SectionBand
        name="Cash flow & exceptions"
        count={`${data.exceptions.total} open`}
        right={
          <>
            <StatusPill tone="critical" label={`${data.exceptions.bySeverity.HIGH} high`} />
            <StatusPill tone="warning" label={`${data.exceptions.bySeverity.MEDIUM} med`} />
            <StatusPill tone="info" label={`${data.exceptions.bySeverity.LOW} low`} />
          </>
        }
      >
        <div className="grid grid-cols-1 gap-cell xl:grid-cols-12">
          <div className="xl:col-span-8">
            <Card variant="flat">
              <h3 className="mb-2 text-h3 text-neutral-950">Cash flow · 12 months</h3>
              <CashFlowChart data={cashFlowSeries} />
            </Card>
          </div>
          <div className="xl:col-span-4">
            <ExceptionQueue
              items={excItems}
              emptyMessage="No open exceptions."
              renderRow={(item, content) => (
                <Link to={item.to as never} className="block rounded px-0 py-0 hover:bg-neutral-50">
                  {content}
                </Link>
              )}
            />
          </div>
        </div>
      </SectionBand>

      {/* T5 — Portfolio ledger + cash bridge + EVM bullets. */}
      <SectionBand name="Portfolio ledger" count={`${data.projectTotals.count} projects`}>
        <div className="flex flex-col gap-cell">
          <Card variant="flat">
            <PortfolioLedger data={data} />
          </Card>
          <div className="grid grid-cols-1 gap-cell xl:grid-cols-2">
            <Card variant="flat">
              <h3 className="mb-2 text-h3 text-neutral-950">Cash bridge · period</h3>
              <WaterfallChart steps={buildCashBridge(data)} />
            </Card>
            <Card variant="flat">
              <h3 className="mb-2 text-h3 text-neutral-950">EVM index by project</h3>
              <EvmBullets items={data.projects.filter((p) => p.hasEvm).map((p) => ({ name: p.projectCode, value: p.cpi ?? 1 }))} label="CPI" />
              {data.projects.every((p) => !p.hasEvm) && (
                <p className="text-body-sm text-neutral-500">No EVM baseline published yet.</p>
              )}
            </Card>
          </div>
        </div>
      </SectionBand>

      {/* T6 — Domain tiles (10 domains, visual per fungsi data). */}
      <DomainTiles data={data} />
    </div>
  );
}

/** Tabel ledger padat: satu baris per proyek dengan health, budget/actual, variance, CPI/SPI, risk. */
export function PortfolioLedger({ data }: { data: ControlTower }) {
  if (data.projects.length === 0) {
    return <EmptyState title="No projects" description="No projects in this scope." />;
  }
  const HEALTH_LABEL: Record<string, string> = { ON_TRACK: 'On Track', AT_RISK: 'At Risk', CRITICAL: 'Critical', NO_BUDGET: 'No Budget' };
  const HEALTH_TONE: Record<string, 'positive' | 'warning' | 'critical' | 'neutral'> = {
    ON_TRACK: 'positive',
    AT_RISK: 'warning',
    CRITICAL: 'critical',
    NO_BUDGET: 'neutral',
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-overline uppercase text-neutral-500">
            <th className="whitespace-nowrap py-2 pr-3 font-medium">Code</th>
            <th className="whitespace-nowrap py-2 pr-3 font-medium">Project</th>
            <th className="whitespace-nowrap py-2 pr-3 font-medium">Health</th>
            <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Budget / Actual</th>
            <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Variance</th>
            <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">CPI / SPI</th>
            <th className="whitespace-nowrap py-2 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {data.projects.map((p) => {
            const overrun = p.actual > p.budget && p.budget > 0;
            return (
              <tr key={p.projectId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="py-1.5 pr-3 font-mono text-caption text-neutral-500">{p.projectCode}</td>
                <td className="py-1.5 pr-3 text-neutral-800">{p.projectName}</td>
                <td className="py-1.5 pr-3">
                  <StatusPill tone={HEALTH_TONE[p.health] ?? 'neutral'} label={HEALTH_LABEL[p.health] ?? p.health} />
                </td>
                <td className={`py-1.5 pr-3 text-right font-mono tabular-nums ${overrun ? 'text-destructive-700' : 'text-neutral-700'}`}>
                  {formatIdr(p.actual)} / {formatIdr(p.budget)}
                </td>
                <td className={`py-1.5 pr-3 text-right font-mono tabular-nums ${p.variance < 0 ? 'text-destructive-700' : 'text-success-700'}`}>
                  {p.variance < 0 ? '−' : '+'}{formatIdr(Math.abs(p.variance))}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-neutral-700">
                  {p.hasEvm && p.cpi != null && p.spi != null ? `${p.cpi.toFixed(2)} / ${p.spi.toFixed(2)}` : '—'}
                </td>
                <td className="py-1.5 font-mono tabular-nums text-neutral-700">{p.riskScore ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-300 bg-surface-sunken text-neutral-800">
            <td colSpan={3} className="py-2 pr-3 font-medium">Σ {data.projectTotals.count} projects</td>
            <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatIdr(data.projectTotals.actual)} / {formatIdr(data.projectTotals.budget)}</td>
            <td className={`py-2 pr-3 text-right font-mono tabular-nums ${data.projectTotals.variance < 0 ? 'text-destructive-700' : 'text-success-700'}`}>
              {data.projectTotals.variance < 0 ? '−' : '+'}{formatIdr(Math.abs(data.projectTotals.variance))}
            </td>
            <td colSpan={2} className="py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Header zona anomaly untuk tier terakhir. */
export function AnomalyHeader({ total }: { total: number }) {
  return (
    <SectionBand
      name="Anomaly triage"
      right={
        <StatusPill
          tone={total > 0 ? 'warning' : 'positive'}
          label={`${total} anomalies`}
          icon={<Bell className="h-3.5 w-3.5" aria-hidden="true" />}
          dot={false}
        />
      }
    />
  );
}

export { ErrorState };
