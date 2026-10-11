import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button, cn, EmptyState, EntityAvatar, ErrorState, EvmBars, Skeleton, StatusBadge, Waterfall, humanizeCode } from '@aec/ui';
import { useProject, useProjectActivity } from '@/entities/project';
import { useCommitment, useEvm, useForecasts, useProjectHealth } from '@/features/project';
import { HealthTable } from '@/features/project/ui';
import { CommitmentBar } from '@/features/project/ui/commitment-bar';
import { ProjectEditForm } from '@/features/project/ui/project-edit-form';
import { ProjectTeamBand } from '@/features/project/ui/project-team-band';
import { healthLabel } from '@/features/project/ui/health-summary';
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

type Tab = 'overview' | 'team' | 'cost' | 'wbs' | 'activity';

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const project = useProject(projectId);
  const health = useProjectHealth(projectId);
  const evm = useEvm(projectId);
  const commitment = useCommitment(projectId);
  const forecasts = useForecasts(projectId);
  const activity = useProjectActivity(projectId);
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
  const forecast = forecasts.data?.items[0];
  const manager = p?.managerRef as { name: string; position: string | null } | undefined;
  const director = p?.directorRef as { name: string; position: string | null } | undefined;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'team', label: 'Team' },
    { id: 'cost', label: 'Cost & EVM' },
    { id: 'wbs', label: 'WBS' },
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

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Commitment</h2>
              {commitment.data ? (
                <CommitmentBar po={commitment.data.poCommitment} subcontract={commitment.data.subcontractCommitment} budget={commitment.data.totalBudget} remaining={commitment.data.remainingBudget} />
              ) : (
                <p className="text-body-sm text-neutral-500">No commitments recorded.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'team' && (
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
            <ProjectTeamBand projectId={projectId} />
          </div>
        )}

        {tab === 'cost' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
              <h2 className="mb-3 text-overline uppercase text-neutral-500">Earned value</h2>
              {evm.data ? <EvmBars metrics={evm.data.metrics} format={formatIdr} /> : <p className="text-body-sm text-neutral-500">No earned-value baseline for this project.</p>}
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

        {tab === 'wbs' && (
          h.wbs.length === 0 ? (
            <EmptyState title="No WBS yet" description="Define work breakdown items to track budget per deliverable." action={<Link to="/wbs" search={{ project: projectId } as never} className="text-body-sm text-neutral-700 underline">Go to WBS →</Link>} />
          ) : (
            <HealthTable data={h} />
          )
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
