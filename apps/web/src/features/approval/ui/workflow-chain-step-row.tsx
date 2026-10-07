import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Lock } from 'lucide-react';
import { AvatarStack, cn, labelRole } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';

export interface WorkflowChainStepRowProps {
  step: WorkflowStep;
  index: number;
  total: number;
  selected: boolean;
  skipped: boolean;
  missing: boolean;
  holders: number;
  names: string[];
  condition: string | null;
  /** Ringkasan nama pemegang (sudah di-format). */
  holderSummary: string;
  canReorder: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  simulating: boolean;
  locked: boolean;
  onSelect: (stepId: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}

/**
 * Satu baris langkah dalam rantai approval: nomor, nama, role + pemegang,
 * syarat, dan kontrol urutan (drag + tombol ↑/↓). Dipisah dari
 * `WorkflowChainList` agar daftar dan baris masing-masing fokus.
 */
export function WorkflowChainStepRow({
  step, index, total, selected, skipped, missing, holders, names, condition, holderSummary,
  canReorder, isDragging, isDropTarget, simulating, locked,
  onSelect, onMove, onDragStart, onDragEnd, onDragOver, onDrop,
}: WorkflowChainStepRowProps) {
  return (
    <li
      onDragOver={(e) => {
        if (!canReorder || !isDragging) return;
        e.preventDefault();
        onDragOver();
      }}
      onDrop={onDrop}
      className={cn(
        'relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md pr-1',
        'transition-colors duration-fast',
        // Seleksi lewat LATAR, sama seperti sidebar nav, SegmentedControl,
        // DataGrid, dan financial band. Sebelumnya baris ini memakai
        // `border-l-2` — satu-satunya tempat di aplikasi yang begitu — dan
        // border transparan 2px di tiap baris menambah keramaian tanpa
        // membawa makna.
        selected ? 'bg-neutral-100' : 'hover:bg-neutral-50',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-1 ring-neutral-400',
        simulating && skipped && 'opacity-40',
      )}
    >
      {/* Gagang seret — nyaman untuk mouse; tombol ↑/↓ adalah padanan wajibnya. */}
      {canReorder ? (
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          role="button"
          tabIndex={0}
          aria-label={`Reorder step ${step.stepOrder}`}
          onKeyDown={(e) => {
            // Padanan keyboard untuk menyeret: Alt + panah.
            if (!e.altKey) return;
            if (e.key === 'ArrowUp') { e.preventDefault(); onMove(index, index - 1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); onMove(index, index + 1); }
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
        data-slot="step-order"
        className={cn(
          'relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-caption tabular-nums',
          missing ? 'bg-destructive-100 text-destructive-700' : selected ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-700',
        )}
      >
        {step.stepOrder}
      </span>

      {/* Garis penghubung antar langkah: membuat urutan TERLIHAT, bukan
          hanya terbaca dari nomor. Pusat badge ada di 42px
          (ml-1 4px + w-5 20px + gap-x-2 8px + setengah badge 10px).
          `-bottom-1` menjembatani celah `space-y-1` ke baris berikutnya. */}
      {index < total - 1 && (
        <span
          aria-hidden="true"
          data-slot="step-connector"
          className="pointer-events-none absolute -bottom-1 left-[2.625rem] top-1/2 w-px bg-neutral-200"
        />
      )}

      <button
        type="button"
        onClick={() => onSelect(step.id)}
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
              <span className="truncate" title={names.join(', ')}>{holderSummary}</span>
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
            onClick={() => onMove(index, index - 1)}
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
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
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
}
