import { cn, labelRole } from '@aec/ui';
import { AlertTriangle, Lock } from 'lucide-react';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from './workflow-labels';

export interface WorkflowPipelineProps {
  steps: WorkflowStep[];
  /** Id node yang sedang dipilih (panel detail). */
  selectedStepId?: string;
  onSelectStep?: (stepId: string) => void;
  /** Jumlah pemegang role per kode role — 0 berarti rantai akan macet. */
  holdersByRole: Record<string, number>;
  /** Struktur terkunci (bukan DRAFT) — hanya melihat, tanpa mengubah. */
  locked?: boolean;
}

/**
 * Pipeline langkah approval: **alur**, bukan daftar. Konektor antar node
 * menunjukkan urutan eksekusi, dan label syarat menempel di sisi panah karena
 * syarat itulah yang menentukan langkah berikutnya dijalankan atau dilewati.
 *
 * Warna bukan satu-satunya sinyal: node bermasalah membawa ikon + teks
 * "No approver", dan tiap node punya `aria-label` berisi seluruh isinya.
 */
export function WorkflowPipeline({ steps, selectedStepId, onSelectStep, holdersByRole, locked = false }: WorkflowPipelineProps) {
  if (steps.length === 0) {
    return (
      <p className="text-body-sm text-neutral-500">
        No steps yet. {locked ? 'Create a new version to add steps.' : 'Add the first step to define who approves.'}
      </p>
    );
  }

  return (
    <ol className="flex flex-wrap items-stretch gap-y-3" data-slot="workflow-pipeline">
      {steps.map((step, index) => {
        const holders = holdersByRole[step.approverRoleCode] ?? 0;
        const missing = holders === 0;
        const selected = selectedStepId === step.id;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className="flex items-stretch">
            <button
              type="button"
              onClick={() => onSelectStep?.(step.id)}
              aria-pressed={selected}
              aria-label={`Step ${step.stepOrder}: ${step.name}, approver ${labelRole(step.approverRoleCode)}, ${holders} holder${holders === 1 ? '' : 's'}${missing ? ', no approver assigned' : ''}`}
              className={cn(
                'w-56 rounded-md border bg-white p-3 text-left transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                selected ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50',
                missing && !selected && 'border-destructive-300',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-caption',
                    missing ? 'bg-destructive-100 text-destructive-700' : 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {step.stepOrder}
                </span>
                <span className="truncate text-body-sm font-medium text-neutral-900" title={step.name}>{step.name}</span>
                {locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />}
              </span>

              <span className="mt-2 block truncate text-caption text-neutral-600" title={labelRole(step.approverRoleCode)}>
                {labelRole(step.approverRoleCode)}
              </span>

              <span className={cn('mt-1 flex items-center gap-1 text-caption', missing ? 'text-destructive-700' : 'text-neutral-500')}>
                {missing ? (
                  <>
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    No approver — the chain will stall
                  </>
                ) : (
                  `${holders} holder${holders === 1 ? '' : 's'}`
                )}
              </span>

              {step.conditionField && (
                <span className="mt-2 block rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-neutral-700">
                  {CONDITION_FIELD_LABELS[step.conditionField] ?? step.conditionField} {opLabel(step.conditionOp)} {formatIdr(step.conditionValue ?? 0)}
                </span>
              )}
            </button>

            {!isLast && (
              <span aria-hidden="true" className="flex w-10 shrink-0 items-center justify-center">
                {/* Konektor: garis + panah, murni SVG agar deterministik & bisa diuji. */}
                <svg viewBox="0 0 40 12" className="h-3 w-10 text-neutral-300" role="presentation">
                  <line x1="0" y1="6" x2="30" y2="6" stroke="currentColor" strokeWidth="1.5" />
                  <polyline points="28,2 34,6 28,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
