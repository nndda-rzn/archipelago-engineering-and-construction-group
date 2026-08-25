import { useState } from 'react';
import { Badge, Button } from '@aec/ui';
import { useWorkflowDefinitions } from './approval.api';
import { WorkflowCard } from './workflow-card';
import { CreateWorkflowForm } from './workflow-form';

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default', ACTIVE: 'success', ARCHIVED: 'warning',
};

const opLabel: Record<string, string> = { '>': '>', '<': '<', '>=': '≥', '<=': '≤', '==': '=', };

function StepBadge({ conditionField, conditionOp, conditionValue }: { conditionField: string | null; conditionOp: string | null; conditionValue: number | null }) {
  if (!conditionField || !conditionOp || conditionValue == null) return null;
  return <Badge variant="default">{conditionField} {opLabel[conditionOp] ?? conditionOp} {new Intl.NumberFormat('id-ID').format(conditionValue)}</Badge>;
}

export function WorkflowDefinitionPage() {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useWorkflowDefinitions();

  // Group by code: tampil semua versi, aktif di atas
  const sorted = [...(data ?? [])].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return b.version - a.version;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Workflow Definition</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Definisi + versioning approval (FR-FND-007)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Tutup' : '+ Buat Workflow'}</Button>
        </div>
      </div>

      {showForm && <CreateWorkflowForm onDone={() => setShowForm(false)} />}

      {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {isError && <p className="text-body-sm text-destructive-600">Gagal memuat workflow.</p>}
      {!isLoading && !isError && (
        <div className="space-y-4">
          {sorted.map((wf) => <WorkflowCard key={wf.id} workflow={wf} />)}
          {sorted.length === 0 && <p className="text-body-sm text-neutral-500">Belum ada workflow.</p>}
        </div>
      )}
    </div>
  );
}
