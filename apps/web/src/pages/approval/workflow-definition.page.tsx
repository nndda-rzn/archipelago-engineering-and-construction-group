import { useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import {
  Badge, Button, ConfirmActionButton, EmptyState, ErrorState, Input, Label, SegmentedControl, Skeleton,
  StatusBadge, cn, labelResource, labelRole, useToast,
} from '@aec/ui';
import type { WorkflowDefinition, WorkflowStep } from '@aec/api-contracts';
import {
  CreateWorkflowForm, useAddWorkflowStep, useArchiveWorkflow, useDeleteWorkflow,
  useNewWorkflowVersion, usePublishWorkflow, useRemoveWorkflowStep, useReorderWorkflowSteps,
  useUpdateWorkflowDefinition, useUpdateWorkflowStep, useWorkflowDefinitions, useWorkflowInsights,
  useWorkflowVersions,
} from '@/features/approval';
import {
  VERSION_STATUS_LABEL, WorkflowInsightsPanel, WorkflowPipeline, WorkflowSimulate,
  WorkflowStepForm, WorkflowVersionsRail,
} from '@/features/approval/ui';
import { useRoles } from '@/entities/role';
import { useUrlFilter } from '@/shared/lib/use-url-state';

/**
 * Builder definisi approval. Bentuknya master–detail: kiri koleksi definisi
 * (agar tidak kehilangan tempat saat berpindah), kanan pekerjaan sebenarnya.
 *
 * Di dalam pane kanan, rantai dan editor langkah berdampingan (`xl`): memilih
 * langkah mengisi panel editor **tanpa memindahkan rantai keluar layar** —
 * konteks dan aksi berada di bidang yang sama. Di bawah `xl` keduanya bertumpuk,
 * bukan dipaksa sempit.
 *
 * Jarak dipakai berjenjang (2 / 8 / 16 / 32 / 48 px) supaya mata punya irama;
 * jarak seragam di seluruh halaman membuat komposisi terasa mekanis.
 *
 * Aturan domain yang menentukan seluruh UI:
 * - **DRAFT** boleh mengubah struktur (langkah/syarat).
 * - **ACTIVE** terkunci; perubahan = versi baru. Nama/deskripsi tetap boleh diubah.
 * - **ARCHIVED** hanya dilihat atau dihapus.
 */
export function WorkflowDefinitionPage() {
  const [code, setCode] = useUrlFilter('code');
  const [versionRaw, setVersionRaw] = useUrlFilter('version');
  const [stepId, setStepId] = useUrlFilter('step');
  const [view, setView] = useUrlFilter('view', 'diagram');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const definitions = useWorkflowDefinitions();
  const roles = useRoles();

  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => ({ code: r.code, name: r.name, holders: r._count?.userRoles ?? 0 })),
    [roles.data],
  );
  const holdersByRole = useMemo(
    () => Object.fromEntries(roleOptions.map((r) => [r.code, r.holders])),
    [roleOptions],
  );

  // Urutkan: ACTIVE dulu (yang benar-benar dipakai), lalu DRAFT (sedang disiapkan),
  // lalu ARCHIVED. Dalam status yang sama, versi terbaru lebih dulu.
  const sorted = useMemo(() => {
    const rank: Record<string, number> = { ACTIVE: 0, DRAFT: 1, ARCHIVED: 2 };
    const q = query.trim().toLowerCase();
    return [...(definitions.data ?? [])]
      .filter((d) => !q || d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.code !== b.code) return a.code.localeCompare(b.code);
        const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        return byStatus !== 0 ? byStatus : b.version - a.version;
      });
  }, [definitions.data, query]);

  const selected = useMemo(() => {
    if (code) {
      const match = sorted.find((d) => d.code === code && String(d.version) === versionRaw);
      if (match) return match;
      // Versi yang diminta tidak ada → jatuh ke versi ACTIVE/terbaru dari code itu.
      return sorted.find((d) => d.code === code) ?? null;
    }
    return sorted[0] ?? null;
  }, [sorted, code, versionRaw]);

  const selectedCode = selected?.code ?? null;
  const selectedId = selected?.id ?? null;

  const versions = useWorkflowVersions(selectedCode);
  const insights = useWorkflowInsights(selectedId);

  const updateDefinition = useUpdateWorkflowDefinition();
  const addStep = useAddWorkflowStep();
  const updateStep = useUpdateWorkflowStep();
  const removeStep = useRemoveWorkflowStep();
  const reorder = useReorderWorkflowSteps();
  const publish = usePublishWorkflow();
  const archive = useArchiveWorkflow();
  const remove = useDeleteWorkflow();
  const newVersion = useNewWorkflowVersion();

  const locked = selected != null && selected.status !== 'DRAFT';
  const steps = useMemo(() => selected?.steps ?? [], [selected]);
  const selectedStep: WorkflowStep | null = steps.find((s) => s.id === stepId) ?? steps[0] ?? null;

  const warningCount = useMemo(
    () => steps.filter((s) => (holdersByRole[s.approverRoleCode] ?? 0) === 0).length,
    [steps, holdersByRole],
  );

  const activeCount = (definitions.data ?? []).filter((d) => d.status === 'ACTIVE').length;
  const draftCount = (definitions.data ?? []).filter((d) => d.status === 'DRAFT').length;

  const move = (direction: -1 | 1) => {
    if (!selected || !selectedStep) return;
    const index = steps.findIndex((s) => s.id === selectedStep.id);
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    reorder.mutate(
      { id: selected.id, input: { stepIds: next.map((s) => s.id) } },
      { onError: () => toast({ title: 'Could not reorder steps', variant: 'error' }) },
    );
  };

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col">
      {/* ── Kepala halaman: satu baris fakta, tanpa kartu ─────────────────── */}
      <header className="mb-6">
        <h1 className="text-h1 text-neutral-950">Workflow</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Configure the approval chain for purchase requisitions and purchase orders.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-neutral-700">
          <span><span className="font-mono tabular-nums">{activeCount}</span> active</span>
          <span><span className="font-mono tabular-nums">{draftCount}</span> draft</span>
          <span className={warningCount > 0 ? 'inline-flex items-center gap-1.5 text-destructive-600' : 'inline-flex items-center gap-1.5'}>
            <AlertTriangle className={cn('h-4 w-4', warningCount > 0 ? 'text-destructive-500' : 'text-neutral-400')} aria-hidden="true" />
            <span className="font-mono tabular-nums">{warningCount}</span> steps without an approver
          </span>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── Kiri: koleksi definisi (area gulir, jadi butuh batas) ────────── */}
        <section
          aria-label="Workflow definitions"
          className={cn(
            'flex min-h-[280px] flex-col rounded-md border border-neutral-200 bg-white shadow-xs',
            selected ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="space-y-2 border-b border-neutral-200 p-3">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows…"
              aria-label="Search workflows"
              className="h-8"
            />
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setShowCreate((s) => !s)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {showCreate ? 'Close form' : 'Create workflow'}
            </Button>
          </div>

          {showCreate && (
            <div className="border-b border-neutral-200 p-3">
              <CreateWorkflowForm onDone={() => setShowCreate(false)} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {definitions.isLoading && (
              <div className="space-y-2" aria-label="Loading workflows">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {definitions.isError && (
              <ErrorState message="Could not load workflows." onRetry={() => definitions.refetch()} />
            )}
            {!definitions.isLoading && !definitions.isError && sorted.length === 0 && (
              <EmptyState
                title={query ? 'No workflow matches' : 'No workflows yet'}
                description={query ? 'Try a different search term.' : 'Create one to define who approves a requisition or order.'}
              />
            )}
            <ul className="space-y-1">
              {sorted.map((d) => {
                const isSelected = selected?.id === d.id;
                const warn = d.steps.filter((s) => (holdersByRole[s.approverRoleCode] ?? 0) === 0).length;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => { setCode(d.code); setVersionRaw(String(d.version)); setStepId(''); }}
                      aria-current={isSelected ? 'true' : undefined}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                        isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-body-sm font-semibold text-neutral-900">{d.code}</span>
                        <span className="ml-auto shrink-0 font-mono text-caption text-neutral-500">v{d.version}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={d.status} label={VERSION_STATUS_LABEL[d.status] ?? d.status} />
                        {warn > 0 && <Badge variant="warning">{warn} warning{warn === 1 ? '' : 's'}</Badge>}
                      </span>
                      <span className="mt-1 block truncate text-caption text-neutral-500">
                        {labelResource(d.transactionType)} · {d.steps.length} step{d.steps.length === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Kanan: pekerjaan sebenarnya. Tanpa border — jarak yang mengelompokkan ── */}
        <section
          aria-label="Workflow detail"
          className={cn('min-h-[280px]', selected ? 'block' : 'hidden lg:block')}
        >
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 p-8 text-center">
              <p className="text-body font-medium text-neutral-700">Select a workflow</p>
              <p className="text-body-sm text-neutral-500">Its steps, rules and version history appear here.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="mb-4 w-full rounded-md border border-neutral-200 bg-white px-4 py-2 text-left text-body-sm text-neutral-600 lg:hidden"
                onClick={() => setCode('')}
              >
                ← Back to workflows
              </button>

              {/* Zona dipisah 48px; di dalam zona 32px; pasangan rapat 2–8px. */}
              <div className="space-y-12">
                {/* ① Identitas + aksi. Hanya Publish yang solid (aksi primer). */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-body font-semibold text-neutral-900">{selected.code}</span>
                      <span className="font-mono text-caption text-neutral-500">v{selected.version}</span>
                      <StatusBadge status={selected.status} label={VERSION_STATUS_LABEL[selected.status] ?? selected.status} />
                    </div>
                    <p className="mt-1 text-caption text-neutral-500">
                      {labelResource(selected.transactionType)} · {selected.steps.length} step{selected.steps.length === 1 ? '' : 's'}
                      {selected.createdByName ? ` · created by ${selected.createdByName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.status === 'DRAFT' && (
                      <ConfirmActionButton
                        size="sm"
                        variant="primary"
                        confirmTitle="Publish workflow"
                        confirmDescription={`Publish ${selected.code} v${selected.version}? Any other active version of ${labelResource(selected.transactionType)} will be archived.`}
                        confirmLabel="Publish"
                        loading={publish.isPending}
                        onConfirm={() => publish.mutate(
                          { id: selected.id, input: { newVersionName: selected.name } },
                          {
                            onSuccess: () => toast({ title: 'Workflow published', variant: 'success' }),
                            onError: () => toast({
                              title: 'Workflow not ready',
                              description: 'Every step needs an approver role that at least one user holds.',
                              variant: 'error',
                            }),
                          },
                        )}
                      >
                        Publish
                      </ConfirmActionButton>
                    )}
                    {selected.status === 'ACTIVE' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={newVersion.isPending}
                          onClick={() => newVersion.mutate(selected.code, {
                            onSuccess: () => toast({ title: 'Draft version created', variant: 'success' }),
                          })}
                        >
                          New version
                        </Button>
                        <ConfirmActionButton
                          size="sm"
                          variant="secondary"
                          confirmTitle="Archive workflow"
                          confirmDescription={`Archive ${selected.code} v${selected.version}? It stops being used for new approvals.`}
                          confirmLabel="Archive"
                          loading={archive.isPending}
                          onConfirm={() => archive.mutate(selected.id, {
                            onSuccess: () => toast({ title: 'Workflow archived', variant: 'info' }),
                          })}
                        >
                          Archive
                        </ConfirmActionButton>
                      </>
                    )}
                    {selected.status !== 'ACTIVE' && (
                      <ConfirmActionButton
                        size="sm"
                        variant="destructive"
                        confirmTitle="Delete workflow version"
                        confirmDescription={`Delete ${selected.code} v${selected.version}? This cannot be undone.`}
                        confirmLabel="Delete"
                        loading={remove.isPending}
                        onConfirm={() => remove.mutate(selected.id, {
                          onSuccess: () => { setCode(''); toast({ title: 'Version deleted', variant: 'info' }); },
                        })}
                      >
                        Delete
                      </ConfirmActionButton>
                    )}
                  </div>
                </div>

                {/* ② Metadata — boleh diubah bahkan saat ACTIVE (properti dasar). */}
                <MetadataEditor
                  definition={selected}
                  saving={updateDefinition.isPending}
                  onSave={(input) => updateDefinition.mutate(
                    { id: selected.id, input },
                    { onSuccess: () => toast({ title: 'Workflow updated', variant: 'success' }) },
                  )}
                />

                {/* ③ Rantai + editor berdampingan: memilih langkah tidak memindahkan rantai. */}
                <section aria-labelledby="wf-pipeline">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="wf-pipeline" className="text-h2 text-neutral-950">Approval chain</h2>
                    <SegmentedControl
                      aria-label="Chain view"
                      value={view}
                      onValueChange={setView}
                      options={[{ value: 'diagram', label: 'Flow' }, { value: 'table', label: 'Table' }]}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                    <div className="min-w-0">
                      {view === 'diagram' ? (
                        <WorkflowPipeline
                          steps={steps}
                          selectedStepId={selectedStep?.id}
                          onSelectStep={setStepId}
                          holdersByRole={holdersByRole}
                          locked={locked}
                          transactionType={selected.transactionType}
                        />
                      ) : (
                        <StepTable
                          steps={steps}
                          holdersByRole={holdersByRole}
                          selectedStepId={selectedStep?.id}
                          onSelectStep={setStepId}
                        />
                      )}

                      {!locked && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={addStep.isPending}
                            onClick={() => addStep.mutate(
                              {
                                id: selected.id,
                                input: {
                                  stepOrder: steps.length + 1,
                                  name: `Step ${steps.length + 1}`,
                                  approverRoleCode: roleOptions[0]?.code ?? 'PROCUREMENT_MANAGER',
                                },
                              },
                              { onSuccess: () => toast({ title: 'Step added', variant: 'success' }) },
                            )}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Add step
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Editor langkah. Tanpa kotak — dipisah jarak dari rantai. */}
                    {steps.length > 0 && (
                      <div className="min-w-0 space-y-8 xl:border-l xl:border-neutral-200 xl:pl-8">
                        <section aria-labelledby="wf-step-detail">
                          <h2 id="wf-step-detail" className="sr-only">Step details</h2>
                          {selectedStep && (
                            <WorkflowStepForm
                              step={selectedStep}
                              transactionType={selected.transactionType}
                              roleOptions={roleOptions.length > 0 ? roleOptions : [{ code: selectedStep.approverRoleCode, name: selectedStep.approverRoleCode, holders: holdersByRole[selectedStep.approverRoleCode] ?? 0 }]}
                              locked={locked}
                              saving={updateStep.isPending || removeStep.isPending}
                              canMoveUp={steps.findIndex((s) => s.id === selectedStep.id) > 0}
                              canMoveDown={steps.findIndex((s) => s.id === selectedStep.id) < steps.length - 1}
                              onMove={move}
                              onRemove={() => removeStep.mutate(
                                { id: selected.id, stepId: selectedStep.id },
                                {
                                  onSuccess: () => { setStepId(''); toast({ title: 'Step removed', variant: 'info' }); },
                                  onError: () => toast({ title: 'Could not remove the step', variant: 'error' }),
                                },
                              )}
                              onSave={(input) => updateStep.mutate(
                                { id: selected.id, stepId: selectedStep.id, input },
                                {
                                  onSuccess: () => toast({ title: 'Step updated', variant: 'success' }),
                                  onError: () => toast({
                                    title: 'Could not update the step',
                                    description: 'A condition needs a field, an operator and a value.',
                                    variant: 'error',
                                  }),
                                },
                              )}
                            />
                          )}
                        </section>

                        <section aria-labelledby="wf-simulate">
                          <h2 id="wf-simulate" className="mb-3 text-h2 text-neutral-950">Simulate</h2>
                          <WorkflowSimulate steps={steps} transactionType={selected.transactionType} />
                        </section>
                      </div>
                    )}
                  </div>
                </section>

                {/* ④ Riwayat versi. */}
                <section aria-labelledby="wf-versions">
                  <h2 id="wf-versions" className="mb-4 text-h2 text-neutral-950">Versions</h2>
                  {versions.isLoading && <Skeleton className="h-24 w-full" />}
                  {versions.isError && <ErrorState message="Could not load version history." onRetry={() => versions.refetch()} />}
                  {versions.data && (
                    <WorkflowVersionsRail
                      versions={versions.data}
                      selectedVersion={selected.version}
                      onSelectVersion={(v) => { setCode(selected.code); setVersionRaw(String(v)); setStepId(''); }}
                    />
                  )}
                </section>

                {/* ⑤ Insight. */}
                <section aria-labelledby="wf-insights">
                  <h2 id="wf-insights" className="mb-4 text-h2 text-neutral-950">How this chain performs</h2>
                  {insights.isLoading && <Skeleton className="h-40 w-full" />}
                  {insights.isError && <ErrorState message="Could not load insights." onRetry={() => insights.refetch()} />}
                  {insights.data && <WorkflowInsightsPanel data={insights.data} />}
                </section>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Nama + deskripsi. Disimpan eksplisit agar tidak menulis pada tiap ketikan. */
function MetadataEditor({
  definition, saving, onSave,
}: {
  definition: WorkflowDefinition;
  saving: boolean;
  onSave: (input: { name?: string; description?: string | null }) => void;
}) {
  const [name, setName] = useState(definition.name);
  const [description, setDescription] = useState(definition.description ?? '');
  const [editing, setEditing] = useState(false);

  const dirty = name !== definition.name || description !== (definition.description ?? '');
  const valid = name.trim().length >= 2;

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Nama adalah judul definisi — satu tingkat di bawah h1 halaman. */}
          <p className="text-body font-medium text-neutral-900">{definition.name}</p>
          <p className="mt-0.5 text-caption text-neutral-500">{definition.description ?? 'No description.'}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Label htmlFor="wf-meta-name">Name</Label>
        <Input id="wf-meta-name" value={name} onChange={(e) => setName(e.target.value)} error={!valid} />
        {!valid && <p role="alert" className="mt-1 text-caption text-destructive-600">Name must be at least 2 characters.</p>}
      </div>
      <div className="max-w-md">
        <Label htmlFor="wf-meta-desc">Description</Label>
        <Input id="wf-meta-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty || !valid}
          loading={saving}
          onClick={() => onSave({ name: name.trim(), description: description.trim() === '' ? null : description.trim() })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

/** Tampilan padat rantai — alur yang sama, untuk rantai panjang. */
function StepTable({
  steps, holdersByRole, selectedStepId, onSelectStep,
}: {
  steps: WorkflowStep[];
  holdersByRole: Record<string, number>;
  selectedStepId?: string;
  onSelectStep: (id: string) => void;
}) {
  if (steps.length === 0) {
    return <p className="text-body-sm text-neutral-500">No steps yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body-sm">
        <caption className="sr-only">Approval steps</caption>
        <thead>
          <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
            <th scope="col" className="py-2 font-medium">#</th>
            <th scope="col" className="py-2 font-medium">Name</th>
            <th scope="col" className="py-2 font-medium">Role</th>
            <th scope="col" className="py-2 font-medium">Condition</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const holders = holdersByRole[s.approverRoleCode] ?? 0;
            return (
              <tr
                key={s.id}
                className={cn('border-b border-neutral-100 last:border-0', selectedStepId === s.id && 'bg-neutral-50')}
              >
                <td className="py-2 font-mono text-neutral-600">{s.stepOrder}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => onSelectStep(s.id)}
                    className="rounded text-left text-neutral-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    {s.name}
                  </button>
                </td>
                <td className="py-2">
                  <span className="text-caption text-neutral-600">{labelRole(s.approverRoleCode)}</span>
                  <span className={cn('ml-2 text-caption', holders === 0 ? 'text-destructive-700' : 'text-neutral-500')}>
                    {holders === 0 ? 'no holder' : `${holders} holder${holders === 1 ? '' : 's'}`}
                  </span>
                </td>
                <td className="py-2 font-mono text-caption text-neutral-600">
                  {s.conditionField ? `${s.conditionField} ${s.conditionOp} ${s.conditionValue}` : 'Always applies'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
