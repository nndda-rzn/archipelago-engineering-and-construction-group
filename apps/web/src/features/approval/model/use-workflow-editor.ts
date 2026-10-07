import { useMemo, useState } from 'react';
import { useToast } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import {
  useAddWorkflowStep, useArchiveWorkflow, useCreateWorkflowFromTemplate,
  useDeleteWorkflow, useDuplicateWorkflow, useNewWorkflowVersion, usePublishWorkflow,
  useRemoveWorkflowStep, useReorderWorkflowSteps, useUpdateWorkflowDefinition, useUpdateWorkflowStep,
  useWorkflowDefinitions, useWorkflowInsights, useWorkflowTemplates, useWorkflowVersions,
} from '@/features/approval';
import { preflight, hasBlockers } from '@/features/approval/lib/preflight';
import { useRoles } from '@/entities/role';
import { useUrlFilter } from '@/shared/lib/use-url-state';

/**
 * State + orkestrasi workspace definisi workflow: pemilihan definisi/versi/langkah,
 * semua mutation, preflight, dan simulasi. Dipisah dari `WorkflowDefinitionPage`
 * agar halaman tinggal menyusun tampilan. Perilaku identik dengan sebelumnya.
 */
export function useWorkflowEditor() {
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

  return {
    // selection (URL-backed)
    code, setCode, versionRaw, setVersionRaw, stepId, setStepId, drawer, setDrawer,
    // local ui state
    query, setQuery, showCreate, setShowCreate, templateOpen, setTemplateOpen, publishOpen, setPublishOpen,
    // data
    definitions, roles, templates, versions, insights,
    roleOptions, holdersByRole, knownRoleCodes,
    filtered, selected, steps, selectedStep, locked,
    holderNamesByRole, warningCount, activeCount, draftCount,
    issues, blocked, simulatedPath, setSimulatedPath,
    // mutations (for inline wiring in the page)
    updateDefinition, addStep, updateStep, removeStep, publish, archive, remove, newVersion, duplicate,
    // handlers
    reorderSteps, doPublish, doDuplicate, doCreateFromTemplate,
  };
}
