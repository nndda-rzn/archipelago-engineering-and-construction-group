import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Button, EmptyState, ErrorState, EvmBars, Input, Label, Skeleton, StatusBadge, Waterfall } from '@aec/ui';
import { PROJECT_STATUSES, type UpdateProject } from '@aec/api-contracts';
import { useProject, useUpdateProject } from '@/entities/project';
import { useCommitment, useEvm, useForecasts, useProjectHealth } from '@/features/project';
import { HealthTable } from '@/features/project/ui';
import { healthLabel } from '@/features/project/ui/health-summary';
import { healthMeta } from '@/widgets/portfolio-spine';
import { formatIdr } from '@/shared/lib/format';

const fmtDate = (d: string | null | undefined) => (d ? d.slice(0, 10) : '—');

/** Bar komitmen: PO + Subcontract di dalam Budget (relasi kontainmen). */
export function CommitmentBar({ po, subcontract, budget, remaining }: { po: number; subcontract: number; budget: number; remaining: number }) {
  const total = Math.max(budget, po + subcontract, 1);
  const pct = (v: number) => (v > 0 ? (v / total) * 100 : 0);
  return (
    <div data-slot="commitment">
      <div role="img" aria-label={`Budget ${formatIdr(budget)}, PO ${formatIdr(po)}, subcontract ${formatIdr(subcontract)}, remaining ${formatIdr(remaining)}`} className="flex h-3 overflow-hidden rounded-sm bg-neutral-100">
        <span className="bg-neutral-800" style={{ width: `${pct(po)}%` }} />
        <span className="bg-neutral-500" style={{ width: `${pct(subcontract)}%` }} />
      </div>
      <dl className="mt-2 space-y-1">
        {[
          { label: 'PO', value: po, dot: 'bg-neutral-800' },
          { label: 'Subcontract', value: subcontract, dot: 'bg-neutral-500' },
          { label: 'Remaining', value: remaining, dot: 'bg-neutral-200' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-caption text-neutral-600">
            <span className={`inline-block h-2 w-2 rounded-full ${r.dot}`} aria-hidden="true" />
            <dt className="w-28">{r.label}</dt>
            <dd className="font-mono tabular-nums text-neutral-800">{formatIdr(r.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ZoneCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-xs ${className ?? ''}`}>
      <h2 className="mb-3 text-overline uppercase text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

/** Form edit metadata proyek. `code` & legal entity TIDAK dapat diubah. */
export function ProjectEditForm({
  projectId,
  initial,
  onDone,
}: {
  projectId: string;
  initial: { name: string; client: string; manager: string | null; director: string | null; location: string | null; status: string; startDate: string | null; completionDate: string | null };
  onDone: () => void;
}) {
  const update = useUpdateProject(projectId);
  const [form, setForm] = useState({
    name: initial.name,
    client: initial.client,
    manager: initial.manager ?? '',
    director: initial.director ?? '',
    location: initial.location ?? '',
    status: initial.status,
    startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
    completionDate: initial.completionDate ? initial.completionDate.slice(0, 10) : '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hanya field yang boleh diubah yang dikirim — tanpa code/legalEntityId.
    const payload: UpdateProject = {
      name: form.name,
      client: form.client,
      manager: form.manager || undefined,
      director: form.director || undefined,
      location: form.location || undefined,
      status: form.status as UpdateProject['status'],
      startDate: form.startDate || '',
      completionDate: form.completionDate || '',
    };
    update.mutate(payload, { onSuccess: onDone });
  };

  const field = (id: string, label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field('edit-name', 'Project name', 'name')}
        {field('edit-client', 'Client', 'client')}
        {field('edit-manager', 'Manager', 'manager')}
        {field('edit-director', 'Director', 'director')}
        {field('edit-location', 'Location', 'location')}
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 focus-visible:border-racing-red-600 focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
        </div>
        {field('edit-start', 'Start date', 'startDate', 'date')}
        {field('edit-completion', 'Completion date', 'completionDate', 'date')}
      </div>
      <p className="mt-3 text-caption text-neutral-500">Code and legal entity are fixed — they anchor the project identity and accounting.</p>
      {update.isError && <p role="alert" className="mt-2 text-caption text-destructive-600">Could not save. Check the values and try again.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={update.isPending}>Save</Button>
      </div>
    </form>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const project = useProject(projectId);
  const health = useProjectHealth(projectId);
  const evm = useEvm(projectId);
  const commitment = useCommitment(projectId);
  const forecasts = useForecasts(projectId);
  const [editing, setEditing] = useState(false);

  const isLoading = project.isLoading || health.isLoading;
  if (isLoading) {
    return (
      <div aria-label="Loading project" className="mx-auto max-w-[1400px] space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
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
  const meta = healthMeta[h.health];
  const forecast = forecasts.data?.items[0];
  const links = [
    { to: '/wbs', label: 'WBS' },
    { to: '/budget', label: 'Budget' },
    { to: '/project-health', label: 'Health' },
    { to: '/project-controls', label: 'Controls' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ZONA A — identitas + tautan lintas-halaman */}
      <header className="border-b border-neutral-200 pb-4">
        <p className="text-caption text-neutral-500">
          <Link to="/projects" className="hover:underline">Projects</Link>
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h1 text-neutral-950">{h.projectName}</h1>
            <p className="mt-1 text-body-sm text-neutral-500">
              <span className="font-mono">{h.projectCode}</span> · {h.client} · {h.legalEntityCode}
            </p>
            <p className="mt-0.5 text-caption text-neutral-500">
              Manager {p?.manager ?? '—'} · Director {p?.director ?? '—'} · {fmtDate(p?.startDate)} → {fmtDate(p?.completionDate)} · {p?.currency ?? 'IDR'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm text-neutral-700">
            <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
            {healthLabel[h.health]}
          </span>
        </div>
        <nav aria-label="Related pages" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} search={{ project: projectId } as never} className="text-body-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline">
              {l.label} →
            </Link>
          ))}
        </nav>
      </header>

      {p && (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Close' : 'Edit project'}
            </Button>
          </div>
          {editing && (
            <ProjectEditForm
              projectId={projectId}
              initial={{ name: p.name, client: p.client, manager: p.manager, director: p.director, location: p.location, status: p.status, startDate: p.startDate, completionDate: p.completionDate }}
              onDone={() => setEditing(false)}
            />
          )}
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ZONA B — posisi biaya (waterfall) */}
        <ZoneCard title="Cost position">
          <Waterfall contract={h.contractValue} budget={h.totalBudget} actual={h.totalActual} format={formatIdr} />
          <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-body-sm text-neutral-600">
            <span>Variance <span className={`font-mono tabular-nums ${h.variance >= 0 ? 'text-financial-positive-600' : 'text-financial-negative-600'}`}>{formatIdr(h.variance)}</span></span>
            <span>Budget used <span className="font-mono tabular-nums text-neutral-800">{h.utilization != null ? `${Math.round(h.utilization)}%` : '—'}</span></span>
            <span>Revenue <span className="font-mono tabular-nums text-neutral-800">{formatIdr(h.revenue)}</span></span>
          </p>
        </ZoneCard>

        {/* ZONA C — EVM */}
        <ZoneCard title="Earned value">
          {evm.data ? (
            <EvmBars metrics={evm.data.metrics} format={formatIdr} />
          ) : (
            <p className="text-body-sm text-neutral-500">No earned-value baseline for this project.</p>
          )}
        </ZoneCard>
      </div>

      {/* ZONA D — komitmen */}
      <ZoneCard title="Commitment">
        {commitment.data ? (
          <CommitmentBar po={commitment.data.poCommitment} subcontract={commitment.data.subcontractCommitment} budget={commitment.data.totalBudget} remaining={commitment.data.remainingBudget} />
        ) : (
          <p className="text-body-sm text-neutral-500">No commitments recorded.</p>
        )}
      </ZoneCard>

      {/* ZONA E — WBS */}
      <ZoneCard title="WBS breakdown">
        {h.wbs.length === 0 ? (
          <EmptyState title="No WBS yet" description="Define work breakdown items to track budget per deliverable." action={<Link to="/wbs" search={{ project: projectId } as never} className="text-body-sm text-neutral-700 underline">Go to WBS →</Link>} />
        ) : (
          <HealthTable data={h} />
        )}
      </ZoneCard>

      {/* ZONA F — forecast (angka, bukan chart) */}
      <ZoneCard title="Forecast">
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
      </ZoneCard>
    </div>
  );
}
