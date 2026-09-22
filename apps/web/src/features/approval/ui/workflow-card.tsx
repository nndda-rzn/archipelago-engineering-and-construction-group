import { useState } from 'react';
import { Badge, Button, ConfirmActionButton, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useAddWorkflowStep, usePublishWorkflow, useNewWorkflowVersion, type WorkflowDefinition } from '../model/approval.api';
import { formatNumber } from '@/shared/lib/format';


const opLabel: Record<string, string> = {
  '>': '>', '<': '<', '>=': '≥', '<=': '≤', '==': '=',
};

function StepBadge({ conditionField, conditionOp, conditionValue }: { conditionField: string | null; conditionOp: string | null; conditionValue: number | null }) {
  if (!conditionField || !conditionOp || conditionValue == null) return null;
  return (
    <Badge variant="default">
      {conditionField} {opLabel[conditionOp] ?? conditionOp} {formatNumber(conditionValue)}
    </Badge>
  );
}

export function WorkflowCard({ workflow }: { workflow: WorkflowDefinition }) {
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
      { id: workflow.id, input: { stepOrder, name: stepName, approverRoleCode: role, conditionField: condField || undefined, conditionOp: condField ? (condOp as '>' | '<' | '>=' | '<=' | '==') : undefined, conditionValue: condField ? condValue : undefined } },
      { onSuccess: () => { setStepOrder((o) => o + 1); setStepName(''); } },
    );
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-body font-semibold text-neutral-900">{workflow.code}</span>
            <StatusBadge status={workflow.status} label={`v${workflow.version} · ${workflow.status}`} />
          </div>
          <p className="mt-1 text-caption text-neutral-500">{workflow.transactionType} — {workflow.description ?? workflow.name}</p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <ConfirmActionButton
              size="sm"
              variant="secondary"
              confirmTitle="Publish workflow"
              confirmDescription={`Publish ${workflow.code} v${workflow.version}? Versi lain akan di-archive.`}
              confirmLabel="Publish"
              onConfirm={() => publish.mutate({ id: workflow.id, input: { newVersionName: workflow.name } })}
              loading={publish.isPending}
            >
              Publish
            </ConfirmActionButton>
          )}
          {workflow.status === 'ACTIVE' && (
            <Button size="sm" variant="secondary" onClick={() => newVersion.mutate(workflow.code)} loading={newVersion.isPending}>+ Versi Baru</Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ol className="space-y-1.5">
          {workflow.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 rounded-md border border-neutral-100 px-3 py-2 text-body-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 font-mono text-caption text-neutral-600">{step.stepOrder}</span>
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
              <Select value={condOp} onValueChange={setCondOp}>
                <SelectTrigger id={`step-cond-op-${workflow.id}`} className="h-8 w-14" aria-label="Operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="==">=</SelectItem>
                </SelectContent>
              </Select>
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