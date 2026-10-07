import { Link, useNavigate } from '@tanstack/react-router';
import { Card, DataGrid, ErrorState, ExceptionQueue, SectionBand, StatTile, StatusPill, type ExceptionItem } from '@aec/ui';
import type { ControlTower, ControlTowerKpi, ControlTowerProject } from '@aec/api-contracts';
import { formatIdr, formatIdrAxis } from '@/shared/lib/format';
import { CashFlowChart, EvmSeriesBars, WaterfallChart, type WaterfallStep } from '@/widgets/dashboard-charts';
import { DomainTiles } from './domain-tiles';

/** Format nilai KPI sesuai satuannya. */
/**
 * Format nilai KPI sesuai satuannya. Nilai uang **disingkat dengan unit eksplisit**
 * (`Rp 16,5 T`) agar selalu muat di sel KPI tanpa terpotong — bukan dipotong
 * `truncate`. Nilai penuh tetap tersedia lewat `title`/aria (lihat `StatTile`).
 */
export function formatKpiValue(kpi: Pick<ControlTowerKpi, 'value' | 'unit'>): string {
  switch (kpi.unit) {
    case 'idr':
      return formatIdrAxis(kpi.value);
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

/** Nilai KPI versi penuh (tanpa singkatan) untuk `title`/aria-label. */
export function formatKpiValueFull(kpi: Pick<ControlTowerKpi, 'value' | 'unit'>): string {
  return kpi.unit === 'idr' ? formatIdr(kpi.value) : formatKpiValue(kpi);
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

/**
 * Jembatan kas 4 tahap dari KPI + treasury + seri arus kas:
 * `Opening → +Collections → −Payments → =Closing`.
 *
 * Collections/Payments diambil dari seri arus kas (sumber yang sama dengan chart
 * arus kas), dan Opening diturunkan dari Closing dikurangi net seri tersebut —
 * sehingga jembatan **selalu rekonsiliasi**: Opening + In − Out = Closing.
 * Bila seri kosong, fallback ke satu delta net (perilaku lama).
 */
export function buildCashBridge(
  t: ControlTower,
  cashFlowSeries: { cashIn: number; cashOut: number }[] = [],
): WaterfallStep[] {
  const closing = t.treasury.cashOnHand;
  const totalIn = cashFlowSeries.reduce((s, m) => s + m.cashIn, 0);
  const totalOut = cashFlowSeries.reduce((s, m) => s + m.cashOut, 0);

  if (cashFlowSeries.length > 0) {
    const opening = closing - totalIn + totalOut;
    return [
      { label: 'Opening', value: Math.max(0, Number.isFinite(opening) ? opening : closing), kind: 'base' },
      { label: '+ Collections', value: totalIn, kind: 'pos' },
      { label: '− Payments', value: -Math.abs(totalOut), kind: 'neg' },
      { label: 'Closing', value: closing, kind: 'total' },
    ];
  }

  // Fallback: satu delta net (tanpa rincian collections/payments).
  const net = t.kpis.find((k) => k.key === 'netCashFlow')?.value ?? 0;
  const opening = closing - net;
  return [
    { label: 'Opening', value: Math.max(0, Number.isFinite(opening) ? opening : closing), kind: 'base' },
    { label: 'Net flow', value: net, kind: net >= 0 ? 'pos' : 'neg' },
    { label: 'Closing', value: closing, kind: 'total' },
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
              valueTitle={formatKpiValueFull(k)}
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
            <Card variant="flat" className="flex h-full flex-col">
              <h3 className="mb-2 shrink-0 text-h3 text-neutral-950">EVM: CPI &amp; SPI · worst first</h3>
              <EvmSeriesBars
                className="flex-1"
                items={data.projects.map((p) => ({ name: p.projectCode, cpi: p.cpi, spi: p.spi }))}
                limit={5}
                emptyMessage="No EVM baseline published yet."
              />
            </Card>
            <Card variant="flat" className="flex h-full flex-col">
              <h3 className="mb-2 shrink-0 text-h3 text-neutral-950">Cash bridge · period</h3>
              <WaterfallChart className="flex flex-1 flex-col justify-between" steps={buildCashBridge(data, cashFlowSeries)} />
            </Card>
          </div>
        </div>
      </SectionBand>

      {/* T6 — Domain tiles (10 domains, visual per fungsi data). */}
      <DomainTiles data={data} />
    </div>
  );
}

/** Tabel ledger padat: satu baris per proyek, drill-through keyboard-friendly. */
export function PortfolioLedger({ data }: { data: ControlTower }) {
  const navigate = useNavigate();
  const HEALTH_LABEL: Record<string, string> = { ON_TRACK: 'On Track', AT_RISK: 'At Risk', CRITICAL: 'Critical', NO_BUDGET: 'No Budget' };
  const HEALTH_TONE: Record<string, 'positive' | 'warning' | 'critical' | 'neutral'> = {
    ON_TRACK: 'positive',
    AT_RISK: 'warning',
    CRITICAL: 'critical',
    NO_BUDGET: 'neutral',
  };

  const columns = [
    {
      id: 'projectCode',
      header: 'Code',
      size: 150,
      meta: { nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => (
        <span className="font-mono text-caption text-neutral-500">{row.original.projectCode}</span>
      ),
    },
    {
      id: 'projectName',
      header: 'Project',
      size: 240,
      meta: { truncate: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => (
        <span className="block truncate" title={row.original.projectName}>
          {row.original.projectName}
        </span>
      ),
    },
    {
      id: 'health',
      header: 'Health',
      size: 110,
      meta: { nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => (
        <StatusPill tone={HEALTH_TONE[row.original.health] ?? 'neutral'} label={HEALTH_LABEL[row.original.health] ?? row.original.health} />
      ),
    },
    {
      id: 'budgetActual',
      header: 'Budget / Actual',
      size: 210,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => {
        const p = row.original;
        const overrun = p.actual > p.budget && p.budget > 0;
        return (
          <span className={`font-mono tabular-nums ${overrun ? 'text-destructive-700' : 'text-neutral-700'}`}>
            {formatIdrAxis(p.actual)} / {formatIdrAxis(p.budget)}
          </span>
        );
      },
    },
    {
      id: 'variance',
      header: 'Variance',
      size: 140,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => {
        const v = row.original.variance;
        return (
          <span className={`font-mono tabular-nums ${v < 0 ? 'text-destructive-700' : 'text-success-700'}`}>
            {v < 0 ? '−' : '+'}{formatIdrAxis(Math.abs(v))}
          </span>
        );
      },
    },
    {
      id: 'evm',
      header: 'CPI / SPI',
      size: 110,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => {
        const p = row.original;
        return (
          <span className="font-mono tabular-nums text-neutral-700">
            {p.hasEvm && p.cpi != null && p.spi != null ? `${p.cpi.toFixed(2)} / ${p.spi.toFixed(2)}` : '—'}
          </span>
        );
      },
    },
    {
      id: 'risk',
      header: 'Risk',
      size: 80,
      meta: { align: 'right' as const, nowrap: true },
      cell: ({ row }: { row: { original: ControlTowerProject } }) => (
        <span className="font-mono tabular-nums text-neutral-700">{row.original.riskScore ?? '—'}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <DataGrid
        columns={columns as never}
        data={data.projects}
        getRowId={(row) => row.projectId}
        onRowClick={(row) => navigate({ to: '/project-health', search: { project: row.original.projectId } as never })}
        emptyMessage="No projects in this scope."
        hideToolbar
        clientPagination
        pageSize={5}
        tableLayout="fixed"
      />
      {/* Footer agregat Σ — menjaga superset data (actual/budget/variance) yang
          dulu ada di <tfoot>; hilang bila tidak dirender ulang di sini. */}
      {data.projects.length > 0 && (
        <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-neutral-300 pt-2 text-body-sm text-neutral-800">
          <span className="font-medium">Σ {data.projectTotals.count} projects</span>
          <span className="font-mono tabular-nums">
            {formatIdr(data.projectTotals.actual)} / {formatIdr(data.projectTotals.budget)}
          </span>
          <span
            className={`font-mono tabular-nums ${data.projectTotals.variance < 0 ? 'text-destructive-700' : 'text-success-700'}`}
          >
            {data.projectTotals.variance < 0 ? '−' : '+'}
            {formatIdr(Math.abs(data.projectTotals.variance))}
          </span>
        </div>
      )}
    </div>
  );
}

export { ErrorState };
