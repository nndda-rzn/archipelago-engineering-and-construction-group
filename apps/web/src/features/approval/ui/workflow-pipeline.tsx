import { Fragment } from 'react';
import { AvatarStack, PersonAvatar, cn, labelRole } from '@aec/ui';
import { AlertTriangle, Lock } from 'lucide-react';
import type { WorkflowStep } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CONDITION_FIELD_LABELS, opLabel } from './workflow-labels';

export interface WorkflowPipelineProps {
  steps: WorkflowStep[];
  /** Id langkah yang sedang dipilih (panel editor). */
  selectedStepId?: string;
  onSelectStep?: (stepId: string) => void;
  /** Jumlah pemegang role per kode role. 0 berarti rantai akan macet. */
  holdersByRole: Record<string, number>;
  /** Nama pemegang per kode role, untuk menampilkan orangnya, bukan angkanya. */
  holderNamesByRole: Record<string, string[]>;
  /** Struktur terkunci (bukan DRAFT), hanya melihat tanpa mengubah. */
  locked?: boolean;
  /** Jenis transaksi dokumen, dipakai untuk label pemicu dan hasil. */
  transactionType: string;
  /**
   * Hasil simulasi: `null` berarti belum disimulasikan (semua langkah tampil
   * normal). Array stepOrder yang berlaku membuat langkah lain diredupkan,
   * sehingga rantai itu sendiri yang menunjukkan jalur yang dilewati.
   */
  activeStepOrders?: number[] | null;
}

/** Nama dokumen manusiawi untuk anchor awal dan akhir rantai. */
function subjectOf(transactionType: string): string {
  return transactionType === 'PurchaseOrder' ? 'Purchase order' : 'Purchase requisition';
}

/**
 * Rantai approval sebagai alur vertikal, bukan deretan kartu.
 *
 * Vertikal karena tiga node selebar 224px plus dua konektor 40px membutuhkan
 * sekitar 752px, sedangkan panel kanan pada lebar `lg` hanya sekitar 656px.
 * Alur horizontal selalu pecah dan sambungan panahnya hilang.
 *
 * Tanpa border dan tanpa shadow (prinsip proximity): pengelompokan dibawa oleh
 * jarak dan garis sumbu, bukan kotak.
 *
 * Setiap elemen visual membawa arti:
 * - garis solid berarti langkah ini selalu dijalankan
 * - garis putus berarti jalur menuju langkah bersyarat, bisa dilewati
 * - lingkaran berisi berarti langkah, cincin kosong berarti batas proses
 * - avatar berarti orang yang memegang role, bukan sekadar jumlahnya
 *
 * Warna bukan satu-satunya sinyal: langkah tanpa pemegang membawa ikon dan teks,
 * langkah yang dilewati diredupkan, dan tiap langkah punya `aria-label` lengkap.
 */
export function WorkflowPipeline({
  steps, selectedStepId, onSelectStep, holdersByRole, holderNamesByRole, locked = false,
  transactionType, activeStepOrders = null,
}: WorkflowPipelineProps) {
  const subject = subjectOf(transactionType);
  const simulating = activeStepOrders != null;

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
        const names = holderNamesByRole[step.approverRoleCode] ?? [];
        const missing = holders === 0;
        const selected = selectedStepId === step.id;
        const gated = Boolean(step.conditionField);
        const applies = !simulating || activeStepOrders!.includes(step.stepOrder);

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
                  data-slot="step-marker"
                  data-skipped={simulating && !applies ? 'true' : undefined}
                  className={cn(
                    'relative z-10 flex h-6 w-6 items-center justify-center rounded-full font-mono text-caption',
                    missing ? 'bg-destructive-100 text-destructive-700' : 'bg-neutral-100 text-neutral-700',
                    selected && !missing && 'bg-neutral-800 text-white',
                    simulating && !applies && 'bg-white text-neutral-400 ring-1 ring-neutral-300',
                  )}
                >
                  {step.stepOrder}
                </span>
              </SpineCell>

              <button
                type="button"
                onClick={() => onSelectStep?.(step.id)}
                aria-pressed={selected}
                aria-label={`Step ${step.stepOrder}: ${step.name}, approver ${labelRole(step.approverRoleCode)}, ${holders} holder${holders === 1 ? '' : 's'}${missing ? ', no approver assigned' : ''}${simulating && !applies ? ', skipped for this amount' : ''}`}
                className={cn(
                  // Baris, bukan kartu: tanpa border dan tanpa shadow. Penanda
                  // terpilih adalah garis kiri plus latar tipis.
                  'min-h-[44px] w-full border-l-2 py-2 pl-3 pr-2 text-left transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  selected
                    ? 'border-neutral-800 bg-neutral-50'
                    : missing
                      ? 'border-destructive-300 hover:bg-neutral-50'
                      : 'border-transparent hover:bg-neutral-50',
                  // Langkah yang dilewati diredupkan: jalur terlihat, aksi tidak.
                  simulating && !applies && 'opacity-45',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('truncate', selected ? 'text-body-sm font-medium text-neutral-900' : 'text-body-sm text-neutral-800')} title={step.name}>
                    {step.name}
                  </span>
                  {locked && <Lock className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />}
                </span>

                {/* Pasangan rapat: role lalu orangnya (jarak 2px, bukan 8px). */}
                <span className="mt-0.5 block truncate text-caption text-neutral-600" title={labelRole(step.approverRoleCode)}>
                  {labelRole(step.approverRoleCode)}
                </span>
                <span className={cn('flex items-center gap-1.5 text-caption', missing ? 'text-destructive-700' : 'text-neutral-600')}>
                  {missing ? (
                    <>
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      No approver, so the chain will stall
                    </>
                  ) : (
                    <>
                      <AvatarStack names={names} size="sm" />
                      <span className="truncate">{summarise(names)}</span>
                    </>
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

/**
 * Satu nama ditulis utuh; beberapa nama diringkas menjadi jumlah, karena
 * menyebut satu nama akan menyesatkan (siapa pun di antaranya bisa memutus).
 */
function summarise(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  return `${names.length} people`;
}

/** Kolom penanda: menampung garis sumbu dan node pada lebar yang sama. */
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

/** Segmen antar langkah. Putus berarti bersyarat, solid berarti selalu. */
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

/** Batas proses: pemicu di atas, hasil di bawah. Netral, hasil belum terjadi. */
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

export { PersonAvatar };
