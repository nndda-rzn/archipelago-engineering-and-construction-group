import { useMemo, useState } from 'react';
import { AlertTriangle, LayoutTemplate, Plus, Workflow as WorkflowIcon } from 'lucide-react';
import {
  Button, ConfirmActionButton, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, EmptyState, ErrorState, Input, Label, Skeleton, StatusBadge, cn, labelResource, useToast,
} from '@aec/ui';
import type { WorkflowDefinition, WorkflowStep } from '@aec/api-contracts';
import {
  CreateWorkflowForm, useAddWorkflowStep, useArchiveWorkflow, useCreateWorkflowFromTemplate,
  useDeleteWorkflow, useDuplicateWorkflow, useNewWorkflowVersion, usePublishWorkflow,
  useRemoveWorkflowStep, useReorderWorkflowSteps, useUpdateWorkflowDefinition, useUpdateWorkflowStep,
  useWorkflowDefinitions, useWorkflowInsights, useWorkflowTemplates, useWorkflowVersions,
} from '@/features/approval';
import {
  WorkflowChainList, WorkflowDefinitionsRail, WorkflowDrawer, WorkflowInsightsPanel, WorkflowLifecycle,
  WorkflowPreflight, WorkflowScenarios, WorkflowStepForm, WorkflowTemplateDialog, WorkflowVersionsRail,
  DRAWER_ICONS, VERSION_STATUS_LABEL,
} from '@/features/approval/ui';
import { preflight, hasBlockers } from '@/features/approval/lib/preflight';
import { useRoles } from '@/entities/role';
import { useUrlFilter } from '@/shared/lib/use-url-state';

/**
 * Builder definisi approval sebagai **workspace**.
 *
 * Bentuknya master–detail (koleksi kiri, pekerjaan kanan) karena itu benar:
 * berpindah definisi tidak boleh menghilangkan tempat. Pekerjaan utamanya adalah
 * **rantai** — daftar langkah berurutan yang bisa diedit. Rantai itu proses
 * linear, jadi ia disajikan sebagai `<ol>` yang bisa diubah urutannya, bukan
 * kanvas 2D: pan/zoom/minimap tak berguna untuk daftar tiga langkah, dan
 * membiarkan node diletakkan bebas akan berbohong soal urutan.
 *
 * Hierarki: daftar rantai memimpin; inspector di kanan mengedit langkah terpilih
 * tanpa memindahkan rantai dari layar; hal sekunder (insight, versi, pengaturan)
 * turun ke drawer yang tertutup secara default.
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
  const [drawer, setDrawer] = useUrlFilter('panel');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const toast = useToast();

  const definitions = useWorkflowDefinitions();
  const roles = useRoles();
  const templates = useWorkflowTemplates();

  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => ({ code: r.code, name: r.name, holders: r._count?.userRoles ?? 0 })),
    [roles.data],
  );
  const holdersByRole = useMemo(
    () => Object.fromEntries(roleOptions.map((r) => [r.code, r.holders])),
    [roleOptions],
  );
  const knownRoleCodes = useMemo(() => roleOptions.map((r) => r.code), [roleOptions]);

  // Definisi yang lolos pencarian. Pengelompokan & pengurutan ditangani rail,
  // karena "grup mana dulu" adalah keputusan tampilan, bukan keputusan data.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return definitions.data ?? [];
    return (definitions.data ?? []).filter(
      (d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q),
    );
  }, [definitions.data, query]);

  const selected = useMemo(() => {
    if (code) {
      const match = filtered.find((d) => d.code === code && String(d.version) === versionRaw);
      if (match) return match;
      // Versi yang diminta tidak ada → jatuh ke versi ACTIVE/terbaru dari code itu.
      return filtered.find((d) => d.code === code) ?? null;
    }
    // Tanpa pilihan eksplisit: versi ACTIVE pertama, kalau tidak ada versi teratas.
    return filtered.find((d) => d.status === 'ACTIVE') ?? filtered[0] ?? null;
  }, [filtered, code, versionRaw]);

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
  const duplicate = useDuplicateWorkflow();
  const fromTemplate = useCreateWorkflowFromTemplate();

  const locked = selected != null && selected.status !== 'DRAFT';
  const steps = useMemo(() => selected?.steps ?? [], [selected]);
  const selectedStep: WorkflowStep | null = steps.find((s) => s.id === stepId) ?? steps[0] ?? null;

  // Jalur hasil simulasi. `null` berarti belum disimulasikan.
  const [simulatedPath, setSimulatedPath] = useState<number[] | null>(null);
  // Ganti definisi atau versi membatalkan simulasi, karena syaratnya berbeda.
  const selectedKey = selected ? `${selected.id}` : '';
  const [simKey, setSimKey] = useState(selectedKey);
  if (simKey !== selectedKey) {
    setSimKey(selectedKey);
    setSimulatedPath(null);
  }

  const holderNamesByRole = useMemo(
    () => Object.fromEntries(
      (insights.data?.coverage ?? []).map((c) => [c.roleCode, c.holderNames]),
    ),
    [insights.data],
  );

  const warningCount = useMemo(
    () => steps.filter((s) => (holdersByRole[s.approverRoleCode] ?? 0) === 0).length,
    [steps, holdersByRole],
  );

  const activeCount = (definitions.data ?? []).filter((d) => d.status === 'ACTIVE').length;
  const draftCount = (definitions.data ?? []).filter((d) => d.status === 'DRAFT').length;

  // Pemeriksaan sebelum publish, dihitung dari data yang sudah ada di klien.
  const issues = useMemo(
    () => preflight({ steps, holdersByRole, knownRoleCodes }),
    [steps, holdersByRole, knownRoleCodes],
  );
  const blocked = hasBlockers(issues);

  const reorderSteps = (stepIds: string[]) => {
    if (!selected) return;
    reorder.mutate(
      { id: selected.id, input: { stepIds } },
      { onError: () => toast({ title: 'Could not reorder steps', variant: 'error' }) },
    );
  };

  const doPublish = () => {
    if (!selected) return;
    publish.mutate(
      { id: selected.id, input: { newVersionName: selected.name } },
      {
        onSuccess: () => {
          toast({ title: 'Workflow published', variant: 'success' });
          setPublishOpen(false);
        },
        onError: () => toast({
          title: 'Workflow not ready',
          description: 'Every step needs an approver role that at least one user holds.',
          variant: 'error',
        }),
      },
    );
  };

  const doDuplicate = () => {
    if (!selected) return;
    const suggested = `${selected.code}_COPY`;
    duplicate.mutate(
      { id: selected.id, input: { code: suggested } },
      {
        onSuccess: () => toast({ title: `Duplicated as ${suggested}`, variant: 'success' }),
        onError: () => toast({ title: 'Could not duplicate', description: `${suggested} may already exist.`, variant: 'error' }),
      },
    );
  };

  const doCreateFromTemplate = (args: { template: Parameters<typeof fromTemplate.mutate>[0]['template']; code: string; name: string }) => {
    fromTemplate.mutate(args, {
      onSuccess: () => {
        toast({ title: `Created ${args.code}`, variant: 'success' });
        setTemplateOpen(false);
        setCode(args.code);
        setVersionRaw('1');
        setStepId('');
      },
      onError: () => toast({ title: 'Could not create workflow', description: `${args.code} may already exist.`, variant: 'error' }),
    });
  };

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col">
      {/* ── Kepala halaman: satu baris fakta, tanpa kartu ─────────────────── */}
      <header className="mb-4">
        <h1 className="text-h1 text-neutral-950">Workflow</h1>
        <p className="mt-1 text-pretty text-body-sm text-neutral-500">
          Configure the approval chain for purchase requisitions and purchase orders.
        </p>
        {/* Fakta koleksi dipisah dengan pemisah, bukan tiga teks berbobot sama
            yang berdesakan. Hierarki dibawa ukuran & jarak, bukan warna baru. */}
        <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-neutral-700">
          <div className="flex items-center gap-1.5">
            <dt className="text-neutral-500">Active</dt>
            <dd className="font-mono tabular-nums text-neutral-900">{activeCount}</dd>
          </div>
          <span aria-hidden="true" className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center gap-1.5">
            <dt className="text-neutral-500">Draft</dt>
            <dd className="font-mono tabular-nums text-neutral-900">{draftCount}</dd>
          </div>
          <span aria-hidden="true" className="h-4 w-px bg-neutral-200" />
          <div className={cn('flex items-center gap-1.5', warningCount > 0 && 'text-destructive-700')}>
            <dt className="flex items-center gap-1.5">
              {warningCount > 0 && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive-500" aria-hidden="true" />}
              Steps without an approver
            </dt>
            <dd className="font-mono tabular-nums">{warningCount}</dd>
          </div>
        </dl>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── Kiri: koleksi definisi (rail) ───────────────────────────────── */}
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
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setShowCreate((s) => !s)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {showCreate ? 'Close' : 'New'}
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => setTemplateOpen(true)}>
                <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
                Templates
              </Button>
            </div>
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
            {!definitions.isLoading && !definitions.isError && filtered.length === 0 && (
              <EmptyState
                title={query ? 'No workflow matches' : 'No workflows yet'}
                description={query ? 'Try a different search term.' : 'Create one to define who approves a requisition or order.'}
              />
            )}
            {filtered.length > 0 && (
              <WorkflowDefinitionsRail
                definitions={filtered}
                holdersByRole={holdersByRole}
                selectedId={selected?.id ?? null}
                onSelect={(d) => { setCode(d.code); setVersionRaw(String(d.version)); setStepId(''); }}
              />
            )}
          </div>
        </section>

        {/* Kanan: workspace. */}
        <section
          aria-label="Workflow detail"
          className={cn('min-h-[280px] min-w-0', selected ? 'block' : 'hidden lg:block')}
        >
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 p-8 text-center">
              <WorkflowIcon className="h-6 w-6 text-neutral-300" aria-hidden="true" />
              <p className="text-body font-medium text-neutral-700">Select a workflow</p>
              <p className="text-body-sm text-neutral-500">Its chain, rules and version history appear here.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-4">
              <button
                type="button"
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-2 text-left text-body-sm text-neutral-600 lg:hidden"
                onClick={() => setCode('')}
              >
                ← Back to workflows
              </button>

              {/* Identitas + lifecycle. Aksi dipisah ke grupnya sendiri supaya
                  "apa yang sedang saya lihat" tidak tercampur dengan
                  "apa yang bisa saya lakukan". */}
              <div className="rounded-md border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div
                    aria-label="Definition summary"
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-h2 text-neutral-950">{selected.name}</h2>
                      <StatusBadge status={selected.status} label={VERSION_STATUS_LABEL[selected.status] ?? selected.status} />
                      <span className="font-mono text-caption text-neutral-500">v{selected.version}</span>
                    </div>
                    <p className="mt-1 text-pretty text-caption text-neutral-500">
                      <span className="font-mono text-neutral-600">{selected.code}</span>
                      {' · '}{labelResource(selected.transactionType)} · {selected.steps.length} step{selected.steps.length === 1 ? '' : 's'}
                      {selected.createdByName ? `, created by ${selected.createdByName}` : ''}
                    </p>
                    <WorkflowLifecycle
                      status={selected.status}
                      className="mt-3"
                      publishAction={
                        selected.status === 'DRAFT' ? (
                          <Button size="sm" variant="primary" className="ml-1" onClick={() => setPublishOpen(true)}>
                            Publish
                          </Button>
                        ) : undefined
                      }
                    />
                  </div>

                  <div role="group" aria-label="Workflow actions" className="flex flex-wrap items-center gap-2">
                    {selected.status === 'ACTIVE' && (
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
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={duplicate.isPending}
                      onClick={doDuplicate}
                    >
                      Duplicate
                    </Button>
                    {selected.status === 'ACTIVE' && (
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
              </div>

              {/* Rantai + inspector */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-h3 text-neutral-950">Approval chain</h3>
                    {!locked && (
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
                    )}
                  </div>

                  <WorkflowChainList
                    steps={steps}
                    selectedStepId={selectedStep?.id}
                    onSelectStep={setStepId}
                    holdersByRole={holdersByRole}
                    holderNamesByRole={holderNamesByRole}
                    locked={locked}
                    transactionType={selected.transactionType}
                    activeStepOrders={simulatedPath}
                    onReorder={reorderSteps}
                  />
                </div>

                {/* Inspector: konteks langkah + simulasi, tetap terlihat. */}
                <div className="min-w-0 space-y-6 xl:border-l xl:border-neutral-200 xl:pl-4">
                  {steps.length === 0 ? (
                    <p className="text-body-sm text-neutral-500">
                      {locked ? 'This version has no steps.' : 'Add the first step to define who approves.'}
                    </p>
                  ) : (
                    <>
                      <section aria-labelledby="wf-step-detail">
                        <h3 id="wf-step-detail" className="sr-only">Step details</h3>
                        {selectedStep && (
                          <WorkflowStepForm
                            step={selectedStep}
                            transactionType={selected.transactionType}
                            roleOptions={roleOptions.length > 0 ? roleOptions : [{ code: selectedStep.approverRoleCode, name: selectedStep.approverRoleCode, holders: holdersByRole[selectedStep.approverRoleCode] ?? 0 }]}
                            locked={locked}
                            saving={updateStep.isPending || removeStep.isPending}
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
                        <h3 id="wf-simulate" className="mb-3 text-h3 text-neutral-950">Simulate</h3>
                        <WorkflowScenarios
                          steps={steps}
                          transactionType={selected.transactionType}
                          onPathChange={setSimulatedPath}
                        />
                      </section>
                    </>
                  )}
                </div>
              </div>

              {/* Drawer: insight, versi, pengaturan. */}
              <WorkflowDrawer
                value={drawer || null}
                onValueChange={(v) => setDrawer(v ?? '')}
                tabs={[
                  {
                    value: 'insights',
                    label: 'Insights',
                    icon: DRAWER_ICONS.insights,
                    content: (
                      <>
                        {insights.isLoading && <Skeleton className="h-40 w-full" />}
                        {insights.isError && <ErrorState message="Could not load insights." onRetry={() => insights.refetch()} />}
                        {insights.data && <WorkflowInsightsPanel data={insights.data} />}
                      </>
                    ),
                  },
                  {
                    value: 'versions',
                    label: 'Versions',
                    icon: DRAWER_ICONS.versions,
                    content: (
                      <>
                        {versions.isLoading && <Skeleton className="h-24 w-full" />}
                        {versions.isError && <ErrorState message="Could not load version history." onRetry={() => versions.refetch()} />}
                        {versions.data && (
                          <WorkflowVersionsRail
                            versions={versions.data}
                            selectedVersion={selected.version}
                            onSelectVersion={(v) => { setCode(selected.code); setVersionRaw(String(v)); setStepId(''); }}
                          />
                        )}
                      </>
                    ),
                  },
                  {
                    value: 'settings',
                    label: 'Settings',
                    icon: DRAWER_ICONS.settings,
                    content: (
                      <MetadataEditor
                        definition={selected}
                        saving={updateDefinition.isPending}
                        onSave={(input) => updateDefinition.mutate(
                          { id: selected.id, input },
                          { onSuccess: () => toast({ title: 'Workflow updated', variant: 'success' }) },
                        )}
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}
        </section>
      </div>

      {/* Dialog template: mulai dari cetakan, bukan dari nol. */}
      <WorkflowTemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        templates={templates.data ?? []}
        loading={templates.isLoading}
        onCreate={doCreateFromTemplate}
      />

      {/* Dialog publish: masalah ditampilkan sebelum menekan Publish. */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md" showClose={false}>
          <DialogHeader>
            <DialogTitle>Publish {selected?.code ?? ''} v{selected?.version ?? ''}?</DialogTitle>
            <DialogDescription>
              Any other active version of {selected ? labelResource(selected.transactionType) : 'this document'} will be archived.
            </DialogDescription>
          </DialogHeader>
          <WorkflowPreflight issues={issues} onSelectStep={(id) => { setStepId(id); setPublishOpen(false); }} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishOpen(false)} disabled={publish.isPending}>
              Cancel
            </Button>
            <Button
              variant={blocked ? 'secondary' : 'primary'}
              disabled={blocked}
              loading={publish.isPending}
              onClick={doPublish}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

