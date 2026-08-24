import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useAddWorkflowStep, useCreateWorkflowDefinition, useNewWorkflowVersion, usePublishWorkflow, useWorkflowDefinitions, type WorkflowDefinition } from './approval.api';

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  ARCHIVED: 'warning',
};

const opLabel: Record<string, string> = {
  '>': '>',
  '<': '<',
  '>=': '≥',
  '<=': '≤',
  '==': '=',
};

function StepBadge({ conditionField, conditionOp, conditionValue }: { conditionField: string | null; conditionOp: string | null; conditionValue: number | null }) {
  if (!conditionField || !conditionOp || conditionValue == null) return null;
  return (
    <Badge variant="default">
      {conditionField} {opLabel[conditionOp] ?? conditionOp} {new Intl.NumberFormat('id-ID').format(conditionValue)}
    </Badge>
  );
}

function WorkflowCard({ workflow }: { workflow: WorkflowDefinition }) {
  const addStep = useAddWorkflowStep();
  const publish = usePublishWorkflow();
  const newVersion = useNewWorkflowVersion();
  const [stepOrder, setStepOrder] = useState((workflow.steps.length ?? 0) + 1);
  const [stepName, setStepName] = useState('');
  const [role, setRole] = useState('PROCUREMENT_MANAGER');
  const [condField, setCondField] = useState('');
  const [condOp, setCondOp] = useState('>');
  const [condValue, setCondValue] = useState(0);

  const isDraft = workflow.status === 'DRAFT';

  const submitStep = () => {
    if (!stepName || !role) return;
    addStep.mutate(
      {
        id: workflow.id,
        input: {
          stepOrder,
          name: stepName,
          approverRoleCode: role,
          conditionField: condField || undefined,
          conditionOp: condField ? (condOp as '>' | '<' | '>=' | '<=' | '==') : undefined,
          conditionValue: condField ? condValue : undefined,
        },
      },
      {
        onSuccess: () => {
          setStepOrder((o) => o + 1);
          setStepName('');
        },
      },
    );
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-body font-semibold text-neutral-900">{workflow.code}</span>
            <Badge variant={statusVariant[workflow.status] ?? 'default'}>
              v{workflow.version} · {workflow.status}
            </Badge>
          </div>
          <p className="mt-1 text-caption text-neutral-500">
            {workflow.transactionType} — {workflow.description ?? workflow.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm(`Publish ${workflow.code} v${workflow.version}? Versi lain akan di-archive.`)) {
                  publish.mutate({ id: workflow.id, input: { newVersionName: workflow.name } });
                }
              }}
              loading={publish.isPending}
            >
              Publish
            </Button>
          )}
          {workflow.status === 'ACTIVE' && (
            <Button size="sm" variant="secondary" onClick={() => newVersion.mutate(workflow.code)} loading={newVersion.isPending}>
              + Versi Baru
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <ol className="space-y-1.5">
          {workflow.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 rounded-md border border-neutral-100 px-3 py-2 text-body-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 font-mono text-caption text-neutral-600">
                {step.stepOrder}
              </span>
              <span className="text-neutral-800">{step.name}</span>
              <Badge variant="default">{step.approverRoleCode}</Badge>
              <StepBadge conditionField={step.conditionField} conditionOp={step.conditionOp} conditionValue={step.conditionValue} />
            </li>
          ))}
          {workflow.steps.length === 0 && <li className="text-caption text-neutral-500">Belum ada step.</li>}
        </ol>
      </div>

      {isDraft && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-neutral-50 p-3 md:grid-cols-5">
          <div>
            <Label htmlFor={`step-order-${workflow.id}`}>Order</Label>
            <Input id={`step-order-${workflow.id}`} type="number" min={1} value={stepOrder} onChange={(e) => setStepOrder(Number(e.target.value))} className="h-8" />
          </div>
          <div>
            <Label htmlFor={`step-name-${workflow.id}`}>Nama Step</Label>
            <Input id={`step-name-${workflow.id}`} placeholder="Approval Direksi" value={stepName} onChange={(e) => setStepName(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor={`step-role-${workflow.id}`}>Role</Label>
            <Input id={`step-role-${workflow.id}`} value={role} onChange={(e) => setRole(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor={`step-cond-${workflow.id}`}>Kondisi (opsional)</Label>
            <div className="flex gap-1">
              <Input id={`step-cond-${workflow.id}`} placeholder="totalAmount" value={condField} onChange={(e) => setCondField(e.target.value)} className="h-8 w-full" />
              <select
                value={condOp}
                onChange={(e) => setCondOp(e.target.value)}
                aria-label="Operator"
                className="h-8 w-14 rounded-md border border-neutral-200 bg-white px-1 text-caption"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="==">=</option>
              </select>
              <Input type="number" value={condValue || ''} onChange={(e) => setCondValue(Number(e.target.value))} className="h-8 w-20" aria-label="Nilai kondisi" />
            </div>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={submitStep} loading={addStep.isPending}>+ Step</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateWorkflowForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState('PurchaseRequisition');
  const create = useCreateWorkflowDefinition();

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate(
      { code, name, transactionType: transactionType as 'PurchaseRequisition' | 'PurchaseOrder' },
      { onSuccess: () => { setCode(''); setName(''); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="wf-code">Kode</Label>
          <Input id="wf-code" placeholder="mis. SUB_APPROVAL" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wf-name">Nama</Label>
          <Input id="wf-name" placeholder="Approval Subkontrak" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wf-type">Tipe Transaksi</Label>
          <select
            id="wf-type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="PurchaseRequisition">PurchaseRequisition</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Workflow v1</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Kode workflow sudah ada.</p>}
    </div>
  );
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
