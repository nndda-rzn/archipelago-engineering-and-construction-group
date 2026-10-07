import { useState } from 'react';
import { cn } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { subjectOf, chainConditionText, summariseHolderNames } from '../lib/chain-text';
import { WorkflowChainStepRow } from './workflow-chain-step-row';

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
 *
 * Baris per langkah ada di `WorkflowChainStepRow`; daftar ini menangani
 * orkestrasi drag & urutan.
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
        const condition = chainConditionText(step);
        const isDragging = draggingId === step.id;
        const isDropTarget = dropIndex === index && draggingId !== null && !isDragging;

        return (
          <WorkflowChainStepRow
            key={step.id}
            step={step}
            index={index}
            total={steps.length}
            selected={selected}
            skipped={skipped}
            missing={missing}
            holders={holders}
            names={names}
            condition={condition}
            holderSummary={summariseHolderNames(names)}
            canReorder={canReorder}
            isDragging={isDragging}
            isDropTarget={isDropTarget}
            simulating={simulating}
            locked={locked}
            onSelect={onSelectStep}
            onMove={move}
            onDragStart={() => setDraggingId(step.id)}
            onDragEnd={() => { setDraggingId(null); setDropIndex(null); }}
            onDragOver={() => setDropIndex(index)}
            onDrop={() => handleDrop(index)}
          />
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
