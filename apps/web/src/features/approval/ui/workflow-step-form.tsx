import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn, labelRole } from '@aec/ui';
import type { UpdateWorkflowStep, WorkflowStep } from '@aec/api-contracts';
import { ConditionBuilder, type ConditionValue } from './condition-builder';
import { conditionFieldLabel, opLabel } from './workflow-labels';

export interface WorkflowStepFormProps {
  step: WorkflowStep;
  transactionType: string;
  /** Semua role yang dikenal — daftar tertutup, bukan teks bebas. */
  roleOptions: { code: string; name: string; holders: number }[];
  locked: boolean;
  saving: boolean;
  onSave: (input: UpdateWorkflowStep) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const NO_CONDITION = '__none__';

/**
 * Panel detail untuk satu langkah. Bentuk mengikuti pola Jira: memilih node
 * membuka panel yang mengedit node itu — bukan pindah halaman.
 */
export function WorkflowStepForm({
  step, transactionType, roleOptions, locked, saving, onSave, onRemove, onMove, canMoveUp, canMoveDown,
}: WorkflowStepFormProps) {
  const [name, setName] = useState(step.name);
  const [role, setRole] = useState(step.approverRoleCode);
  const [hasCondition, setHasCondition] = useState(Boolean(step.conditionField));
  const [condition, setCondition] = useState<ConditionValue>({
    field: step.conditionField ?? '',
    op: step.conditionOp ?? '>',
    value: step.conditionValue,
  });

  // Ganti node terpilih → form mengikuti node baru. Memakai pola "derived state
  // from props" React (bukan efek) agar tidak memicu render berantai.
  const [lastStepId, setLastStepId] = useState(step.id);
  if (lastStepId !== step.id) {
    setLastStepId(step.id);
    setName(step.name);
    setRole(step.approverRoleCode);
    setHasCondition(Boolean(step.conditionField));
    setCondition({ field: step.conditionField ?? '', op: step.conditionOp ?? '>', value: step.conditionValue });
  }

  const holders = roleOptions.find((r) => r.code === role)?.holders ?? 0;
  const dirty =
    name !== step.name ||
    role !== step.approverRoleCode ||
    hasCondition !== Boolean(step.conditionField) ||
    (hasCondition && (condition.field !== (step.conditionField ?? '') || condition.op !== (step.conditionOp ?? '>') || condition.value !== step.conditionValue));

  const canSave = !locked && dirty && name.trim().length > 0 && role.length > 0 && (!hasCondition || (condition.field && condition.value != null));

  const submit = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      approverRoleCode: role,
      conditionField: hasCondition ? condition.field : null,
      conditionOp: hasCondition ? (condition.op as '>' | '<' | '>=' | '<=' | '==') : null,
      conditionValue: hasCondition ? condition.value : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-medium text-neutral-900">
          Step {step.stepOrder}
        </h3>
        {!locked && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={!canMoveUp || saving} onClick={() => onMove(-1)} aria-label={`Move step ${step.stepOrder} earlier`}>
              Move up
            </Button>
            <Button size="sm" variant="ghost" disabled={!canMoveDown || saving} onClick={() => onMove(1)} aria-label={`Move step ${step.stepOrder} later`}>
              Move down
            </Button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor={`step-name-${step.id}`}>Name</Label>
        <Input
          id={`step-name-${step.id}`}
          value={name}
          disabled={locked}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor={`step-role-${step.id}`}>Approver role</Label>
        <Select value={role} onValueChange={setRole} disabled={locked}>
          <SelectTrigger id={`step-role-${step.id}`} aria-label="Approver role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {labelRole(r.code)} — {r.holders} holder{r.holders === 1 ? '' : 's'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {holders === 0 && (
          <p role="alert" className="mt-1 text-caption text-destructive-700">
            No user holds this role — the workflow cannot be published until someone does.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={`step-cond-toggle-${step.id}`}>Condition</Label>
        <Select
          value={hasCondition ? 'yes' : NO_CONDITION}
          onValueChange={(v) => setHasCondition(v === 'yes')}
          disabled={locked}
        >
          <SelectTrigger id={`step-cond-toggle-${step.id}`} aria-label="Whether this step is conditional">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CONDITION}>Always applies</SelectItem>
            <SelectItem value="yes">Only when a value matches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasCondition && (
        <ConditionBuilder
          transactionType={transactionType}
          value={condition}
          onChange={setCondition}
          idPrefix={`step-cond-${step.id}`}
          disabled={locked}
        />
      )}

      {!locked && (
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
          <Button size="sm" variant="ghost" className="text-destructive-700" onClick={onRemove} disabled={saving}>
            Remove step
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSave} loading={saving}>
            Save step
          </Button>
        </div>
      )}

      {locked && (
        <p className={cn('border-t border-neutral-200 pt-3 text-caption text-neutral-500')}>
          This version is not a draft, so its steps are read-only. Create a new version to change them.
          {step.conditionField && ` Current rule: ${conditionFieldLabel(step.conditionField)} ${opLabel(step.conditionOp)} ${step.conditionValue ?? 0}.`}
        </p>
      )}
    </div>
  );
}
