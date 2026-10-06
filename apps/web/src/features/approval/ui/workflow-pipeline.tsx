import { Fragment } from 'react';
import { cn, labelRole } from '@aec/ui';
import { AlertTriangle, Lock } from 'lucide-react';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from './workflow-labels';

export interface WorkflowPipelineProps {
  steps: WorkflowStep[];
  /** Id langkah yang sedang dipilih (panel editor). */
  selectedStepId?: string;
  onSelectStep?: (stepId: string) => void;
  /** Jumlah pemegang role per kode role — 0 berarti rantai akan macet. */
  holdersByRole: Record<string, number>;
  /** Struktur terkunci (bukan DRAFT) — hanya melihat, tanpa mengubah. */
  locked?: boolean;
  /** Jenis transaksi dokumen — dipakai untuk label pemicu & hasil. */
  transactionType: string;
}

/** Nama dokumen manusiawi untuk anchor awal/akhir rantai. */
function subjectOf(transactionType: string): string {
  return transactionType === 'PurchaseOrder' ? 'Purchase order' : 'Purchase requisition';
}

/**
 * Rantai approval sebagai **alur vertikal**, bukan deretan kartu.
 *
 * Kenapa vertikal (bukan horizontal seperti sebelumnya): tiga node selebar 224px
 * plus dua konektor 40px membutuhkan ~752px, sedangkan panel kanan pada lebar
 * `lg` hanya ~656px — alur horizontal selalu pecah dan sambungan panahnya hilang.
 * Vertikal memakai satu sumbu sehingga rantai sepanjang apa pun tetap utuh.
 *
 * **Tanpa border, tanpa shadow** (prinsip proximity): pengelompokan dibawa oleh
 * jarak dan garis sumbu, bukan kotak. Uji "strip the borders" — hapus seluruh
 * border, struktur tetap terbaca.
 *
 * Setiap elemen visual membawa arti:
 * - garis **solid** = langkah ini selalu dijalankan
 * - garis **putus** = jalur menuju langkah bersyarat; bisa dilewati
 * - lingkaran **berisi** = langkah; **cincin kosong** = batas proses (awal/akhir)
 *
 * Warna bukan satu-satunya sinyal: langkah tanpa pemegang role membawa ikon dan
 * teks, dan tiap langkah punya `aria-label` berisi seluruh isinya.
 */
export function WorkflowPipeline({
  steps, selectedStepId, onSelectStep, holdersByRole, locked = false, transactionType,
}: WorkflowPipelineProps) {
  const subject = subjectOf(transactionType);

  if (steps.length === 0) {
    return (
      <p className="text-body-sm text-neutral-500">
        No steps yet. {locked ? 'Create a new version to add steps.' : 'Add the first step to define who approves.'}
      </p>
    );
  }

  return (
    <ol data-slot="workflow-pipeline" className="space-y-0">
      <AnchorRow label={`${subject} submitted`} position="start" />

      {steps.map((step) => {
        const holders = holdersByRole[step.approverRoleCode] ?? 0;
        const missing = holders === 0;
        const selected = selectedStepId === step.id;
        const gated = Boolean(step.conditionField);

        return (
          <Fragment key={step.id}>
            {/* Gerbang: jalur menuju langkah bersyarat digambar putus. */}
            <ConnectorRow
              gated={gated}
              condition={
                gated
                  ? `${CONDITION_FIELD_LABELS[step.conditionField!] ?? step.conditionField} ${opLabel(step.conditionOp)} ${formatIdr(step.conditionValue ?? 0)}`
                  : null
              }
            />

            <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
              <SpineCell>
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex h-6 w-6 items-center justify-center rounded-full font-mono text-caption',
                    missing ? 'bg-destructive-100 text-destructive-700' : 'bg-neutral-100 text-neutral-700',
                    selected && !missing && 'bg-neutral-800 text-white',
                  )}
                >
                  {step.stepOrder}
                </span>
              </SpineCell>

              <button
                type="button"
                onClick={() => onSelectStep?.(step.id)}
                aria-pressed={selected}
                aria-label={`Step ${step.stepOrder}: ${step.name}, approver ${labelRole(step.approverRoleCode)}, ${holders} holder${holders === 1 ? '' : 's'}${missing ? ', no approver assigned' : ''}`}
                className={cn(
                  // Baris, bukan kartu: tanpa border, tanpa shadow. Penanda terpilih
                  // adalah garis kiri + latar tipis (relative size & position).
                  'min-h-[44px] w-full border-l-2 py-2 pl-3 pr-2 text-left transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  selected
                    ? 'border-neutral-800 bg-neutral-50'
                    : missing
                      ? 'border-destructive-300 hover:bg-neutral-50'
                      : 'border-transparent hover:bg-neutral-50',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('truncate', selected ? 'text-body-sm font-medium text-neutral-900' : 'text-body-sm text-neutral-800')} title={step.name}>
                    {step.name}
                  </span>
                  {locked && <Lock className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />}
                </span>

                {/* Pasangan rapat: role ↔ jumlah pemegang (jarak 2px, bukan 8px). */}
                <span className="mt-0.5 block truncate text-caption text-neutral-600" title={labelRole(step.approverRoleCode)}>
                  {labelRole(step.approverRoleCode)}
                </span>
                <span className={cn('flex items-center gap-1 text-caption', missing ? 'text-destructive-700' : 'text-neutral-500')}>
                  {missing ? (
                    <>
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      No approver — the chain will stall
                    </>
                  ) : (
                    `${holders} holder${holders === 1 ? '' : 's'}`
                  )}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}

      <ConnectorRow gated={false} condition={null} />
      <AnchorRow label={`${subject} approved`} position="end" />
    </ol>
  );
}

/** Kolom penanda: menampung garis sumbu + node, selalu di lebar yang sama. */
function SpineCell({ children, dashed = false }: { children?: React.ReactNode; dashed?: boolean }) {
  return (
    <span className="relative flex justify-center">
      <span
        aria-hidden="true"
        data-slot={dashed ? 'spine-dashed' : 'spine-solid'}
        className={cn(
          'absolute inset-y-0',
          dashed ? 'border-l border-dashed border-neutral-300' : 'w-px bg-neutral-200',
        )}
      />
      {children}
    </span>
  );
}

/** Segmen antar langkah. Putus = bersyarat; solid = selalu. */
function ConnectorRow({ gated, condition }: { gated: boolean; condition: string | null }) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
      <SpineCell dashed={gated} />
      <span className="flex min-h-[24px] items-center py-1 text-caption text-neutral-500">
        {condition && <>only when {condition}</>}
      </span>
    </li>
  );
}

/** Batas proses: pemicu di atas, hasil di bawah. Netral — hasil belum terjadi. */
function AnchorRow({ label, position }: { label: string; position: 'start' | 'end' }) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
      <SpineCell>
        <span
          aria-hidden="true"
          data-slot={`anchor-${position}`}
          className="relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full border border-neutral-300 bg-white"
        />
      </SpineCell>
      <span className="py-1 text-caption text-neutral-500">{label}</span>
    </li>
  );
}
