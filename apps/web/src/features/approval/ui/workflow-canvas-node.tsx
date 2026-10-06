import { memo, useCallback } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { AlertTriangle, Lock } from 'lucide-react';
import { AvatarStack, cn, labelRole } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from './workflow-labels';

/**
 * Data satu node langkah di kanvas.
 *
 * React Flow menuntut `data` dapat diindeks, jadi tipe ini ditulis sebagai `type`
 * (bukan `interface`) agar assignable ke `Record<string, unknown>`.
 */
export type StepNodeData = {
  step: WorkflowStep;
  /** Jumlah pemegang role. 0 berarti rantai akan macet. */
  holders: number;
  /** Nama pemegang, supaya yang tampil orangnya, bukan angkanya. */
  holderNames: string[];
  /** Struktur terkunci (bukan DRAFT): hanya dilihat. */
  locked: boolean;
  /** Sedang mensimulasikan dan langkah ini dilewati nominal tersebut. */
  skipped: boolean;
  /** Apakah kanvas sedang menampilkan hasil simulasi. */
  simulating: boolean;
  /** Dipanggil saat node dipilih (klik / Enter / Space). */
  onSelect?: (stepId: string) => void;
  /** Dipanggil saat node menerima fokus — dipakai untuk roving focus panah. */
  onKeyNav?: (stepId: string, direction: -1 | 1) => void;
};

export type AnchorNodeData = {
  label: string;
};

export type StepNode = Node<StepNodeData, 'step'>;
export type AnchorNode = Node<AnchorNodeData, 'anchor'>;
export type WorkflowCanvasNode = StepNode | AnchorNode;

/** Ringkas syarat langkah menjadi satu baris manusiawi, mis. `Estimated total > 5.000.000`. */
function conditionText(step: WorkflowStep): string | null {
  if (!step.conditionField) return null;
  const field = CONDITION_FIELD_LABELS[step.conditionField] ?? step.conditionField;
  return `${field} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}`;
}

/**
 * Node langkah: kartu berisi urutan, nama, role, pemegang (orang, bukan angka),
 * dan syaratnya bila ada.
 *
 * Warna tidak pernah menjadi satu-satunya sinyal (WCAG 1.4.1): langkah tanpa
 * pemegang membawa **ikon + teks**, langkah yang dilewati simulasi **diredupkan
 * dan diberi keterangan di `aria-label`**. Penanda terpilih adalah border gelap
 * plus ring — token `neutral-800`, bukan merah (merah disimpan untuk aksi).
 *
 * Kartu ini adalah satu-satunya tempat seleksi langkah terjadi; tombolnya nyata
 * (`<button>`), jadi Enter/Space dan panah bekerja tanpa ARIA karangan.
 */
export const WorkflowStepNode = memo(function WorkflowStepNode({ data, selected }: NodeProps<StepNode>) {
  const { step, holders, holderNames, locked, skipped, simulating, onSelect, onKeyNav } = data;
  const missing = holders === 0;
  const condition = conditionText(step);

  const label =
    `Step ${step.stepOrder}: ${step.name}, approver ${labelRole(step.approverRoleCode)}, ` +
    `${holders} holder${holders === 1 ? '' : 's'}` +
    `${missing ? ', no approver assigned' : ''}` +
    `${condition ? `, only when ${condition}` : ''}` +
    `${simulating && skipped ? ', skipped for this amount' : ''}`;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onKeyNav?.(step.id, 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        onKeyNav?.(step.id, -1);
      }
    },
    [onKeyNav, step.id],
  );

  return (
    <div
      data-slot="workflow-node"
      data-missing={missing ? 'true' : undefined}
      data-skipped={simulating && skipped ? 'true' : undefined}
      className={cn(
        'w-56 rounded-md border bg-white shadow-xs transition-colors duration-fast',
        missing ? 'border-destructive-300' : 'border-neutral-200',
        selected && 'border-neutral-800 ring-2 ring-neutral-800',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-neutral-300 !bg-white" />
      <button
        type="button"
        onClick={() => onSelect?.(step.id)}
        onKeyDown={handleKeyDown}
        aria-label={label}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block w-full rounded-md px-3 py-2 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
          'transition-opacity duration-fast',
          simulating && skipped ? 'opacity-40' : 'opacity-100',
        )}
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-caption tabular-nums',
              missing ? 'bg-destructive-100 text-destructive-700' : 'bg-neutral-100 text-neutral-700',
            )}
          >
            {step.stepOrder}
          </span>
          <span className="truncate text-body-sm font-medium text-neutral-900" title={step.name}>
            {step.name}
          </span>
          {locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />}
        </span>

        <span className="mt-1 block truncate text-caption text-neutral-600" title={labelRole(step.approverRoleCode)}>
          {labelRole(step.approverRoleCode)}
        </span>

        <span className={cn('mt-1 flex items-center gap-1.5 text-caption', missing ? 'text-destructive-700' : 'text-neutral-600')}>
          {missing ? (
            <>
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              No approver, so the chain will stall
            </>
          ) : (
            <>
              <AvatarStack names={holderNames} size="sm" />
              <span className="truncate">{summarise(holderNames)}</span>
            </>
          )}
        </span>

        {condition && (
          <span className="mt-1.5 inline-flex max-w-full items-center rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-caption tabular-nums text-neutral-700">
            <span className="truncate" title={condition}>{condition}</span>
          </span>
        )}
      </button>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-neutral-300 !bg-white" />
    </div>
  );
});

/**
 * Batas proses: pemicu di atas, hasil di bawah. Netral dan kecil — ia bukan
 * langkah, jadi tidak boleh bersaing dengan node langkah.
 */
export const WorkflowAnchorNode = memo(function WorkflowAnchorNode({ data }: NodeProps<AnchorNode>) {
  return (
    <div
      data-slot="workflow-anchor"
      className="rounded-full border border-dashed border-neutral-300 bg-white px-3 py-1 text-caption text-neutral-500"
    >
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-neutral-300 !bg-white" />
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-neutral-300 !bg-white" />
    </div>
  );
});

/** Nama tunggal ditulis utuh; banyak nama diringkas jadi jumlah (menyebut satu menyesatkan). */
function summarise(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  return `${names.length} people`;
}
