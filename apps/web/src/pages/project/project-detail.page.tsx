import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button, cn, EntityAvatar, ErrorState, EvmBars, Skeleton, StatusBadge, Waterfall, humanizeCode } from '@aec/ui';
import { useProject, useProjectActivity, useProjectSummary, useProjectSchedule, useProjectCashFlow, useProjectStakeholders, useProjectDomains, useAdvancePhase } from '@/entities/project';
import { useCommitment, useEvm, useForecasts, useProjectHealth } from '@/features/project';
import { Money } from '@/shared/ui/money';
import { CommitmentBar } from '@/features/project/ui/commitment-bar';
import { ProjectEditForm } from '@/features/project/ui/project-edit-form';
import { ProjectTeamBand } from '@/features/project/ui/project-team-band';
import { PhaseRibbon } from '@/features/project/ui/phase-ribbon';
import { GlanceStrip, MilestoneBand, CashChain } from '@/features/project/ui/project-command-center';
import { DomainGroup, DomainSignals } from '@/features/project/ui/project-domains';
import { MixDonut, ProjectRiskHeatmap, HealthRadar, BillingFunnel, SCurveCompare, VendorTreemap, VendorRanking, ReportsCalendar } from '@/features/project/ui/project-tab-visuals';
import { ProjectGanttView } from '@/features/project/ui/project-gantt-view';
import { TreemapChart } from '@/shared/charts';
import { healthLabel } from '@/features/project/ui/health-rail';
import { formatIdr } from '@/shared/lib/format';

const fmtDate = (d: string | null | undefined) => (d ? d.slice(0, 10) : '—');

const TYPE_LABEL: Record<string, string> = {
  EPC: 'EPC', MARINE: 'Marine', POWER: 'Power', PROCESS: 'Process', INFRASTRUCTURE: 'Infrastructure', OTHER: 'Other',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
const PRIORITY_TONE: Record<string, string> = {
  LOW: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  MEDIUM: 'border-info-200 bg-info-50 text-info-700',
  HIGH: 'border-warning-200 bg-warning-50 text-warning-700',
  CRITICAL: 'border-destructive-200 bg-destructive-50 text-destructive-700',
};

type Tab = 'overview' | 'schedule' | 'commercial' | 'procurement' | 'execution' | 'quality' | 'documents' | 'risk' | 'cost' | 'team' | 'activity';

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const project = useProject(projectId);
  const health = useProjectHealth(projectId);
  const evm = useEvm(projectId);
  const commitment = useCommitment(projectId);
  const forecasts = useForecasts(projectId);
  const activity = useProjectActivity(projectId);
  const summary = useProjectSummary(projectId);
  const schedule = useProjectSchedule(projectId);
  const cashFlow = useProjectCashFlow(projectId);
  const stakeholders = useProjectStakeholders(projectId);
  const domains = useProjectDomains(projectId);
  const advance = useAdvancePhase(projectId);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const isLoading = project.isLoading || health.isLoading;
  if (isLoading) {
    return (
      <div aria-label="Loading project" className="mx-auto max-w-[1400px] space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (project.isError || health.isError || !health.data) {
    return (
      <div role="alert" className="mx-auto max-w-[1400px]">
        <ErrorState message="This project could not be loaded." onRetry={() => health.refetch()} />
        <p className="mt-2 text-center">
          <Link to="/projects" className="text-body-sm text-neutral-600 underline">← Projects</Link>
        </p>
      </div>
    );
  }

  const h = health.data;
  const p = project.data;
  const s = summary.data;
  const forecast = forecasts.data?.items[0];
  const manager = p?.managerRef as { name: string; position: string | null } | undefined;
  const director = p?.directorRef as { name: string; position: string | null } | undefined;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'procurement', label: 'Procurement' },
    { id: 'execution', label: 'Execution' },
    { id: 'quality', label: 'Quality & HSE' },
    { id: 'documents', label: 'Documents' },
    { id: 'risk', label: 'Risk & Gov' },
    { id: 'cost', label: 'Cost & EVM' },
    { id: 'team', label: 'Team' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      {/* Identity band */}
      <header className="border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/projects" className="inline-flex items-center gap-1 text-caption text-neutral-500 hover:text-neutral-800">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Projects
          </Link>
          {p && (
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Close' : 'Edit project'}
            </Button>
          )}
        </div>

        <div className="mt-4 flex items-start gap-4">
          <EntityAvatar name={h.projectName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 text-neutral-950">{h.projectName}</h1>
              <StatusBadge status={h.health} label={healthLabel[h.health]} />
              {p && <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-px text-caption text-neutral-600">{TYPE_LABEL[p.type] ?? p.type}</span>}
              {p && <span className={cn('rounded border px-1.5 py-px text-caption', PRIORITY_TONE[p.priority] ?? PRIORITY_TONE.MEDIUM)}>{PRIORITY_LABEL[p.priority] ?? p.priority} priority</span>}
              {p && <StatusBadge status={p.status} />}
            </div>
            <p className="mt-1 text-body-sm text-neutral-500">
              <span className="font-mono">{h.projectCode}</span> · {h.client} · {h.legalEntityCode}
            </p>
          </div>
        </div>

        {/* Fase siklus hidup */}
        {s && (
          <div className="mt-4">
            <PhaseRibbon phase={s.project.phase} gates={schedule.data?.gates ?? []} />
          </div>
        )}

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-overline uppercase text-neutral-500">Project manager</dt>
            <dd className="mt-0.5 truncate text-body-sm text-neutral-800" title={manager?.name}>{manager?.name ?? p?.manager ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-overline uppercase text-neutral-500">Director</dt>
            <dd className="mt-0.5 truncate text-body-sm text-neutral-800" title={director?.name}>{director?.name ?? p?.director ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-overline uppercase text-neutral-500">Schedule</dt>
            <dd className="mt-0.5 truncate font-mono text-body-sm tabular-nums text-neutral-800">{fmtDate(p?.startDate)} → {fmtDate(p?.completionDate)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-overline uppercase text-neutral-500">Location</dt>
            <dd className="mt-0.5 truncate text-body-sm text-neutral-800">{p?.location ?? '—'}</dd>
          </div>
        </dl>
      </header>

      {/* At a glance */}
      {s && <GlanceStrip signals={s.signals} />}

      {editing && p && (
        <ProjectEditForm
          projectId={projectId}
          initial={{ name: p.name, client: p.client, manager: p.manager, director: p.director, location: p.location, status: p.status, startDate: p.startDate, completionDate: p.completionDate }}
          onDone={() => setEditing(false)}
        />
      )}

      {/* Tab bar */}
      <div role="tablist" aria-label="Project sections" className="flex flex-wrap items-center gap-1 border-b border-neutral-200">
        {tabs.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id} type="button" role="tab" aria-selected={selected} tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40 ${
                selected ? 'border-neutral-800 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Cash chain — satu-satunya aliran uang di Overview (funnel ada di Commercial). */}
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Cash chain</h2>
              {cashFlow.data ? <CashChain cashFlow={cashFlow.data} /> : <Skeleton className="h-32 w-full" />}
            </section>

            {/* Ringkasan sinyal lintas domain — angka + tautan ke tab, bukan chart penuh. */}
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Signals across the project</h2>
              {s ? (
                <ul className="flex flex-col divide-y divide-neutral-100">
                  <SignalRow label="Open risks" value={s.domains.governance.riskOpen} tab="risk" onGo={setTab} tone={s.domains.governance.riskOpen > 3 ? 'bad' : s.domains.governance.riskOpen > 0 ? 'warn' : 'ok'} />
                  <SignalRow label="Open NCR" value={s.domains.quality.ncrOpen} tab="quality" onGo={setTab} tone={s.domains.quality.ncrOpen > 0 ? 'warn' : 'ok'} />
                  <SignalRow label="Open HSE" value={s.domains.hse.incidentOpen} tab="quality" onGo={setTab} tone={s.domains.hse.incidentOpen > 0 ? 'bad' : 'ok'} />
                  <SignalRow label="Work packages" value={s.domains.execution.workPackage} tab="execution" onGo={setTab} tone="neutral" />
                  <SignalRow label="Variation orders" value={s.domains.commercial.variation} tab="commercial" onGo={setTab} tone="neutral" />
                </ul>
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </section>

            {/* Aktivitas terbaru — jejak hidup proyek. */}
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs xl:col-span-2">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Recent activity</h2>
              {activity.data && activity.data.length > 0 ? (
                <ol className="flex flex-col gap-3">
                  {activity.data.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-baseline gap-3 text-body-sm">
                      <span className="w-32 shrink-0 font-mono text-caption tabular-nums text-neutral-400">{new Date(a.at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                      <span className="min-w-0 flex-1 truncate text-neutral-800" title={a.summary}>{a.summary}</span>
                      <span className="shrink-0 text-caption text-neutral-400">{humanizeCode(a.action)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-body-sm text-neutral-500">No activity recorded yet.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="flex flex-col gap-6">
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Schedule (Gantt)</h2>
              <ProjectGanttView projectId={projectId} />
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Progress — planned vs actual</h2>
              {schedule.data ? <SCurveCompare schedule={schedule.data} /> : <Skeleton className="h-40 w-full" />}
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Milestones</h2>
              {schedule.data ? <MilestoneBand schedule={schedule.data} /> : <Skeleton className="h-40 w-full" />}
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Phase history &amp; gates</h2>
              {schedule.data && schedule.data.gates.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {schedule.data.gates.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 text-body-sm">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${g.decision === 'GO' ? 'bg-success-500' : g.decision === 'HOLD' ? 'bg-warning-500' : 'bg-destructive-500'}`} aria-hidden="true" />
                      <span className="font-mono text-caption text-neutral-500">{g.decidedAt?.slice(0, 10) ?? '—'}</span>
                      <span className="text-neutral-800">{g.gate}</span>
                      <span className="ml-auto rounded border border-neutral-200 px-1.5 py-px text-caption text-neutral-600">{g.decision}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-body-sm text-neutral-500">No gate decisions recorded.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(['PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT'] as const).map((ph) => (
                  <Button
                    key={ph} size="sm" variant="secondary"
                    disabled={s?.project.phase === ph || advance.isPending}
                    onClick={() => advance.mutate({ phase: ph, decision: 'GO' })}
                  >
                    Advance to {ph.charAt(0) + ph.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'commercial' && s && (
          <div className="flex flex-col gap-6">
            {/* Hero: billing funnel — satu-satunya tempat funnel muncul. */}
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Billing flow</h2>
              <BillingFunnel summary={s} />
            </section>

            {/* Strip ringkas: angka kunci penagihan, bukan 5 kartu sama besar. */}
            <section aria-label="Billing summary" className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-neutral-200 py-4 sm:grid-cols-4">
              <MiniKpi label="Collected" value={s.domains.commercial.collection} tone="positive" />
              <MiniKpi label="Billed" value={s.domains.commercial.clientInvoice} />
              <MiniKpi label="Certified" value={s.domains.commercial.progressClaim} />
              <MiniKpi label="Outstanding" value={Math.max(0, s.domains.commercial.progressClaim - s.domains.commercial.collection)} tone="warning" />
            </section>

            {/* Tautan domain */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DomainTile label="Contracts" value={s.domains.commercial.contract} href="/commercial" />
              <DomainTile label="Progress claims" value={s.domains.commercial.progressClaim} money href="/finance/progress-claims" />
              <DomainTile label="Client invoices" value={s.domains.commercial.clientInvoice} money href="/finance/client-invoices" />
              <DomainTile label="Collected" value={s.domains.commercial.collection} money href="/finance/collections" />
              <DomainTile label="Variation orders" value={s.domains.commercial.variation} href="/finance/variations" />
            </div>

            {/* Grup dokumen dengan empty state jujur bertautan. */}
            {domains.data && (
              <div className="grid gap-6 lg:grid-cols-2">
                <DomainGroup title="Progress claims" items={domains.data.commercial.progressClaims} emptyHref="/finance/progress-claims" emptyLabel="Open progress claims" />
                <DomainGroup title="Client invoices" items={domains.data.commercial.clientInvoices} emptyHref="/finance/client-invoices" emptyLabel="Open client invoices" />
                <DomainGroup title="Collections" items={domains.data.commercial.collections} emptyHref="/finance/collections" emptyLabel="Open collections" />
                <DomainGroup title="Variation orders" items={domains.data.commercial.variations} emptyHref="/finance/variations" emptyLabel="Open variation orders" />
              </div>
            )}
          </div>
        )}

        {tab === 'procurement' && s && (
          <div className="flex flex-col gap-6">
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Commitment vs budget</h2>
              {commitment.data ? (
                <CommitmentBar po={commitment.data.poCommitment} subcontract={commitment.data.subcontractCommitment} budget={commitment.data.totalBudget} remaining={commitment.data.remainingBudget} />
              ) : (
                <p className="text-body-sm text-neutral-500">No commitments recorded.</p>
              )}
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
              {domains.data && <VendorTreemap data={vendorSpend(domains.data)} />}
              {domains.data && <VendorRanking data={vendorSpend(domains.data)} />}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DomainTile label="Purchase requisitions" value={s.domains.procurement.pr} href="/procurement/pr" />
              <DomainTile label="Purchase orders" value={s.domains.procurement.po} href="/procurement/po" />
              <DomainTile label="Vendor invoices" value={s.domains.procurement.vendorInvoice} href="/finance/vendor-invoices" />
              <DomainTile label="Subcontracts" value={s.domains.procurement.subcontract} href="/finance/subcontracts" />
            </div>
            {domains.data && (
              <div className="grid gap-6 lg:grid-cols-2">
                <DomainGroup title="Purchase requisitions" items={domains.data.procurement.requisitions} />
                <DomainGroup title="Purchase orders" items={domains.data.procurement.purchaseOrders} />
                <DomainGroup title="Vendor invoices" items={domains.data.procurement.vendorInvoices} />
                <DomainGroup title="Subcontracts" items={domains.data.procurement.subcontracts} />
              </div>
            )}
          </div>
        )}

        {tab === 'execution' && domains.data && (
          <div className="flex flex-col gap-6">
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Field schedule (Gantt)</h2>
              <ProjectGanttView projectId={projectId} defaultGroup="field" />
            </section>
            {domains.data.execution.dailyReports.length > 0 && (
              <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
                <ReportsCalendar days={dailyReportDays(domains.data.execution.dailyReports)} />
              </section>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <DomainGroup title="Work packages (progress %)" items={domains.data.execution.workPackages} />
              <DomainGroup title="Daily reports" items={domains.data.execution.dailyReports} />
            </div>
          </div>
        )}

        {tab === 'quality' && domains.data && (
          <div className="flex flex-col gap-6">
            {s && (
              <div className="grid gap-6 lg:grid-cols-2">
                <MixDonut title="NCR by severity" data={s.analytics.qualityMix} />
                <MixDonut title="HSE incidents by severity" data={s.analytics.hseMix} />
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <DomainGroup title="Non-conformance reports" items={domains.data.quality.ncrs} metaLabel="severity" />
              <DomainGroup title="Punch list" items={domains.data.quality.punchItems} />
              <DomainGroup title="HSE incidents" items={domains.data.hse.incidents} metaLabel="severity" />
              <DomainGroup title="Safety observations" items={domains.data.hse.observations} />
              <DomainGroup title="Permits to work" items={domains.data.hse.permits} />
            </div>
          </div>
        )}

        {tab === 'documents' && domains.data && (
          <div className="flex flex-col gap-6">
            {s && <MixDonut title="Documents by status" data={s.analytics.documentsMix} emptyHint="No drawings or deliverables yet." />}
            {s && s.analytics.documentsMix.length > 0 && (
              <TreemapChartWrapper title="Documents by status (proportion)" data={s.analytics.documentsMix} />
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <DomainGroup title="Drawings" items={domains.data.documents.drawings} metaLabel="discipline" />
              <DomainGroup title="Deliverables" items={domains.data.documents.deliverables} metaLabel="discipline" />
            </div>
          </div>
        )}

        {tab === 'risk' && domains.data && (
          <div className="flex flex-col gap-6">
            {s && <DomainSignals summary={s} />}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
                <h2 className="mb-3 text-overline uppercase text-neutral-500">Risk matrix (likelihood × impact)</h2>
                {s ? <ProjectRiskHeatmap cells={s.analytics.riskMatrix} /> : <Skeleton className="h-32 w-full" />}
              </section>
              <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
                <h2 className="mb-3 text-overline uppercase text-neutral-500">Risk profile by dimension</h2>
                {s ? <HealthRadar summary={s} /> : <Skeleton className="h-56 w-full" />}
              </section>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <DomainGroup title="Risks" items={domains.data.governance.risks} metaLabel="category" />
              <DomainGroup title="Legal cases" items={domains.data.governance.legalCases} />
              <DomainGroup title="Contracts" items={domains.data.governance.contracts} />
            </div>
          </div>
        )}

        {tab === 'cost' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Earned value</h2>
              {evm.data ? <EvmBars metrics={evm.data.metrics} format={formatIdr} /> : <p className="text-body-sm text-neutral-500">No earned-value baseline for this project.</p>}
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Cost position</h2>
              <Waterfall contract={h.contractValue} budget={h.totalBudget} actual={h.totalActual} format={formatIdr} />
              <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                <span>Variance <span className={`font-mono tabular-nums ${h.variance >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}`}>{formatIdr(h.variance)}</span></span>
                <span>Budget used <span className="font-mono tabular-nums text-neutral-800">{h.utilization != null ? `${Math.round(h.utilization)}%` : '—'}</span></span>
                <span>Revenue <span className="font-mono tabular-nums text-neutral-800">{formatIdr(h.revenue)}</span></span>
              </p>
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Performance indices</h2>
              {evm.data ? (
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                  {[{ label: 'CPI', value: evm.data.metrics.cpi }, { label: 'SPI', value: evm.data.metrics.spi }].map((idx) => (
                    <div key={idx.label}>
                      <dt className="text-overline uppercase text-neutral-500">{idx.label}</dt>
                      <dd className={`font-mono text-metric tabular-nums ${idx.value == null ? 'text-neutral-400' : idx.value >= 1 ? 'text-financial-positive-600' : 'text-warning-600'}`}>
                        {idx.value == null ? '—' : idx.value.toFixed(2)}
                      </dd>
                      <p className="text-caption text-neutral-400">{idx.value == null ? 'no baseline' : idx.value >= 1 ? 'ahead of plan' : 'behind plan'}</p>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-body-sm text-neutral-500">No indices available.</p>
              )}
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Commitment</h2>
              {commitment.data ? (
                <CommitmentBar po={commitment.data.poCommitment} subcontract={commitment.data.subcontractCommitment} budget={commitment.data.totalBudget} remaining={commitment.data.remainingBudget} />
              ) : (
                <p className="text-body-sm text-neutral-500">No commitments recorded.</p>
              )}
            </section>
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Forecast</h2>
              {forecast ? (
                <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-body-sm text-neutral-700">
                  <span>EAC <span className="font-mono tabular-nums text-neutral-900">{formatIdr(forecast.estimateAtCompletion)}</span></span>
                  <span>ETC <span className="font-mono tabular-nums text-neutral-900">{formatIdr(forecast.estimateToComplete)}</span></span>
                  <span>VAC <span className={`font-mono tabular-nums ${forecast.varianceAtCompletion >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}`}>{formatIdr(forecast.varianceAtCompletion)}</span></span>
                  <StatusBadge status={forecast.status} label={`v${forecast.version}`} />
                </p>
              ) : (
                <p className="text-body-sm text-neutral-500">No forecast yet for this project.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'team' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <ProjectTeamBand projectId={projectId} />
            </div>
            {stakeholders.data && stakeholders.data.length > 0 && (
              <section aria-label="Stakeholders" className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
                <h2 className="mb-3 text-overline uppercase text-neutral-500">Stakeholders (RACI)</h2>
                <ul className="flex flex-col divide-y divide-neutral-100">
                  {stakeholders.data.map((st) => (
                    <li key={st.id} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-medium text-neutral-900">{st.name}</span>
                        <span className="block truncate text-caption text-neutral-500">{st.role}</span>
                      </span>
                      <span className="shrink-0 rounded border border-neutral-200 px-1.5 py-px text-caption text-neutral-600" title={st.raci}>{st.raci}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <section aria-label="Activity">
            {!activity.data || activity.data.length === 0 ? (
              <p className="text-body-sm text-neutral-500">No activity recorded yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-neutral-200 pl-4">
                {activity.data.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-400" aria-hidden="true" />
                    <p className="text-body-sm text-neutral-800">{a.summary}</p>
                    <p className="text-caption text-neutral-500">{humanizeCode(a.action)} · {new Date(a.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** Kartu domain: angka ringkas + label + tautan ke halaman domainnya. */
function DomainTile({ label, value, money, href }: { label: string; value: number; money?: boolean; href: string }) {
  return (
    <Link to={href} className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-4 shadow-xs transition-colors duration-fast hover:border-neutral-300">
      <span className="text-overline uppercase text-neutral-500">{label}</span>
      <span className="truncate font-mono text-h3 tabular-nums text-neutral-950">
        {money ? <Money value={value} /> : value}
      </span>
      <span className="text-caption text-neutral-400 group-hover:text-neutral-700">Open →</span>
    </Link>
  );
}

/** KPI ringkas tanpa bingkai — angka mono + label, ber-tone. */
function MiniKpi({ label, value, tone }: { label: string; value: number; tone?: 'positive' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'text-financial-positive-600' : tone === 'warning' ? 'text-warning-700' : 'text-neutral-950';
  return (
    <div className="min-w-0">
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-h3 tabular-nums ${toneClass}`}><Money value={value} /></p>
    </div>
  );
}

/** Baris sinyal lintas domain — angka + tautan ke tab terkait (bukan chart penuh). */
function SignalRow({ label, value, tab, onGo, tone }: { label: string; value: number; tab: Tab; onGo: (t: Tab) => void; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const dot = tone === 'bad' ? 'bg-destructive-500' : tone === 'warn' ? 'bg-warning-500' : tone === 'ok' ? 'bg-success-500' : 'bg-neutral-300';
  return (
    <li>
      <button
        type="button"
        onClick={() => onGo(tab)}
        className="flex w-full items-center gap-3 py-2 text-left transition-colors duration-fast hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-700">{label}</span>
        <span className="shrink-0 font-mono text-body-sm tabular-nums text-neutral-900">{value}</span>
        <span className="shrink-0 text-caption text-neutral-400">View →</span>
      </button>
    </li>
  );
}

/** Agregasi belanja per vendor dari PO + vendor invoice + subcontract. */
function vendorSpend(domains: { procurement: { purchaseOrders: Array<{ label: string; value?: number }>; vendorInvoices: Array<{ label: string; value?: number }>; subcontracts: Array<{ label: string; value?: number }> } }): Array<{ key: string; value: number }> {
  const map = new Map<string, number>();
  const add = (rows: Array<{ label: string; value?: number }>) => {
    for (const r of rows) {
      if (!r.label) continue;
      map.set(r.label, (map.get(r.label) ?? 0) + (r.value ?? 0));
    }
  };
  add(domains.procurement.purchaseOrders);
  add(domains.procurement.vendorInvoices);
  add(domains.procurement.subcontracts);
  return [...map.entries()].map(([key, value]) => ({ key, value })).filter((d) => d.value > 0);
}

/** Ubah daily report (label = tanggal) menjadi seri kalender per hari. */
function dailyReportDays(rows: Array<{ label: string }>): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.label) continue;
    map.set(r.label, (map.get(r.label) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

/** Treemap untuk distribusi dokumen (key sudah berisi prefix tipe). */
function TreemapChartWrapper({ title, data }: { title: string; data: Array<{ key: string; count: number }> }) {
  return <TreemapChart title={title} data={data.map((d) => ({ key: d.key.replace(':', ': '), value: d.count }))} format={(n) => String(n)} />;
}


