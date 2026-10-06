import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn, labelRole } from '@aec/ui';
import type { ConditionGroup, UpdateWorkflowStep, WorkflowStep } from '@aec/api-contracts';
import { ConditionBuilder, type ConditionValue } from './condition-builder';
import { conditionFieldLabel, conditionFieldsFor, opLabel } from './workflow-labels';

export interface WorkflowStepFormProps {
  step: WorkflowStep;
  transactionType: string;
  /** Semua role yang dikenal, daftar tertutup, bukan teks bebas. */
  roleOptions: { code: string; name: string; holders: number }[];
  locked: boolean;
  saving: boolean;
  onSave: (input: UpdateWorkflowStep) => void;
  onRemove: () => void;
}

const NO_CONDITION = '__none__';

/** Grup efektif dari sebuah langkah: grup tersimpan, atau turunan kolom tunggal. */
function currentGroup(step: WorkflowStep): ConditionGroup | null {
  if (step.conditionGroup) return step.conditionGroup;
  if (step.conditionField) {
    return {
      combinator: 'AND',
      conditions: [{ field: step.conditionField, op: (step.conditionOp as ConditionGroup['conditions'][number]['op']) ?? '>', value: step.conditionValue ?? 0 }],
    };
  }
  return null;
}

/**
 * Panel detail untuk satu langkah. Bentuk mengikuti pola editor workflow Jira:
 * memilih langkah mengisi panel ini, bukan pindah halaman.
 *
 * Jarak berjenjang: judul↔field 16px, antar-field 16px, label↔kontrol 4px.
 * Tanpa kotak dan tanpa garis pemisah: pengelompokan dibawa oleh jarak.
 */
export function WorkflowStepForm({
  step, transactionType, roleOptions, locked, saving, onSave, onRemove,
}: WorkflowStepFormProps) {
  const [name, setName] = useState(step.name);
  const [role, setRole] = useState(step.approverRoleCode);
  const [hasCondition, setHasCondition] = useState(Boolean(step.conditionField) || Boolean(step.conditionGroup));
  const [condition, setCondition] = useState<ConditionValue>(
    step.conditionGroup
      ?? (step.conditionField
        ? { combinator: 'AND', conditions: [{ field: step.conditionField, op: (step.conditionOp as ConditionGroup['conditions'][number]['op']) ?? '>', value: step.conditionValue ?? 0 }] }
        : null),
  );

  // Ganti langkah terpilih → form mengikuti langkah baru. Memakai pola "derived
  // state from props" React (bukan efek) agar tidak memicu render berantai.
  const [lastStepId, setLastStepId] = useState(step.id);
  if (lastStepId !== step.id) {
    setLastStepId(step.id);
    setName(step.name);
    setRole(step.approverRoleCode);
    setHasCondition(Boolean(step.conditionField) || Boolean(step.conditionGroup));
    setCondition(
      step.conditionGroup
        ?? (step.conditionField
          ? { combinator: 'AND', conditions: [{ field: step.conditionField, op: (step.conditionOp as ConditionGroup['conditions'][number]['op']) ?? '>', value: step.conditionValue ?? 0 }] }
          : null),
    );
  }

  const holders = roleOptions.find((r) => r.code === role)?.holders ?? 0;

  const dirty =
    name !== step.name ||
    role !== step.approverRoleCode ||
    hasCondition !== (Boolean(step.conditionField) || Boolean(step.conditionGroup)) ||
    (hasCondition && JSON.stringify(condition) !== JSON.stringify(currentGroup(step)));

  const canSave = !locked && dirty && name.trim().length > 0 && role.length > 0
    && (!hasCondition || (condition != null && condition.conditions.length > 0 && condition.conditions.every((c) => c.field && Number.isFinite(c.value))));

  const submit = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      approverRoleCode: role,
      // Grup adalah sumber kebenaran; server menurunkan kolom tunggal darinya.
      conditionGroup: hasCondition ? condition : null,
      conditionField: hasCondition && condition ? condition.conditions[0]!.field : null,
      conditionOp: hasCondition && condition ? condition.conditions[0]!.op : null,
      conditionValue: hasCondition && condition ? condition.conditions[0]!.value : null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Judul. Pemindahan urutan tinggal di daftar rantai (satu tempat saja):
          dua kontrol bernama sama di dua panel akan membingungkan dan melanggar
          "satu aksi, satu tempat". */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-medium text-neutral-900">Step {step.stepOrder}</h3>
      </div>

      {/* 32px setelah judul: kelompok field terpisah jelas dari judulnya. */}
      <div className="space-y-4 pt-4">
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
                  {labelRole(r.code)}, {r.holders} holder{r.holders === 1 ? '' : 's'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {holders === 0 && (
            <p role="alert" className="mt-1 text-caption text-destructive-700">
              No user holds this role, so the workflow cannot be published until someone does.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={`step-cond-toggle-${step.id}`}>Condition</Label>
          <Select
            value={hasCondition ? 'yes' : NO_CONDITION}
            onValueChange={(v) => {
              const yes = v === 'yes';
              setHasCondition(yes);
              // Menyalakan syarat tanpa aturan akan menghasilkan langkah yang
              // tampak bersyarat tetapi selalu berlaku — mulai dari satu aturan.
              if (yes && !condition) {
                setCondition({ combinator: 'AND', conditions: [{ field: conditionFieldsFor(transactionType)[0] ?? '', op: '>', value: 0 }] });
              }
            }}
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

        {hasCondition && condition && (
          <ConditionBuilder
            transactionType={transactionType}
            value={condition}
            onChange={setCondition}
            idPrefix={`step-cond-${step.id}`}
            disabled={locked}
          />
        )}
      </div>

      {!locked ? (
        // 32px setelah kelompok field: aksi terpisah dari isi, tanpa garis pemisah.
        <div className="flex items-center justify-between gap-3 pt-4">
          <Button size="sm" variant="ghost" className="text-destructive-700" onClick={onRemove} disabled={saving}>
            Remove step
          </Button>
          <Button size="sm" variant="secondary" onClick={submit} disabled={!canSave} loading={saving}>
            Save step
          </Button>
        </div>
      ) : (
        <p className={cn('pt-4 text-caption text-neutral-500')}>
          This version is not a draft, so its steps are read-only. Create a new version to change them.
          {(() => {
            const group = currentGroup(step);
            if (!group) return null;
            const text = group.conditions
              .map((c) => `${conditionFieldLabel(c.field)} ${opLabel(c.op)} ${c.value}`)
              .join(group.combinator === 'OR' ? ' or ' : ' and ');
            return ` Current rule: ${text}.`;
          })()}
        </p>
      )}
    </div>
  );
}
