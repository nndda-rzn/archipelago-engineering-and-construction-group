import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Lock } from 'lucide-react';
import { AvatarStack, cn, labelRole } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from './workflow-labels';

export interface WorkflowChainListProps {
  steps: WorkflowStep[];
  selectedStepId?: string;
  onSelectStep: (stepId: string) => void;
  /** Jumlah pemegang role per kode role. 0 berarti rantai akan macet. */
  holdersByRole: Record<string, number>;
  holderNamesByRole: Record<string, string[]>;
  /** Struktur terkunci (bukan DRAFT): hanya melihat. */
  locked: boolean;
  transactionType: string;
  /** Hasil simulasi: `null` = belum disimulasikan. */
  activeStepOrders?: number[] | null;
  /** Reorder langkah (dipakai drag dan tombol naik/turun). Urutan id lengkap. */
  onReorder?: (stepIds: string[]) => void;
}

/** Nama dokumen manusiawi untuk anchor awal dan akhir rantai. */
function subjectOf(transactionType: string): string {
  return transactionType === 'PurchaseOrder' ? 'Purchase order' : 'Purchase requisition';
}

/** Ringkas syarat langkah, mis. `Estimated total > 5.000.000` atau `A and B`. */
function conditionText(step: WorkflowStep): string | null {
  if (step.conditionGroup) {
    return step.conditionGroup.conditions
      .map((c) => `${CONDITION_FIELD_LABELS[c.field] ?? c.field} ${opLabel(c.op)} ${formatIdr(c.value)}`)
      .join(step.conditionGroup.combinator === 'OR' ? ' or ' : ' and ');
  }
  if (!step.conditionField) return null;
  const field = CONDITION_FIELD_LABELS[step.conditionField] ?? step.conditionField;
  return `${field} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}`;
}

/**
 * Rantai approval sebagai **daftar berurutan yang bisa diedit**.
 *
 * Rantai approval adalah proses **berurutan**, jadi semantik yang benar adalah
 * `<ol>`, bukan kanvas 2D. Kanvas menyediakan pan/zoom/minimap untuk ruang tak
 * terbatas — semuanya tak berguna untuk daftar tiga langkah yang selalu muat,
 * dan node-nya toh dipaksa kembali ke grid. Daftar biasa lebih jujur, lebih
 * ringan, dan lebih mudah diakses.
 *
 * Mengubah urutan punya **dua jalur setara**: menyeret gagang (nyaman untuk
 * mouse) dan tombol naik/turun (wajib — WCAG 2.5.7 melarang aksi yang hanya
 * bisa dilakukan dengan menyeret). Keduanya memanggil endpoint yang sama.
 *
 * Warna tidak pernah menjadi satu-satunya sinyal: langkah tanpa pemegang
 * membawa ikon + teks, langkah yang dilewati simulasi diredupkan **dan**
 * menyebutnya di `aria-label`.
 */
export function WorkflowChainList({
  steps,
  selectedStepId,
  onSelectStep,
  holdersByRole,
  holderNamesByRole,
  locked,
  transactionType,
  activeStepOrders = null,
  onReorder,
}: WorkflowChainListProps) {
  const subject = subjectOf(transactionType);
  const simulating = activeStepOrders != null;
  const canReorder = !locked && Boolean(onReorder);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
        <div>
          <p className="text-body font-medium text-neutral-700">No steps yet</p>
          <p className="mt-0.5 text-body-sm text-neutral-500">
            {locked ? 'Create a new version to add steps.' : 'Add the first step to define who approves.'}
          </p>
        </div>
      </div>
    );
  }

  const move = (fromIndex: number, toIndex: number) => {
    if (!onReorder) return;
    if (toIndex < 0 || toIndex >= steps.length || toIndex === fromIndex) return;
    const next = [...steps];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved!);
    onReorder(next.map((s) => s.id));
  };

  const handleDrop = (index: number) => {
    const fromIndex = steps.findIndex((s) => s.id === draggingId);
    setDraggingId(null);
    setDropIndex(null);
    if (fromIndex >= 0) move(fromIndex, index);
  };

  return (
    <ol data-slot="workflow-chain" className="space-y-1" aria-label={`Approval chain for ${subject.toLowerCase()}`}>
      <AnchorRow label={`${subject} submitted`} />

      {steps.map((step, index) => {
        const holders = holdersByRole[step.approverRoleCode] ?? 0;
        const names = holderNamesByRole[step.approverRoleCode] ?? [];
        const missing = holders === 0;
        const selected = selectedStepId === step.id;
        const skipped = simulating && !activeStepOrders!.includes(step.stepOrder);
        const condition = conditionText(step);
        const isDragging = draggingId === step.id;
        const isDropTarget = dropIndex === index && draggingId !== null && !isDragging;

        return (
          <li
            key={step.id}
            onDragOver={(e) => {
              if (!canReorder || !draggingId) return;
              e.preventDefault();
              setDropIndex(index);
            }}
            onDrop={() => handleDrop(index)}
            className={cn(
              'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md border-l-2 pr-1',
              'transition-colors duration-fast',
              selected ? 'border-neutral-800 bg-neutral-50' : missing ? 'border-destructive-300' : 'border-transparent',
              isDragging && 'opacity-50',
              isDropTarget && 'ring-1 ring-neutral-400',
              simulating && skipped && 'opacity-40',
            )}
          >
            {/* Gagang seret — nyaman untuk mouse; tombol ↑/↓ adalah padanan wajibnya. */}
            {canReorder ? (
              <span
                draggable
                onDragStart={() => setDraggingId(step.id)}
                onDragEnd={() => { setDraggingId(null); setDropIndex(null); }}
                role="button"
                tabIndex={0}
                aria-label={`Reorder step ${step.stepOrder}`}
                onKeyDown={(e) => {
                  // Padanan keyboard untuk menyeret: Alt + panah.
                  if (!e.altKey) return;
                  if (e.key === 'ArrowUp') { e.preventDefault(); move(index, index - 1); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); move(index, index + 1); }
                }}
                className={cn(
                  'ml-1 flex h-7 w-5 cursor-grab items-center justify-center text-neutral-400',
                  'hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  'active:cursor-grabbing',
                )}
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : (
              <span className="ml-1 h-7 w-5" aria-hidden="true" />
            )}

            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-caption tabular-nums',
                missing ? 'bg-destructive-100 text-destructive-700' : selected ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-700',
              )}
            >
              {step.stepOrder}
            </span>

            <button
              type="button"
              onClick={() => onSelectStep(step.id)}
              aria-pressed={selected}
              aria-label={
                `Step ${step.stepOrder}: ${step.name}, approver ${labelRole(step.approverRoleCode)}, ` +
                `${holders} holder${holders === 1 ? '' : 's'}` +
                `${missing ? ', no approver assigned' : ''}` +
                `${condition ? `, only when ${condition}` : ''}` +
                `${simulating && skipped ? ', skipped for this amount' : ''}`
              }
              className="min-w-0 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 truncate text-body-sm font-medium text-neutral-900" title={step.name}>
                  {step.name}
                </span>
                {locked && <Lock className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />}
              </span>

              <span className="mt-0.5 flex items-center gap-x-2 text-caption text-neutral-600">
                <span className="shrink-0 whitespace-nowrap" title={labelRole(step.approverRoleCode)}>
                  {labelRole(step.approverRoleCode)}
                </span>
                {missing ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-destructive-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">No approver, so the chain will stall</span>
                  </span>
                ) : (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <AvatarStack names={names} size="sm" className="shrink-0" />
                    <span className="truncate" title={names.join(', ')}>{summarise(names)}</span>
                  </span>
                )}
              </span>

              {condition && (
                <span className="mt-1 flex min-w-0">
                  <span
                    className="max-w-full truncate rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-caption tabular-nums text-neutral-700"
                    title={condition}
                  >
                    {condition}
                  </span>
                </span>
              )}
            </button>

            {/* Tombol urutan: jalur non-drag yang selalu tersedia (WCAG 2.5.7). */}
            {canReorder ? (
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move step ${step.stepOrder} earlier`}
                  className={cn(
                    'flex h-4 w-6 items-center justify-center rounded-sm text-neutral-400',
                    'hover:text-neutral-800 disabled:opacity-30 disabled:hover:text-neutral-400',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  )}
                >
                  <ArrowUp className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === steps.length - 1}
                  aria-label={`Move step ${step.stepOrder} later`}
                  className={cn(
                    'flex h-4 w-6 items-center justify-center rounded-sm text-neutral-400',
                    'hover:text-neutral-800 disabled:opacity-30 disabled:hover:text-neutral-400',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  )}
                >
                  <ArrowDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ) : (
              <span className="w-6" aria-hidden="true" />
            )}
          </li>
        );
      })}

      {/* Zona jatuh terakhir: menyeret ke bawah melewati langkah terakhir. */}
      {canReorder && draggingId !== null && (
        <li
          onDragOver={(e) => { e.preventDefault(); setDropIndex(steps.length); }}
          onDrop={() => handleDrop(steps.length - 1)}
          className={cn('h-6 rounded-md border border-dashed', dropIndex === steps.length ? 'border-neutral-400 bg-neutral-50' : 'border-transparent')}
          aria-hidden="true"
        />
      )}

      <AnchorRow label={`${subject} approved`} />
    </ol>
  );
}

/** Batas proses: pemicu di atas, hasil di bawah. Netral — ia bukan langkah. */
function AnchorRow({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 py-1 pl-1">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full border border-neutral-300 bg-white" />
      <span className="text-caption text-neutral-500">{label}</span>
    </li>
  );
}

/** Nama tunggal ditulis utuh; banyak nama diringkas jadi jumlah (menyebut satu menyesatkan). */
function summarise(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  return `${names.length} people`;
}
