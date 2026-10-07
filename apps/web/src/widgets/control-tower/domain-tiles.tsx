import {
  BulletBar,
  Card,
  cn,
  DivergingBar,
  MiniStackedBar,
  RiskHeatmap,
  SectionBand,
  Sparkline,
  StackedBar,
  StageBars,
  type StackedSegment,
} from '@aec/ui';
import type { ControlTower } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/** Nilai KPI mentah berdasarkan key (0 bila tidak ada) — payload hanya sumbernya. */
function kpiValue(t: ControlTower, key: string): number {
  return t.kpis.find((k) => k.key === key)?.value ?? 0;
}

/** Label→nilai padat: label boleh terpotong, angka tidak (uang harus utuh). */
function Value({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'negative' | 'positive';
}) {
  const cls =
    tone === 'warning'
      ? 'text-warning-700'
      : tone === 'negative'
        ? 'text-destructive-700'
        : tone === 'positive'
          ? 'text-success-700'
          : 'text-neutral-900';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-body-sm">
      <dt className="min-w-0 truncate text-neutral-500" title={label}>
        {label}
      </dt>
      <dd className={cn('shrink-0 font-mono tabular-nums', cls)}>{value}</dd>
    </div>
  );
}

/** Satu tile domain: judul normal-case + visual + nilai teks pendamping. */
function Tile({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="flat" className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <h3 className="text-h3 text-neutral-950">{title}</h3>
      {children}
    </Card>
  );
}

/** Runway kas (bulan) dari kas di tangan dan arus kas neto periode. */
function runwayLabel(cashOnHand: number, netCashFlow: number): string {
  if (netCashFlow >= 0) return 'net positive';
  const months = cashOnHand / Math.abs(netCashFlow);
  return Number.isFinite(months) ? `${months.toFixed(1)} mo` : '—';
}

/**
 * Sepuluh tile domain (spec §7). Visual tiap tile dipilih dari **fungsi data**
 * (diverging, stacked, bullet, sparkline, heatmap, stage bars) — bukan dari
 * selera — sehingga bentuk kanvas bervariasi, bukan mosaik kartu identik.
 * Setiap visual selalu disertai nilai teks (dapat dibaca tanpa warna).
 */
export function DomainTiles({ data }: { data: ControlTower }) {
  // ── 1. Liquidity — diverging AR ◀▶ AP (proxy AP = nilai PO terbuka) + runway.
  const apOpenPo = data.operations.procurement.openPoValue;
  const arOverdue = kpiValue(data, 'arOverdue');
  const dso = kpiValue(data, 'dso');
  const netCashFlow = kpiValue(data, 'netCashFlow');
  const runway = runwayLabel(data.treasury.cashOnHand, netCashFlow);

  // ── 2. Portfolio health — komposisi health proyek.
  const health = data.projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.health] = (acc[p.health] ?? 0) + 1;
    return acc;
  }, {});
  const onTrack = health.ON_TRACK ?? 0;
  const atRisk = health.AT_RISK ?? 0;
  const critical = health.CRITICAL ?? 0;
  const noBudget = health.NO_BUDGET ?? 0;
  const healthSegments: StackedSegment[] = [
    { value: onTrack, tone: 'success', label: 'On track' },
    { value: atRisk, tone: 'warning', label: 'At risk' },
    { value: critical, tone: 'destructive', label: 'Critical' },
    { value: noBudget, tone: 'neutral-light', label: 'No budget' },
  ];

  // ── 3. Safety — bullet TRIR vs target + hitungan.
  const safety = data.operations.safety;
  const trirTarget = data.kpis.find((k) => k.key === 'trir')?.target ?? 1;
  const trirTone = safety.trir > trirTarget ? 'destructive' : 'success';

  // ── 4. Quality — komposisi urgensi NCR (kritis vs biasa) + punch.
  const quality = data.operations.quality;
  const nonCriticalNcrs = Math.max(0, quality.openNcrs - quality.criticalNcrs);
  const qualitySegments: StackedSegment[] = [
    { value: quality.criticalNcrs, tone: 'destructive', label: 'Critical NCR' },
    { value: nonCriticalNcrs, tone: 'neutral-mid', label: 'Other NCR' },
  ];

  // ── 5. Procurement — bullet pangsa PO terbuka + hitungan PR/RFQ.
  const procurement = data.operations.procurement;
  const procurementLoad = procurement.openPoCount + procurement.pendingPrCount + procurement.rfqDueCount;

  // ── 6. HCM — sparkline manpower vs karyawan aktif + hitungan.
  const hcm = data.operations.hcm;

  // ── 7. Inventory — mini stacked mutasi masuk/keluar + saldo + anomali.
  const inventory = data.operations.inventory;

  // ── 10. Treasury — bullet utilisasi BG + FX/close.
  const treasury = data.treasury;
  const bgUtilisation = treasury.bgUtilisationPct ?? 0;

  return (
    <SectionBand name="Domain tiles" count="10 domains" right={<span>Liquidity · Delivery · Ops · Governance</span>}>
      <div className="grid grid-cols-1 gap-cell sm:grid-cols-2 xl:grid-cols-4">
        {/* 1 — Liquidity */}
        <Tile title="Liquidity" className="sm:col-span-2">
          <DivergingBar
            left={apOpenPo}
            right={arOverdue}
            leftLabel="AP · open PO"
            rightLabel="AR · overdue 61+"
            format={formatIdr}
          />
          <dl className="space-y-1.5">
            <Value label="AP · open PO" value={formatIdr(apOpenPo)} tone="warning" />
            <Value label="AR · overdue 61+" value={formatIdr(arOverdue)} tone="negative" />
            <Value label="DSO" value={`${Math.round(dso)} d`} />
            <Value label="Runway" value={runway} />
          </dl>
        </Tile>

        {/* 2 — Portfolio health */}
        <Tile title="Portfolio health">
          <StackedBar segments={healthSegments} />
          <dl className="space-y-1.5">
            <Value label="Projects" value={String(data.projectTotals.count)} />
            <Value label="On track" value={String(onTrack)} tone="positive" />
            <Value label="At risk" value={String(atRisk)} tone="warning" />
            <Value label="Critical" value={String(critical)} tone="negative" />
          </dl>
        </Tile>

        {/* 3 — Safety */}
        <Tile title="Safety">
          <BulletBar value={safety.trir} max={trirTarget} label="TRIR vs target" tone={trirTone} />
          <dl className="space-y-1.5">
            <Value
              label="TRIR"
              value={safety.trir.toFixed(2)}
              tone={safety.trir > trirTarget ? 'negative' : 'positive'}
            />
            <Value label="Target" value={trirTarget.toFixed(2)} />
            <Value label="Incidents open" value={String(safety.openIncidents)} />
            <Value label="High severity" value={String(safety.highSeverityOpen)} />
            <Value label="Corrective open" value={String(safety.openCorrectiveActions)} />
          </dl>
        </Tile>

        {/* 4 — Quality */}
        <Tile title="Quality">
          <StackedBar segments={qualitySegments} />
          <dl className="space-y-1.5">
            <Value label="Open NCR" value={String(quality.openNcrs)} />
            <Value label="Critical NCR" value={String(quality.criticalNcrs)} tone="negative" />
            <Value label="Punch open" value={String(quality.openPunchItems)} />
          </dl>
        </Tile>

        {/* 5 — Procurement */}
        <Tile title="Procurement">
          <BulletBar
            value={procurement.openPoCount}
            max={procurementLoad}
            label="Open PO share"
            tone="brand"
          />
          <dl className="space-y-1.5">
            <Value label="Open PO value" value={formatIdr(procurement.openPoValue)} />
            <Value label="Open PO" value={String(procurement.openPoCount)} />
            <Value label="PR pending" value={String(procurement.pendingPrCount)} />
            <Value label="RFQ due" value={String(procurement.rfqDueCount)} />
          </dl>
        </Tile>

        {/* 6 — HCM */}
        <Tile title="HCM">
          <Sparkline
            values={[hcm.activeEmployees, hcm.manpowerToday]}
            label="Manpower today vs active employees"
          />
          <dl className="space-y-1.5">
            <Value label="Manpower today" value={hcm.manpowerToday.toLocaleString('id-ID')} />
            <Value label="Active employees" value={String(hcm.activeEmployees)} />
            <Value label="Pending timesheets" value={String(hcm.pendingTimesheets)} />
            <Value
              label="Equipment util"
              value={hcm.equipmentUtilizationPct != null ? `${Math.round(hcm.equipmentUtilizationPct)}%` : '—'}
            />
          </dl>
        </Tile>

        {/* 7 — Inventory */}
        <Tile title="Inventory">
          <MiniStackedBar
            primary={inventory.movementInValue}
            secondary={inventory.movementOutValue}
            label="Stock movement in / out"
          />
          <dl className="space-y-1.5">
            <Value label="Stock value" value={formatIdr(inventory.stockValue)} />
            <Value label="Warehouses" value={String(inventory.warehouseCount)} />
            <Value
              label="Negative balances"
              value={String(inventory.negativeBalanceCount)}
              tone={inventory.negativeBalanceCount > 0 ? 'negative' : 'neutral'}
            />
            <Value label="Movement in" value={formatIdr(inventory.movementInValue)} />
            <Value label="Movement out" value={formatIdr(inventory.movementOutValue)} />
          </dl>
        </Tile>

        {/* 8 — Governance */}
        <Tile title="Governance">
          <RiskHeatmap cells={data.governance.riskMatrix} />
          <dl className="space-y-1.5">
            <Value label="Open risks" value={String(data.governance.openRisks)} />
            <Value
              label="High risks"
              value={String(data.governance.highRisks)}
              tone={data.governance.highRisks > 0 ? 'warning' : 'neutral'}
            />
            <Value label="Audit overdue" value={String(data.governance.overdueAuditFindings)} />
            <Value label="Legal open" value={String(data.governance.openLegalCases)} />
          </dl>
        </Tile>

        {/* 9 — Commercial */}
        <Tile title="Commercial" className="sm:col-span-2">
          <StageBars
            stages={data.commercial.funnel.map((f) => ({ stage: f.stage, count: f.count, value: f.value }))}
            format={formatIdr}
          />
          <dl className="space-y-1.5">
            <Value label="Pipeline" value={formatIdr(data.commercial.pipelineValue)} />
            <Value
              label="Win rate"
              value={data.commercial.winRatePct != null ? `${data.commercial.winRatePct}%` : '—'}
            />
            <Value label="Tenders due" value={String(data.commercial.tendersDue)} />
          </dl>
        </Tile>

        {/* 10 — Treasury */}
        <Tile title="Treasury">
          <BulletBar
            value={bgUtilisation}
            max={100}
            label="BG utilisation vs 100%"
            tone={bgUtilisation > 90 ? 'warning' : 'neutral'}
          />
          <dl className="space-y-1.5">
            <Value
              label="BG expiring · 30d"
              value={`${treasury.bgExpiringCount} · ${formatIdr(treasury.bgExpiringValue)}`}
              tone={treasury.bgExpiringCount > 0 ? 'warning' : 'neutral'}
            />
            <Value label="FX exposure" value={formatIdr(treasury.fxExposureValue)} />
            <Value label="Period close" value={treasury.periodCloseStatus ?? '—'} />
          </dl>
        </Tile>
      </div>
    </SectionBand>
  );
}
